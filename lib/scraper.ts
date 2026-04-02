import type { ScrapeParams, ScrapeResult } from './types'

const PLAYWRIGHT_SERVICE_URL =
  process.env.PLAYWRIGHT_SERVICE_URL ?? 'http://localhost:3001'

export async function scrape(params: ScrapeParams): Promise<ScrapeResult> {
  const res = await fetch(`${PLAYWRIGHT_SERVICE_URL}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(65_000),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error ?? `Playwright service returned ${res.status}`)
  }

  return data as ScrapeResult
}
