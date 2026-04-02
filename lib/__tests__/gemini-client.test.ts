import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { processWithGemini, GeminiTimeoutError, GeminiError } from '../gemini-client'

function makeGeminiResponse(text: string, status = 200) {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text }] } }],
    }),
    { status, headers: { 'Content-Type': 'application/json' } },
  )
}

beforeEach(() => {
  vi.stubEnv('GEMINI_API_KEY', 'test-key')
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('processWithGemini', () => {
  it('returns processedMarkdown and summary on valid JSON response', async () => {
    const payload = JSON.stringify({
      processedMarkdown: '# Processed\n\nContent.',
      summary: 'A short summary.',
    })
    vi.mocked(fetch).mockResolvedValueOnce(makeGeminiResponse(payload))

    const result = await processWithGemini('Clean this', '# Raw\n\nContent.', 'https://example.com', 5000)
    expect(result.processedMarkdown).toBe('# Processed\n\nContent.')
    expect(result.summary).toBe('A short summary.')
  })

  it('falls back to raw text when Gemini returns non-JSON', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeGeminiResponse('not json at all'))

    const result = await processWithGemini('Clean this', '# Raw', 'https://example.com', 5000)
    expect(result.processedMarkdown).toBe('not json at all')
    expect(result.summary).toBe('')
  })

  it('falls back to rawMarkdown when JSON has no processedMarkdown field', async () => {
    const payload = JSON.stringify({ summary: 'Only summary.' })
    vi.mocked(fetch).mockResolvedValueOnce(makeGeminiResponse(payload))

    const result = await processWithGemini('Clean', '# Original', 'https://example.com', 5000)
    expect(result.processedMarkdown).toBe('# Original')
    expect(result.summary).toBe('Only summary.')
  })

  it('throws GeminiError on non-OK HTTP response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('{"error":"invalid key"}', { status: 400 }),
    )

    await expect(processWithGemini('p', 'md', 'url', 5000)).rejects.toThrow(GeminiError)
  })

  it('throws GeminiTimeoutError when fetch times out', async () => {
    const timeoutError = new Error('The operation was aborted due to timeout')
    timeoutError.name = 'TimeoutError'
    vi.mocked(fetch).mockRejectedValueOnce(timeoutError)

    await expect(processWithGemini('p', 'md', 'url', 100)).rejects.toThrow(GeminiTimeoutError)
  })

  it('throws GeminiError when GEMINI_API_KEY is missing', async () => {
    vi.unstubAllEnvs()
    vi.stubEnv('GEMINI_API_KEY', '')

    await expect(processWithGemini('p', 'md', 'url', 5000)).rejects.toThrow(GeminiError)
  })

  it('throws GeminiError on network failure', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network failure'))

    await expect(processWithGemini('p', 'md', 'url', 5000)).rejects.toThrow(GeminiError)
  })
})
