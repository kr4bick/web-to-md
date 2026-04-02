const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'

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

export class ClaudeTimeoutError extends Error {
  constructor() {
    super('Claude request timed out')
    this.name = 'ClaudeTimeoutError'
  }
}

export class ClaudeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ClaudeError'
  }
}

export interface ClaudeResult {
  processedMarkdown: string
  summary: string
}

export async function processWithClaude(
  userPrompt: string,
  rawMarkdown: string,
  url: string,
  timeoutMs: number,
): Promise<ClaudeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new ClaudeError('ANTHROPIC_API_KEY environment variable is not set')

  const userContent = `URL: ${url}\n\nInstruction: ${userPrompt}\n\n---\n\n${rawMarkdown}`

  const body = {
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    system: SYSTEM_INSTRUCTION,
    messages: [{ role: 'user', content: userContent }],
  }

  let res: Response
  try {
    res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') throw new ClaudeTimeoutError()
    throw new ClaudeError(err instanceof Error ? err.message : String(err))
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new ClaudeError(`Claude API error ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  const rawText: string = data?.content?.[0]?.text ?? ''

  // Claude sometimes wraps JSON in a markdown code fence — strip it
  const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  try {
    const parsed = JSON.parse(jsonText) as Partial<ClaudeResult>
    return {
      processedMarkdown: parsed.processedMarkdown ?? rawMarkdown,
      summary: parsed.summary ?? '',
    }
  } catch {
    return { processedMarkdown: rawText || rawMarkdown, summary: '' }
  }
}
