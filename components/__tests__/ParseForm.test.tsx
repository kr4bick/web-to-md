import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ParseForm from '../ParseForm'

// Mock next/navigation (not used by ParseForm directly, but ProgressView/child components may need it)
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

// Mock ProgressView so tests don't need to set up polling
vi.mock('../ProgressView', () => ({
  default: ({ jobId }: { jobId: string }) => (
    <div data-testid="progress-view">Parsing in progress for {jobId}</div>
  ),
}))

// Mock ResultView
vi.mock('../ResultView', () => ({
  default: () => <div data-testid="result-view">Result</div>,
}))

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ParseForm', () => {
  it('renders URL input, Mode select, and Parse button', () => {
    render(<ParseForm />)
    expect(screen.getByLabelText(/url/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/mode/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^parse$/i })).toBeInTheDocument()
  })

  it('Parse button shows "Parse" initially and is enabled', () => {
    render(<ParseForm />)
    const btn = screen.getByRole('button', { name: /^parse$/i })
    expect(btn).not.toBeDisabled()
    expect(btn).toHaveTextContent('Parse')
  })

  it('after submit with 202 response: button shows "Parsing…" and form controls are disabled', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.fn().mockResolvedValue({
      status: 202,
      ok: true,
      json: async () => ({ jobId: 'test-job-123', status: 'running' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    render(<ParseForm />)

    await user.type(screen.getByLabelText(/url/i), 'https://example.com')
    await user.click(screen.getByRole('button', { name: /^parse$/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /parsing/i })).toBeInTheDocument()
    })

    // fieldset should be disabled
    const fieldset = document.querySelector('fieldset')
    expect(fieldset).toBeDisabled()
  })

  it('shows ProgressView after 202 response', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.fn().mockResolvedValue({
      status: 202,
      ok: true,
      json: async () => ({ jobId: 'test-job-456', status: 'running' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    render(<ParseForm />)
    await user.type(screen.getByLabelText(/url/i), 'https://example.com')
    await user.click(screen.getByRole('button', { name: /^parse$/i }))

    await waitFor(() => {
      expect(screen.getByTestId('progress-view')).toBeInTheDocument()
    })
    expect(screen.getByTestId('progress-view')).toHaveTextContent('test-job-456')
  })

  it('after submit with error response: shows error message', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.fn().mockResolvedValue({
      status: 400,
      ok: false,
      json: async () => ({ error: 'Invalid URL provided' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    render(<ParseForm />)
    await user.type(screen.getByLabelText(/url/i), 'https://example.com')
    await user.click(screen.getByRole('button', { name: /^parse$/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid URL provided')).toBeInTheDocument()
    })
  })

  it('shows error message when fetch throws (network error)', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')))

    render(<ParseForm />)
    await user.type(screen.getByLabelText(/url/i), 'https://example.com')
    await user.click(screen.getByRole('button', { name: /^parse$/i }))

    await waitFor(() => {
      expect(screen.getByText(/failed to connect/i)).toBeInTheDocument()
    })
  })

  it('Multi-page checkbox shows crawl options when checked', async () => {
    const user = userEvent.setup()
    render(<ParseForm />)

    // Crawl options should not be visible initially
    expect(screen.queryByLabelText(/parse linked pages/i)).not.toBeInTheDocument()

    // Check the multi-page checkbox
    await user.click(screen.getByLabelText(/multi-page crawl/i))

    // Now the sub-options should appear
    expect(screen.getByLabelText(/parse linked pages/i)).toBeInTheDocument()
  })

  it('Multi-page checkbox hides crawl options when unchecked', async () => {
    const user = userEvent.setup()
    render(<ParseForm />)

    await user.click(screen.getByLabelText(/multi-page crawl/i))
    expect(screen.getByLabelText(/parse linked pages/i)).toBeInTheDocument()

    await user.click(screen.getByLabelText(/multi-page crawl/i))
    expect(screen.queryByLabelText(/parse linked pages/i)).not.toBeInTheDocument()
  })

  it('parse linked pages checkbox reveals depth/maxPages/concurrency when checked', async () => {
    const user = userEvent.setup()
    render(<ParseForm />)

    await user.click(screen.getByLabelText(/multi-page crawl/i))
    expect(screen.queryByLabelText(/depth/i)).not.toBeInTheDocument()

    await user.click(screen.getByLabelText(/parse linked pages/i))
    expect(screen.getByLabelText(/depth/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/max pages/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/concurrency/i)).toBeInTheDocument()
  })
})
