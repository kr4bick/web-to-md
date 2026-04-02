import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ResultView from '../ResultView'
import type { ParseJob } from '@/lib/types'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

function makeJob(overrides: Partial<ParseJob> = {}): ParseJob {
  return {
    id: 'job-1',
    url: 'https://example.com',
    final_url: 'https://example.com',
    title: 'Example',
    status: 'success',
    mode: 'simple',
    markdown: null,
    error: null,
    images: null,
    pages: null,
    summary: null,
    page_count: 0,
    image_count: 0,
    created_at: Date.now(),
    ...overrides,
  }
}

describe('ResultView', () => {
  it('shows error message when status is error and error is set', () => {
    render(<ResultView job={makeJob({ status: 'error', error: 'Something failed' })} />)
    expect(screen.getByText('Something failed')).toBeInTheDocument()
  })

  it('falls back to "Parse failed." when status is error but no error message', () => {
    render(<ResultView job={makeJob({ status: 'error', error: null })} />)
    expect(screen.getByText('Parse failed.')).toBeInTheDocument()
  })

  it('shows summary text when provided', () => {
    render(<ResultView job={makeJob({ summary: 'Parsed 2 pages' })} />)
    expect(screen.getByText('Parsed 2 pages')).toBeInTheDocument()
  })

  it('shows pages parsed count from pages JSON', () => {
    const pages = JSON.stringify([
      {
        url: 'https://example.com/page1',
        finalUrl: 'https://example.com/page1',
        title: 'Page 1',
        depth: 0,
        parentUrl: null,
        status: 'success',
        filename: 'page-001.md',
        images: [],
      },
      {
        url: 'https://example.com/page2',
        finalUrl: 'https://example.com/page2',
        title: 'Page 2',
        depth: 0,
        parentUrl: null,
        status: 'success',
        filename: 'page-002.md',
        images: [],
      },
    ])
    render(<ResultView job={makeJob({ pages })} />)
    // "2 pages parsed" is rendered as <span>2</span> pages parsed inside a <span>
    expect(screen.getByText(/pages parsed/)).toBeInTheDocument()
    expect(screen.getByText(/pages parsed/).closest('span')).toHaveTextContent('2 pages parsed')
  })

  it('shows "Download ZIP" link with correct href', () => {
    render(<ResultView job={makeJob({ id: 'my-job-id' })} />)
    const link = screen.getByRole('link', { name: /download zip/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/api/download/my-job-id/zip')
  })

  it('shows the job URL as a link', () => {
    render(<ResultView job={makeJob({ url: 'https://example.com/target' })} />)
    const link = screen.getByRole('link', { name: 'https://example.com/target' })
    expect(link).toHaveAttribute('href', 'https://example.com/target')
  })
})
