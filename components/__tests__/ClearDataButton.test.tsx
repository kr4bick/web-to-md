import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ClearDataButton from '../ClearDataButton'

const mockRefresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

beforeEach(() => {
  mockRefresh.mockClear()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ClearDataButton', () => {
  it('renders "Clear all" text initially', () => {
    render(<ClearDataButton />)
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument()
  })

  it('click shows confirmation UI: "Clear all data?", "Yes, clear", "Cancel"', async () => {
    const user = userEvent.setup()
    render(<ClearDataButton />)

    await user.click(screen.getByRole('button', { name: /clear all/i }))

    expect(screen.getByText(/clear all data\?/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /yes, clear/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('click Cancel hides confirmation', async () => {
    const user = userEvent.setup()
    render(<ClearDataButton />)

    await user.click(screen.getByRole('button', { name: /clear all/i }))
    expect(screen.getByText(/clear all data\?/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.queryByText(/clear all data\?/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument()
  })

  it('click "Yes, clear" calls DELETE /api/clear', async () => {
    const user = userEvent.setup()
    render(<ClearDataButton />)

    await user.click(screen.getByRole('button', { name: /clear all/i }))
    await user.click(screen.getByRole('button', { name: /yes, clear/i }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/clear', { method: 'DELETE' })
    })
  })

  it('click "Yes, clear" triggers router.refresh()', async () => {
    const user = userEvent.setup()
    render(<ClearDataButton />)

    await user.click(screen.getByRole('button', { name: /clear all/i }))
    await user.click(screen.getByRole('button', { name: /yes, clear/i }))

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })
  })

  it('returns to initial state after clearing', async () => {
    const user = userEvent.setup()
    render(<ClearDataButton />)

    await user.click(screen.getByRole('button', { name: /clear all/i }))
    await user.click(screen.getByRole('button', { name: /yes, clear/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument()
    })
  })
})
