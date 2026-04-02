import { JSDOM } from 'jsdom'

// File extensions to skip
const SKIP_EXTENSIONS = /\.(pdf|doc|docx|zip|tar|gz|png|jpg|jpeg|gif|webp|svg|avif|ico|mp4|mp3|avi|mov|csv|xls|xlsx|ppt|pptx)$/i

// URL path fragments to skip (logout/auth actions)
const SKIP_PATHS = /\/(logout|log-out|sign-out|signout|delete-account|unsubscribe|deactivate)(\/|$|\?)/i

export function extractLinks(
  html: string,
  baseUrl: string,
  sameDomain: 'hostname' | 'origin'
): string[] {
  const dom = new JSDOM(html, { url: baseUrl })
  const base = new URL(baseUrl)
  const seen = new Set<string>()
  const results: string[] = []

  const anchors = Array.from(dom.window.document.querySelectorAll('a[href]'))

  for (const anchor of anchors) {
    const href = anchor.getAttribute('href')?.trim()
    if (!href) continue

    // Skip non-http protocols
    if (/^(mailto:|tel:|javascript:|#)/i.test(href)) continue

    let resolved: URL
    try {
      resolved = new URL(href, baseUrl)
    } catch {
      continue
    }

    // Only http/https
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') continue

    // Same domain check
    if (sameDomain === 'hostname' && resolved.hostname !== base.hostname) continue
    if (sameDomain === 'origin' && resolved.origin !== base.origin) continue

    // Skip file extensions
    if (SKIP_EXTENSIONS.test(resolved.pathname)) continue

    // Skip auth/logout paths
    if (SKIP_PATHS.test(resolved.pathname)) continue

    // Normalize: remove hash, normalize trailing slash
    resolved.hash = ''
    const normalized = normalizeUrl(resolved)

    if (!seen.has(normalized)) {
      seen.add(normalized)
      results.push(normalized)
    }
  }

  return results
}

function normalizeUrl(url: URL): string {
  // Remove trailing slash from path (except root)
  let pathname = url.pathname
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1)
  }
  return `${url.origin}${pathname}${url.search}`
}
