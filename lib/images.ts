import fs from 'fs'
import path from 'path'
import { JSDOM } from 'jsdom'
import type { JobImage, PageImage } from './types'

const MAX_IMAGE_SIZE = 15 * 1024 * 1024
const CONCURRENCY = 5

// ─── Multi-page version ────────────────────────────────────────────────────

export async function downloadImagesForPage(
  html: string,
  jobId: string,
  pageIndex: number,   // 0-based; used for filename prefix "page-001"
  baseUrl: string,
  onProgress?: (asset: string) => void,
): Promise<{ images: PageImage[]; urlToLocal: Map<string, string> }> {
  const urls = extractImageUrls(html, baseUrl)

  const imagesDir = path.join(process.cwd(), 'data', 'images', jobId)
  fs.mkdirSync(imagesDir, { recursive: true })

  const results: PageImage[] = []
  const urlToLocal = new Map<string, string>()
  const pagePrefix = `page-${String(pageIndex + 1).padStart(3, '0')}`

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map((url, batchIdx) => {
        const imgIndex = i + batchIdx
        const filenameBase = `${pagePrefix}-img-${String(imgIndex).padStart(3, '0')}`
        if (onProgress) onProgress(url)
        return downloadOnePageImage(url, filenameBase, imagesDir)
      }),
    )
    for (const r of batchResults) {
      results.push(r)
      if (!r.skipped) {
        urlToLocal.set(r.originalUrl, `images/${r.filename}`)
      }
    }
  }

  return { images: results, urlToLocal }
}

async function downloadOnePageImage(
  url: string,
  filenameBase: string,
  imagesDir: string,
): Promise<PageImage> {
  try {
    const headRes = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) }).catch(() => null)
    if (headRes) {
      const cl = headRes.headers.get('content-length')
      if (cl && parseInt(cl) > MAX_IMAGE_SIZE) {
        return { originalUrl: url, filename: '', skipped: true, skipReason: 'size_exceeded' }
      }
    }
  } catch { /* try download anyway */ }

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok || !res.body) throw new Error('Bad response')

    const chunks: Uint8Array[] = []
    let totalSize = 0
    const reader = res.body.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalSize += value.length
      if (totalSize > MAX_IMAGE_SIZE) {
        await reader.cancel()
        return { originalUrl: url, filename: '', skipped: true, skipReason: 'size_exceeded' }
      }
      chunks.push(value)
    }

    const ext = getExtension(res.headers.get('content-type') ?? '', url)
    const filename = `${filenameBase}${ext}`
    fs.writeFileSync(path.join(imagesDir, filename), Buffer.concat(chunks))

    return { originalUrl: url, filename, skipped: false }
  } catch {
    return { originalUrl: url, filename: '', skipped: true, skipReason: 'fetch_error' }
  }
}

// ─── Single-page legacy version ────────────────────────────────────────────

export async function downloadImages(
  html: string,
  jobId: string,
  baseUrl: string,
): Promise<{ images: JobImage[]; urlToLocal: Map<string, string> }> {
  const urls = extractImageUrls(html, baseUrl)
  const imagesDir = path.join(process.cwd(), 'data', 'images', jobId)
  fs.mkdirSync(imagesDir, { recursive: true })

  const results: JobImage[] = []
  const urlToLocal = new Map<string, string>()

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map((url, batchIdx) => downloadOneLegacy(url, i + batchIdx, imagesDir, jobId)),
    )
    for (const r of batchResults) {
      results.push(r)
      if (!r.skipped) urlToLocal.set(r.originalUrl, `images/${jobId}/${r.filename}`)
    }
  }

  return { images: results, urlToLocal }
}

async function downloadOneLegacy(url: string, index: number, imagesDir: string, jobId: string): Promise<JobImage> {
  try {
    const headRes = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) }).catch(() => null)
    if (headRes) {
      const cl = headRes.headers.get('content-length')
      if (cl && parseInt(cl) > MAX_IMAGE_SIZE) return { originalUrl: url, filename: '', skipped: true, skipReason: 'size_exceeded' }
    }
  } catch {}

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok || !res.body) throw new Error('Bad response')

    const chunks: Uint8Array[] = []
    let totalSize = 0
    const reader = res.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalSize += value.length
      if (totalSize > MAX_IMAGE_SIZE) { await reader.cancel(); return { originalUrl: url, filename: '', skipped: true, skipReason: 'size_exceeded' } }
      chunks.push(value)
    }

    const ext = getExtension(res.headers.get('content-type') ?? '', url)
    const filename = `${index}${ext}`
    fs.writeFileSync(path.join(imagesDir, filename), Buffer.concat(chunks))
    return { originalUrl: url, filename, skipped: false }
  } catch {
    return { originalUrl: url, filename: '', skipped: true, skipReason: 'fetch_error' }
  }
}

// ─── Shared helpers ────────────────────────────────────────────────────────

function extractImageUrls(html: string, baseUrl: string): string[] {
  const dom = new JSDOM(html, { url: baseUrl })
  const imgs = Array.from(dom.window.document.querySelectorAll('img[src]'))
  return [...new Set(
    imgs
      .map(el => el.getAttribute('src')!)
      .filter(Boolean)
      .map(src => { try { return new URL(src, baseUrl).href } catch { return null } })
      .filter((u): u is string => u !== null && (u.startsWith('http://') || u.startsWith('https://'))),
  )]
}

function getExtension(contentType: string, url: string): string {
  const mimeMap: Record<string, string> = {
    'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png',
    'image/gif': '.gif', 'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/avif': '.avif',
  }
  const mime = contentType.split(';')[0].trim().toLowerCase()
  if (mimeMap[mime]) return mimeMap[mime]
  const match = new URL(url).pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i)
  if (match) return '.' + match[1].toLowerCase()
  return '.jpg'
}
