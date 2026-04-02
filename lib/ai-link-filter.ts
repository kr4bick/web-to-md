import { processWithGemini } from './gemini-client'
import { processWithClaude } from './claude-client'

const FILTER_SYSTEM_INSTRUCTION = `You are a URL filter assistant.
You receive a list of URLs discovered on a web page and a filter description.
Return ONLY the URLs that match the filter description based on the URL path and page context.

Rules:
- Return ONLY valid JSON — a flat array of URL strings.
- Include only URLs from the provided list — do not invent new ones.
- If no URLs match, return an empty array.
- Do not add explanations or text outside the JSON array.

Example output:
["https://example.com/docs/api", "https://example.com/docs/guide"]`

/**
 * Filters discovered links using AI based on a natural-language description.
 * Returns a subset of the provided links that match the filter.
 */
export async function filterLinksWithAI(
  provider: 'gemini' | 'claude',
  filterDescription: string,
  links: string[],
  pageUrl: string,
  pageMarkdown: string,
  timeoutMs: number,
): Promise<string[]> {
  if (links.length === 0) return []

  const markdownSnippet = pageMarkdown.slice(0, 1500)
  const userContent = `Page URL: ${pageUrl}

Page context (excerpt):
${markdownSnippet}

Filter description: ${filterDescription}

URLs to evaluate:
${links.join('\n')}`

  // Reuse the AI clients but with a different system instruction by wrapping the call
  const rawResult = await callAI(provider, userContent, timeoutMs)

  try {
    const parsed = JSON.parse(rawResult)
    if (!Array.isArray(parsed)) return links // fallback: keep all
    const linkSet = new Set(links)
    return parsed.filter((url): url is string => typeof url === 'string' && linkSet.has(url))
  } catch {
    return links // fallback: keep all on parse error
  }
}

async function callAI(provider: 'gemini' | 'claude', userContent: string, timeoutMs: number): Promise<string> {
  if (provider === 'claude') {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: FILTER_SYSTEM_INSTRUCTION,
        messages: [{ role: 'user', content: userContent }],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) throw new Error(`Claude API error ${res.status}`)
    const data = await res.json()
    return data?.content?.[0]?.text ?? '[]'
  }

  // Gemini
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: FILTER_SYSTEM_INSTRUCTION }] },
        contents: [{ role: 'user', parts: [{ text: userContent }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    },
  )
  if (!res.ok) throw new Error(`Gemini API error ${res.status}`)
  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
}
