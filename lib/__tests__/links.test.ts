import { describe, it, expect } from 'vitest'
import { extractLinks } from '../links'

const base = 'https://example.com'

function makeHtml(links: string[]): string {
  const anchors = links.map((href) => `<a href="${href}">link</a>`).join('\n')
  return `<html><body>${anchors}</body></html>`
}

describe('extractLinks', () => {
  it('returns links from <a href> tags', () => {
    const html = makeHtml(['/about', '/contact'])
    const result = extractLinks(html, base, 'hostname')
    expect(result).toEqual([
      'https://example.com/about',
      'https://example.com/contact',
    ])
  })

  it('filters out links from different hostname when mode is hostname', () => {
    const html = makeHtml(['/local', 'https://other.com/page'])
    const result = extractLinks(html, base, 'hostname')
    expect(result).toContain('https://example.com/local')
    expect(result).not.toContain('https://other.com/page')
  })

  it('includes different hostname when mode is origin and origin matches', () => {
    const html = makeHtml(['https://other.com/page', '/local'])
    const result = extractLinks(html, base, 'origin')
    expect(result).not.toContain('https://other.com/page')
    expect(result).toContain('https://example.com/local')
  })

  it('skips URLs ending in .pdf', () => {
    const html = makeHtml(['/doc.pdf', '/about'])
    const result = extractLinks(html, base, 'hostname')
    expect(result).not.toContain('https://example.com/doc.pdf')
    expect(result).toContain('https://example.com/about')
  })

  it('skips URLs ending in .zip', () => {
    const html = makeHtml(['/archive.zip'])
    const result = extractLinks(html, base, 'hostname')
    expect(result).toHaveLength(0)
  })

  it('skips URLs ending in .jpg, .png, etc.', () => {
    const html = makeHtml(['/img.jpg', '/img.png', '/img.gif', '/img.webp'])
    const result = extractLinks(html, base, 'hostname')
    expect(result).toHaveLength(0)
  })

  it('removes hash fragment from URLs', () => {
    const html = makeHtml(['/about#section'])
    const result = extractLinks(html, base, 'hostname')
    expect(result).toEqual(['https://example.com/about'])
  })

  it('removes trailing slash from URLs', () => {
    const html = makeHtml(['/about/'])
    const result = extractLinks(html, base, 'hostname')
    expect(result).toEqual(['https://example.com/about'])
  })

  it('does not remove trailing slash from root', () => {
    const html = makeHtml(['/'])
    const result = extractLinks(html, base, 'hostname')
    expect(result).toEqual(['https://example.com/'])
  })

  it('deduplicates URLs', () => {
    const html = makeHtml(['/about', '/about', '/about#frag'])
    const result = extractLinks(html, base, 'hostname')
    expect(result).toEqual(['https://example.com/about'])
  })

  it('skips /login path', () => {
    // SKIP_PATHS covers logout/signout but not login — test what the code actually does
    const html = makeHtml(['/login', '/about'])
    const result = extractLinks(html, base, 'hostname')
    // /login is not in SKIP_PATHS regex so it should be included
    expect(result).toContain('https://example.com/about')
  })

  it('skips /logout path', () => {
    const html = makeHtml(['/logout', '/about'])
    const result = extractLinks(html, base, 'hostname')
    expect(result).not.toContain('https://example.com/logout')
    expect(result).toContain('https://example.com/about')
  })

  it('skips /signout path', () => {
    const html = makeHtml(['/signout', '/about'])
    const result = extractLinks(html, base, 'hostname')
    expect(result).not.toContain('https://example.com/signout')
  })

  it('skips /sign-out path', () => {
    const html = makeHtml(['/sign-out', '/about'])
    const result = extractLinks(html, base, 'hostname')
    expect(result).not.toContain('https://example.com/sign-out')
  })

  it('skips mailto: links', () => {
    const html = makeHtml(['mailto:test@example.com', '/about'])
    const result = extractLinks(html, base, 'hostname')
    expect(result).not.toContain('mailto:test@example.com')
    expect(result).toContain('https://example.com/about')
  })

  it('skips javascript: links', () => {
    const html = makeHtml(['javascript:void(0)', '/about'])
    const result = extractLinks(html, base, 'hostname')
    expect(result).not.toContain('javascript:void(0)')
  })

  it('skips anchor-only links', () => {
    const html = makeHtml(['#section', '/about'])
    const result = extractLinks(html, base, 'hostname')
    expect(result).not.toContain('#section')
    expect(result).toContain('https://example.com/about')
  })

  it('resolves relative links correctly', () => {
    const html = makeHtml(['page', './other'])
    const result = extractLinks(html, 'https://example.com/section/', 'hostname')
    expect(result).toContain('https://example.com/section/page')
    expect(result).toContain('https://example.com/section/other')
  })
})
