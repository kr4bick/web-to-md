import fs from 'fs'
import path from 'path'
import { JSDOM } from 'jsdom'
import type { JobImage } from './types'

const MAX_IMAGE_SIZE = 15 * 1024 * 1024  // 15MB
const CONCURRENCY = 5

export async function downloadImages(
  html: string,
  jobId: string,
  baseUrl: string
): Promise<{ images: JobImage[]; urlToLocal: Map<string, string> }> {
  const dom = new JSDOM(html, { url: baseUrl })
  const imgElements = Array.from(dom.window.document.querySelectorAll('img[src]'))
  const rawUrls = imgElements.map(el => el.getAttribute('src')!).filter(Boolean)

  const absoluteUrls = [...new Set(
    rawUrls
      .map(src => { try { return new URL(src, baseUrl).href } catch { return null } })
      .filter((u): u is string => u !== null && (u.startsWith('http://') || u.startsWith('https://')))
  )]

  const imagesDir = path.join(process.cwd(), 'data', 'images', jobId)
  fs.mkdirSync(imagesDir, { recursive: true })

  const results: JobImage[] = []
  const urlToLocal = new Map<string, string>()

  for (let i = 0; i < absoluteUrls.length; i += CONCURRENCY) {
    const batch = absoluteUrls.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(batch.map((url, batchIdx) =>
      downloadOne(url, i + batchIdx, imagesDir, jobId)
    ))
    for (const r of batchResults) {
      results.push(r)
      if (!r.skipped) {
        urlToLocal.set(r.originalUrl, `images/${jobId}/${r.filename}`)
      }
    }
  }

  return { images: results, urlToLocal }
}

async function downloadOne(url: string, index: number, imagesDir: string, jobId: string): Promise<JobImage> {
  // Step 1: HEAD request to check size (5s timeout)
  try {
    const headRes = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    })
    const contentLength = headRes.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_IMAGE_SIZE) {
      return { originalUrl: url, filename: '', skipped: true, skipReason: 'size_exceeded' }
    }
  } catch {
    // HEAD failed — try downloading anyway
  }

  // Step 2: GET request (15s timeout)
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok || !res.body) throw new Error('Bad response')

    // Read with size check
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

    // Determine extension from Content-Type or URL
    const contentType = res.headers.get('content-type') ?? ''
    const ext = getExtension(contentType, url)
    const filename = `${index}${ext}`

    const buffer = Buffer.concat(chunks)
    fs.writeFileSync(path.join(imagesDir, filename), buffer)

    return { originalUrl: url, filename, skipped: false }
  } catch {
    return { originalUrl: url, filename: '', skipped: true, skipReason: 'fetch_error' }
  }
}

function getExtension(contentType: string, url: string): string {
  const mimeMap: Record<string, string> = {
    'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png',
    'image/gif': '.gif', 'image/webp': '.webp', 'image/svg+xml': '.svg',
    'image/avif': '.avif',
  }
  const mime = contentType.split(';')[0].trim().toLowerCase()
  if (mimeMap[mime]) return mimeMap[mime]

  // Try from URL
  const urlPath = new URL(url).pathname
  const match = urlPath.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i)
  if (match) return '.' + match[1].toLowerCase()

  return '.jpg'  // fallback
}
