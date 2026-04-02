import path from 'path'
import fs from 'fs'
import archiver from 'archiver'
import { getJob } from '@/lib/db'
import type { PageResult, SitemapNode } from '@/lib/types'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const job = getJob(id)

  if (!job) return Response.json({ error: 'Not found' }, { status: 404 })
  if (job.status !== 'success' && job.status !== 'partial') {
    return Response.json({ error: 'Job not completed' }, { status: 400 })
  }

  let pages: PageResult[] = []
  try { pages = job.pages ? JSON.parse(job.pages) : [] } catch {}

  const successPages = pages.filter(p => p.status === 'success')
  if (successPages.length === 0) {
    return Response.json({ error: 'No pages available' }, { status: 400 })
  }

  const slug = job.title
    ? job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || `job-${id}`
    : `job-${id}`

  const archive = archiver('zip', { zlib: { level: 6 } })
  const chunks: Buffer[] = []

  await new Promise<void>((resolve, reject) => {
    archive.on('data', (chunk: Buffer) => chunks.push(chunk))
    archive.on('end', resolve)
    archive.on('error', reject)

    // manifest.json
    const manifest = {
      jobId: id,
      startUrl: job.url,
      title: job.title,
      parsedAt: new Date(job.created_at).toISOString(),
      status: job.status,
      pageCount: successPages.length,
      imageCount: job.image_count,
      pages: successPages.map(p => ({
        file: `pages/${p.filename}`,
        url: p.finalUrl,
        title: p.title,
        depth: p.depth,
        status: p.status,
      })),
    }
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' })

    // sitemap.json
    const sitemap = buildSitemapTree(pages, job.url)
    archive.append(JSON.stringify(sitemap, null, 2), { name: 'sitemap.json' })

    // pages/
    const pagesDir = path.join(process.cwd(), 'data', 'pages', id)
    for (const page of successPages) {
      const filePath = path.join(pagesDir, page.filename)
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: `pages/${page.filename}` })
      }
    }

    // images/
    const imagesDir = path.join(process.cwd(), 'data', 'images', id)
    const allImages = pages.flatMap(p => p.images.filter(i => !i.skipped && i.filename))
    for (const img of allImages) {
      const filePath = path.join(imagesDir, img.filename)
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

function buildSitemapTree(pages: PageResult[], rootUrl: string): SitemapNode {
  function buildNode(url: string, visited = new Set<string>()): SitemapNode {
    if (visited.has(url)) return { url, title: null, depth: 0, status: 'skipped', filename: null, children: [] }
    visited.add(url)

    const page = pages.find(p => p.url === url || p.finalUrl === url)
    const children = pages
      .filter(p => p.parentUrl === url || (page && p.parentUrl === page.finalUrl))
      .map(p => buildNode(p.url, visited))

    return {
      url: page?.finalUrl ?? url,
      title: page?.title ?? null,
      depth: page?.depth ?? 0,
      status: page?.status ?? 'skipped',
      filename: page?.filename ?? null,
      children,
    }
  }

  return buildNode(rootUrl)
}
