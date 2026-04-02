import { z } from 'zod'
import { createJob, updateJob, getJob } from '@/lib/db'
import { scrape } from '@/lib/scraper'
import { convertToMarkdown } from '@/lib/converter'
import { downloadImages } from '@/lib/images'
import type { JobImage } from '@/lib/types'

const schema = z.object({
  url: z.string().url(),
  mode: z.enum(['simple', 'auth', 'interactive']).default('simple'),
  cookies: z.string().max(10_000).optional(),
  storageState: z.string().max(50_000).optional(),
  waitSelector: z.string().max(200).optional(),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    const error = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    return Response.json({ error }, { status: 400 })
  }

  const { url, mode, cookies, storageState, waitSelector } = result.data

  if (storageState !== undefined) {
    try {
      JSON.parse(storageState)
    } catch {
      return Response.json(
        { error: 'storageState must be valid JSON' },
        { status: 400 }
      )
    }
  }

  const id = crypto.randomUUID()
  createJob({ id, url, mode })

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Parse job timed out after 60s')), 60_000)
    )

    const scrapeResult = await Promise.race([
      scrape({ url, mode, cookies, storageState, waitSelector }),
      timeoutPromise,
    ])

    // Download images in parallel (errors don't fail the job)
    let urlToLocal = new Map<string, string>()
    let jobImages: JobImage[] = []
    try {
      const imgResult = await downloadImages(scrapeResult.html, id, scrapeResult.finalUrl)
      urlToLocal = imgResult.urlToLocal
      jobImages = imgResult.images
    } catch {
      // image download failure doesn't fail the job
    }

    const markdown = convertToMarkdown(scrapeResult.html, scrapeResult.finalUrl, urlToLocal)

    updateJob(id, {
      status: 'success',
      final_url: scrapeResult.finalUrl,
      title: scrapeResult.title,
      markdown,
      images: JSON.stringify(jobImages),
    })

    const job = getJob(id)
    return Response.json(job, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    updateJob(id, { status: 'error', error: message })
    const job = getJob(id)
    return Response.json({ error: message, job }, { status: 500 })
  }
}
