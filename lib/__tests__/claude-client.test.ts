import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { processWithClaude, ClaudeTimeoutError, ClaudeError } from '../claude-client'

function makeClaudeResponse(text: string, status = 200) {
  return new Response(
    JSON.stringify({ content: [{ type: 'text', text }] }),
    { status, headers: { 'Content-Type': 'application/json' } },
  )
}

beforeEach(() => {
  vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('processWithClaude', () => {
  it('returns processedMarkdown and summary on valid JSON response', async () => {
    const payload = JSON.stringify({
      processedMarkdown: '# Processed\n\nContent.',
      summary: 'A short summary.',
    })
    vi.mocked(fetch).mockResolvedValueOnce(makeClaudeResponse(payload))

    const result = await processWithClaude('Clean this', '# Raw', 'https://example.com', 5000)
    expect(result.processedMarkdown).toBe('# Processed\n\nContent.')
    expect(result.summary).toBe('A short summary.')
  })

  it('falls back to raw text when Claude returns non-JSON', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeClaudeResponse('not json'))

    const result = await processWithClaude('Clean', '# Raw', 'https://example.com', 5000)
    expect(result.processedMarkdown).toBe('not json')
    expect(result.summary).toBe('')
  })

  it('falls back to rawMarkdown when JSON has no processedMarkdown field', async () => {
    const payload = JSON.stringify({ summary: 'Only summary.' })
    vi.mocked(fetch).mockResolvedValueOnce(makeClaudeResponse(payload))

    const result = await processWithClaude('Clean', '# Original', 'https://example.com', 5000)
    expect(result.processedMarkdown).toBe('# Original')
    expect(result.summary).toBe('Only summary.')
  })

  it('throws ClaudeError on non-OK HTTP response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('{"error":"invalid key"}', { status: 401 }),
    )
    await expect(processWithClaude('p', 'md', 'url', 5000)).rejects.toThrow(ClaudeError)
  })

  it('throws ClaudeTimeoutError when fetch times out', async () => {
    const err = new Error('timed out')
    err.name = 'TimeoutError'
    vi.mocked(fetch).mockRejectedValueOnce(err)

    await expect(processWithClaude('p', 'md', 'url', 100)).rejects.toThrow(ClaudeTimeoutError)
  })

  it('throws ClaudeError when ANTHROPIC_API_KEY is missing', async () => {
    vi.unstubAllEnvs()
    vi.stubEnv('ANTHROPIC_API_KEY', '')

    await expect(processWithClaude('p', 'md', 'url', 5000)).rejects.toThrow(ClaudeError)
  })

  it('throws ClaudeError on network failure', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network failure'))
    await expect(processWithClaude('p', 'md', 'url', 5000)).rejects.toThrow(ClaudeError)
  })
})
