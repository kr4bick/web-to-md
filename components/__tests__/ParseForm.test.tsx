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

  it('Multi-page checkbox is hidden in simple mode', () => {
    render(<ParseForm />)
    expect(screen.queryByLabelText(/multi-page crawl/i)).not.toBeInTheDocument()
  })

  it('Multi-page checkbox visible after switching to Advance mode', async () => {
    const user = userEvent.setup()
    render(<ParseForm />)

    await user.selectOptions(screen.getByLabelText(/mode/i), 'advance')

    // Selecting advance auto-shows the advanced section
    expect(screen.getByLabelText(/multi-page crawl/i)).toBeInTheDocument()
  })

  it('Multi-page check reveals depth/maxPages/concurrency inputs', async () => {
    const user = userEvent.setup()
    render(<ParseForm />)

    await user.selectOptions(screen.getByLabelText(/mode/i), 'advance')
    expect(screen.queryByLabelText(/depth/i)).not.toBeInTheDocument()

    await user.click(screen.getByLabelText(/multi-page crawl/i))
    expect(screen.getByLabelText(/depth/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/max pages/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/concurrency/i)).toBeInTheDocument()
  })

  it('AI post-processing checkbox is hidden in simple mode', () => {
    render(<ParseForm />)
    expect(screen.queryByLabelText(/use ai post-processing/i)).not.toBeInTheDocument()
  })

  it('AI post-processing checkbox visible in Advance mode', async () => {
    const user = userEvent.setup()
    render(<ParseForm />)

    await user.selectOptions(screen.getByLabelText(/mode/i), 'advance')
    expect(screen.getByLabelText(/use ai post-processing/i)).toBeInTheDocument()
  })

  it('AI sub-fields hidden when aiEnabled is unchecked', async () => {
    const user = userEvent.setup()
    render(<ParseForm />)

    await user.selectOptions(screen.getByLabelText(/mode/i), 'advance')
    expect(screen.queryByLabelText(/ai prompt/i)).not.toBeInTheDocument()
  })

  it('AI sub-fields visible when aiEnabled is checked', async () => {
    const user = userEvent.setup()
    render(<ParseForm />)

    await user.selectOptions(screen.getByLabelText(/mode/i), 'advance')
    await user.click(screen.getByLabelText(/use ai post-processing/i))

    expect(screen.getByLabelText(/ai prompt/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/timeout/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/max parallel/i)).toBeInTheDocument()
  })

  it('shows prompt validation error when AI enabled but prompt is empty on submit', async () => {
    const user = userEvent.setup()
    render(<ParseForm />)

    await user.type(screen.getByLabelText(/url/i), 'https://example.com')
    await user.selectOptions(screen.getByLabelText(/mode/i), 'advance')
    await user.click(screen.getByLabelText(/use ai post-processing/i))
    // Leave prompt empty
    await user.click(screen.getByRole('button', { name: /^parse$/i }))

    expect(screen.getByText(/prompt is required/i)).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('includes aiEnabled and aiPrompt in POST body when AI is enabled', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValueOnce({
      status: 202,
      ok: true,
      json: async () => ({ jobId: 'ai-job-1', status: 'running' }),
    } as Response)

    render(<ParseForm />)

    await user.type(screen.getByLabelText(/url/i), 'https://example.com')
    await user.selectOptions(screen.getByLabelText(/mode/i), 'advance')
    await user.click(screen.getByLabelText(/use ai post-processing/i))
    await user.type(screen.getByLabelText(/ai prompt/i), 'Clean this page')
    await user.click(screen.getByRole('button', { name: /^parse$/i }))

    await waitFor(() => {
      const call = vi.mocked(fetch).mock.calls[0]
      const body = JSON.parse(call[1]?.body as string)
      expect(body.aiEnabled).toBe(true)
      expect(body.aiPrompt).toBe('Clean this page')
    })
  })
})
