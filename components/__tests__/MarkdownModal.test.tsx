import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MarkdownModal from '../MarkdownModal'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('MarkdownModal', () => {
  it('shows loading state initially', () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {})) // never resolves
    render(<MarkdownModal jobId="job-1" filename="page-001.md" onClose={vi.fn()} />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('renders markdown content after fetch resolves', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('# Hello\n\nWorld', { status: 200 }))
    render(<MarkdownModal jobId="job-1" filename="page-001.md" onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/# Hello/)).toBeInTheDocument()
    })
  })

  it('shows error message when fetch fails with non-ok status', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('Not found', { status: 404 }))
    render(<MarkdownModal jobId="job-1" filename="page-001.md" onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })
  })

  it('shows error message when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
    render(<MarkdownModal jobId="job-1" filename="page-001.md" onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValueOnce(new Response('content', { status: 200 }))
    const onClose = vi.fn()
    render(<MarkdownModal jobId="job-1" filename="page-001.md" onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when overlay backdrop is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValueOnce(new Response('content', { status: 200 }))
    const onClose = vi.fn()
    const { container } = render(
      <MarkdownModal jobId="job-1" filename="page-001.md" onClose={onClose} />,
    )

    // Click the outer overlay (first child of container)
    const overlay = container.firstChild as HTMLElement
    await user.click(overlay)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('displays the filename in the header', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('content', { status: 200 }))
    render(<MarkdownModal jobId="job-1" filename="page-042.md" onClose={vi.fn()} />)

    expect(screen.getByText('page-042.md')).toBeInTheDocument()
  })
})
