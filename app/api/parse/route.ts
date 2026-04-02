import { z } from 'zod'
import { createJob, updateJob } from '@/lib/db'
import { crawl } from '@/lib/crawler'
import { initProgress, setProgress, deleteProgress } from '@/lib/progress'
import type { CrawlParams, ParseMode } from '@/lib/types'

const schema = z.object({
  url: z.string().url(),
  mode: z.enum(['simple', 'advance', 'auth', 'interactive']).default('simple'),
  cookies: z.string().max(10_000).optional(),
  storageState: z.string().max(50_000).optional(),
  waitSelector: z.string().max(200).optional(),
  multiPage: z.boolean().default(false),
  depth: z.number().int().min(0).max(5).default(1),
  maxPages: z.number().int().min(1).max(50).default(10),
  concurrency: z.number().int().min(1).max(5).default(3),
  sameDomain: z.enum(['hostname', 'origin']).default('hostname'),
  aiEnabled: z.boolean().default(false),
  aiPrompt: z.string().max(2000).optional(),
  aiProvider: z.enum(['gemini']).default('gemini'),
  aiTimeoutSecs: z.number().int().min(10).max(300).default(60),
  aiConcurrency: z.number().int().min(1).max(5).default(2),
})

function normalizeParseMode(mode: z.infer<typeof schema>['mode']): ParseMode {
  return mode === 'simple' ? 'simple' : 'advance'
}

export async function POST(request: Request) {
  let body: unknown
  try { body = await request.json() }
  catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const error = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    return Response.json({ error }, { status: 400 })
  }

  const { url, mode: requestedMode, cookies, storageState, waitSelector, multiPage, depth, maxPages, concurrency, sameDomain,
          aiEnabled, aiPrompt, aiProvider, aiTimeoutSecs, aiConcurrency } = parsed.data
  const mode = normalizeParseMode(requestedMode)

  if (storageState) {
    try { JSON.parse(storageState) }
    catch { return Response.json({ error: 'storageState must be valid JSON' }, { status: 400 }) }
  }

  if (aiEnabled && !aiPrompt?.trim()) {
    return Response.json({ error: 'aiPrompt is required when AI post-processing is enabled' }, { status: 400 })
  }

  const id = crypto.randomUUID()
  createJob({ id, url, mode })
  updateJob(id, {
    status: 'running',
    ...(aiEnabled && aiPrompt ? { ai_prompt: aiPrompt, ai_provider: aiProvider } : {}),
  })
  initProgress(id)

  const crawlParams: CrawlParams = {
    url, mode, cookies, storageState, waitSelector,
    multiPage, depth: multiPage ? depth : 0,
    maxPages: multiPage ? maxPages : 1,
    concurrency: multiPage ? concurrency : 1,
    sameDomain,
    aiEnabled,
    aiPrompt: aiEnabled ? aiPrompt : undefined,
    aiProvider,
    aiTimeoutMs: aiTimeoutSecs * 1000,
    aiConcurrency,
  }

  // Fire-and-forget: runs in background after response is sent
  // Works on Railway (persistent Node.js server), not on serverless
  void runCrawl(id, crawlParams)

  return Response.json({ jobId: id, status: 'running' }, { status: 202 })
}

async function runCrawl(id: string, params: CrawlParams): Promise<void> {
  try {
    const result = await crawl(params, id)

    const successPages = result.pages.filter(p => p.status === 'success')
    const imageCount = result.pages.reduce((sum, p) => sum + p.images.filter(i => !i.skipped).length, 0)

    updateJob(id, {
      status: result.status,
      final_url: result.finalUrl ?? undefined,
      title: result.title ?? undefined,
      pages: JSON.stringify(result.pages),
      summary: result.summary,
      page_count: successPages.length,
      image_count: imageCount,
    })
    setProgress(id, { phase: 'done' })
    deleteProgress(id)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    updateJob(id, { status: 'error', error: message })
    setProgress(id, { phase: 'done' })
    deleteProgress(id)
  }
}
