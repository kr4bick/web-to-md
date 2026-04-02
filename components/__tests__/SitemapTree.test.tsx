import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SitemapTree from '../SitemapTree'
import type { PageResult } from '@/lib/types'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

// Mock MarkdownModal to keep tests focused on SitemapTree
vi.mock('../MarkdownModal', () => ({
  default: ({ filename, onClose }: { filename: string; onClose: () => void }) => (
    <div data-testid="markdown-modal">
      <span>{filename}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))

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

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SitemapTree', () => {
  it('renders empty state when pages array is empty', () => {
    render(<SitemapTree pages={[]} jobId="job-1" />)
    expect(screen.getByText(/no pages/i)).toBeInTheDocument()
  })

  it('renders a root page with status success: shows ✓ icon', () => {
    render(<SitemapTree pages={[makePage({ status: 'success' })]} jobId="job-1" />)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('renders a failed page: shows ✗ icon', () => {
    render(<SitemapTree pages={[makePage({ status: 'error' })]} jobId="job-1" />)
    expect(screen.getByText('✗')).toBeInTheDocument()
  })

  it('renders a timeout page: shows ⏱ icon', () => {
    render(<SitemapTree pages={[makePage({ status: 'timeout' })]} jobId="job-1" />)
    expect(screen.getByText('⏱')).toBeInTheDocument()
  })

  it('renders a skipped page: shows — icon', () => {
    render(<SitemapTree pages={[makePage({ status: 'skipped' })]} jobId="job-1" />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('each entry is a link to the original URL with target="_blank"', () => {
    const page = makePage({ url: 'https://example.com/about', title: 'About' })
    render(<SitemapTree pages={[page]} jobId="job-1" />)
    const link = screen.getByRole('link', { name: /about/i })
    expect(link).toHaveAttribute('href', 'https://example.com/about')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('uses summary as label when available', () => {
    const page = makePage({ title: 'Raw Title', summary: 'AI-generated summary' })
    render(<SitemapTree pages={[page]} jobId="job-1" />)
    expect(screen.getByRole('link', { name: /ai-generated summary/i })).toBeInTheDocument()
  })

  it('falls back to title when summary is absent', () => {
    const page = makePage({ title: 'Page Title', summary: undefined })
    render(<SitemapTree pages={[page]} jobId="job-1" />)
    expect(screen.getByRole('link', { name: /page title/i })).toBeInTheDocument()
  })

  it('uses URL path as label when title and summary are null', () => {
    const page = makePage({ url: 'https://example.com/docs', title: null, summary: undefined })
    render(<SitemapTree pages={[page]} jobId="job-1" />)
    expect(screen.getByRole('link', { name: /\/docs/i })).toBeInTheDocument()
  })

  it('child page (parentUrl set) is nested under parent', () => {
    const parent = makePage({ url: 'https://example.com/', title: 'Home', depth: 0, parentUrl: null })
    const child = makePage({ url: 'https://example.com/about', title: 'About', depth: 1, parentUrl: 'https://example.com/' })
    render(<SitemapTree pages={[parent, child]} jobId="job-1" />)
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument()
  })

  it('renders multiple root pages', () => {
    const pages = [
      makePage({ url: 'https://example.com/a', title: 'Page A' }),
      makePage({ url: 'https://example.com/b', title: 'Page B' }),
    ]
    render(<SitemapTree pages={pages} jobId="job-1" />)
    expect(screen.getByRole('link', { name: /page a/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /page b/i })).toBeInTheDocument()
  })

  it('copy and open buttons are not visible for error pages', () => {
    render(<SitemapTree pages={[makePage({ status: 'error' })]} jobId="job-1" />)
    expect(screen.queryByRole('button', { name: /copy markdown/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /open markdown/i })).not.toBeInTheDocument()
  })

  it('open button shows MarkdownModal with correct filename', async () => {
    const user = userEvent.setup()
    render(<SitemapTree pages={[makePage({ filename: 'page-001.md' })]} jobId="job-42" />)

    await user.click(screen.getByRole('button', { name: /open markdown/i }))

    await waitFor(() => {
      expect(screen.getByTestId('markdown-modal')).toBeInTheDocument()
      expect(screen.getByText('page-001.md')).toBeInTheDocument()
    })
  })

  it('copy button calls /api/page-md with the correct job and filename', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => '# Page content',
    } as Response)

    render(<SitemapTree pages={[makePage({ filename: 'page-001.md' })]} jobId="job-42" />)
    await user.click(screen.getByRole('button', { name: /copy markdown/i }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/page-md/job-42/page-001.md')
    })
  })
})
