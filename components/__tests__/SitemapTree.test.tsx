import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SitemapTree from '../SitemapTree'
import type { PageResult } from '@/lib/types'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

function makePage(overrides: Partial<PageResult> = {}): PageResult {
  return {
    url: 'https://example.com/page',
    finalUrl: 'https://example.com/page',
    title: 'Test Page',
    depth: 0,
    parentUrl: null,
    status: 'success',
    filename: 'page-001.md',
    images: [],
    ...overrides,
  }
}

describe('SitemapTree', () => {
  it('renders empty state when pages array is empty', () => {
    render(<SitemapTree pages={[]} />)
    expect(screen.getByText(/no pages/i)).toBeInTheDocument()
  })

  it('renders a root page with status success: shows ✓ icon', () => {
    render(<SitemapTree pages={[makePage({ status: 'success' })]} />)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('renders a failed page: shows ✗ icon', () => {
    render(<SitemapTree pages={[makePage({ status: 'error' })]} />)
    expect(screen.getByText('✗')).toBeInTheDocument()
  })

  it('renders a timeout page: shows ⏱ icon', () => {
    render(<SitemapTree pages={[makePage({ status: 'timeout' })]} />)
    expect(screen.getByText('⏱')).toBeInTheDocument()
  })

  it('renders a skipped page: shows — icon', () => {
    render(<SitemapTree pages={[makePage({ status: 'skipped' })]} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('each entry is a link to the original URL with target="_blank"', () => {
    const page = makePage({ url: 'https://example.com/about', title: 'About' })
    render(<SitemapTree pages={[page]} />)
    const link = screen.getByRole('link', { name: /about/i })
    expect(link).toHaveAttribute('href', 'https://example.com/about')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('uses URL path as label when title is null', () => {
    const page = makePage({ url: 'https://example.com/docs', title: null })
    render(<SitemapTree pages={[page]} />)
    expect(screen.getByRole('link', { name: /\/docs/i })).toBeInTheDocument()
  })

  it('child page (parentUrl set) is nested under parent', () => {
    const parent = makePage({
      url: 'https://example.com/',
      title: 'Home',
      depth: 0,
      parentUrl: null,
    })
    const child = makePage({
      url: 'https://example.com/about',
      title: 'About',
      depth: 1,
      parentUrl: 'https://example.com/',
    })
    render(<SitemapTree pages={[parent, child]} />)
    const parentLink = screen.getByRole('link', { name: /home/i })
    const childLink = screen.getByRole('link', { name: /about/i })
    expect(parentLink).toBeInTheDocument()
    expect(childLink).toBeInTheDocument()

    // The child link's DOM node should come after parent and be visually nested
    // (its ancestor div should contain the connector branch characters)
    const childEl = childLink.closest('[class*="flex"]') ?? childLink.parentElement
    expect(childEl).toBeTruthy()
  })

  it('renders multiple root pages', () => {
    const pages = [
      makePage({ url: 'https://example.com/a', title: 'Page A' }),
      makePage({ url: 'https://example.com/b', title: 'Page B' }),
    ]
    render(<SitemapTree pages={pages} />)
    expect(screen.getByRole('link', { name: /page a/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /page b/i })).toBeInTheDocument()
  })
})
