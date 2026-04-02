const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const SYSTEM_INSTRUCTION = `You are a Markdown post-processor.
You receive a user instruction and raw Markdown content extracted from a web page.
Apply the user instruction to transform the Markdown.

Rules:
- Return ONLY valid JSON, no text outside the JSON object.
- Do not invent facts not present in the source Markdown.
- Preserve links and document structure where possible.
- The summary must be a single short factual sentence (max 150 characters) describing the page content.

Required JSON format:
{
  "processedMarkdown": "<transformed markdown string>",
  "summary": "<short factual summary>"
}`

export class GeminiTimeoutError extends Error {
  constructor() {
    super('Gemini request timed out')
    this.name = 'GeminiTimeoutError'
  }
}

export class GeminiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GeminiError'
  }
}

export interface GeminiResult {
  processedMarkdown: string
  summary: string
}

export async function processWithGemini(
  userPrompt: string,
  rawMarkdown: string,
  url: string,
  timeoutMs: number,
): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new GeminiError('GEMINI_API_KEY environment variable is not set')

  const userContent = `URL: ${url}\n\nInstruction: ${userPrompt}\n\n---\n\n${rawMarkdown}`

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: userContent }] }],
    generationConfig: { responseMimeType: 'application/json' },
  }

  let res: Response
  try {
    res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') throw new GeminiTimeoutError()
    throw new GeminiError(err instanceof Error ? err.message : String(err))
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new GeminiError(`Gemini API error ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  try {
    const parsed = JSON.parse(rawText) as Partial<GeminiResult>
    return {
      processedMarkdown: parsed.processedMarkdown ?? rawMarkdown,
      summary: parsed.summary ?? '',
    }
  } catch {
    // Gemini didn't return valid JSON — use raw text as markdown, no summary
    return { processedMarkdown: rawText || rawMarkdown, summary: '' }
  }
}
