import path from 'path'
import fs from 'fs'
import archiver from 'archiver'
import { getJob } from '@/lib/db'
import type { JobImage } from '@/lib/types'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const job = getJob(id)

  if (!job) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  if (!job.markdown || job.status !== 'success') {
    return Response.json({ error: 'No content available' }, { status: 400 })
  }

  // Slugify title for filename
  const slug = job.title
    ? job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || `parse-${id}`
    : `parse-${id}`

  // Parse images
  let images: JobImage[] = []
  try {
    images = job.images ? JSON.parse(job.images) : []
  } catch {
    images = []
  }

  const nonSkipped = images.filter(img => !img.skipped && img.filename)

  // Build ZIP using archiver, stream it out
  const archive = archiver('zip', { zlib: { level: 6 } })
  const chunks: Buffer[] = []

  await new Promise<void>((resolve, reject) => {
    archive.on('data', (chunk: Buffer) => chunks.push(chunk))
    archive.on('end', resolve)
    archive.on('error', reject)

    // Add markdown
    archive.append(job.markdown!, { name: `${slug}.md` })

    // Add images
    for (const img of nonSkipped) {
      const filePath = path.join(process.cwd(), 'data', 'images', id, img.filename)
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: `images/${img.filename}` })
      }
    }

    archive.finalize()
  })

  const zipBuffer = Buffer.concat(chunks)

  return new Response(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${slug}.zip"`,
      'Content-Length': String(zipBuffer.length),
    },
  })
}
