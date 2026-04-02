import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import HistoryList from '../HistoryList'
import type { ParseJobSummary } from '@/lib/types'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

// next/link needs to render as a normal anchor in tests
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

function makeJob(overrides: Partial<ParseJobSummary> = {}): ParseJobSummary {
  return {
    id: 'job-1',
    url: 'https://example.com',
    final_url: 'https://example.com',
    title: 'Example',
    status: 'success',
    mode: 'simple',
    error: null,
    summary: null,
    page_count: 1,
    image_count: 0,
    created_at: Date.now(),
    ...overrides,
  }
}

describe('HistoryList', () => {
  it('shows "No history yet." when jobs array is empty', () => {
    render(<HistoryList jobs={[]} />)
    expect(screen.getByText(/no history yet/i)).toBeInTheDocument()
  })

  it('renders a row per job with URL', () => {
    const jobs = [
      makeJob({ id: 'job-1', url: 'https://example.com/page1' }),
      makeJob({ id: 'job-2', url: 'https://example.com/page2' }),
    ]
    render(<HistoryList jobs={jobs} />)
    expect(screen.getByText('https://example.com/page1')).toBeInTheDocument()
    expect(screen.getByText('https://example.com/page2')).toBeInTheDocument()
  })

  it('renders status badge for each job', () => {
    const jobs = [
      makeJob({ id: 'job-1', status: 'success' }),
      makeJob({ id: 'job-2', url: 'https://other.com', status: 'error' }),
    ]
    render(<HistoryList jobs={jobs} />)
    expect(screen.getByText('success')).toBeInTheDocument()
    expect(screen.getByText('error')).toBeInTheDocument()
  })

  it('renders "Open" link for each job pointing to /result/:id', () => {
    const jobs = [makeJob({ id: 'job-abc' })]
    render(<HistoryList jobs={jobs} />)
    const link = screen.getByRole('link', { name: /open/i })
    expect(link).toHaveAttribute('href', '/result/job-abc')
  })

  it('shows page_count column', () => {
    render(<HistoryList jobs={[makeJob({ page_count: 5 })]} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows image_count column', () => {
    render(<HistoryList jobs={[makeJob({ image_count: 12 })]} />)
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('shows summary text when present', () => {
    render(<HistoryList jobs={[makeJob({ summary: 'Parsed the docs site' })]} />)
    expect(screen.getByText(/parsed the docs site/i)).toBeInTheDocument()
  })

  it('does not show summary text when null', () => {
    render(<HistoryList jobs={[makeJob({ summary: null })]} />)
    expect(screen.queryByText(/parsed the docs site/i)).not.toBeInTheDocument()
  })

  it('renders — for null page_count', () => {
    // page_count is typed as number, but component checks != null
    render(<HistoryList jobs={[makeJob({ page_count: undefined as unknown as number })]} />)
    // The em-dash cell should be present
    const cells = screen.getAllByText('—')
    expect(cells.length).toBeGreaterThan(0)
  })
})
