const PLAYWRIGHT_SERVICE_URL =
  process.env.PLAYWRIGHT_SERVICE_URL ?? 'http://localhost:3001'

export async function GET() {
  const result: Record<string, unknown> = {
    PLAYWRIGHT_SERVICE_URL,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
  }

  try {
    const res = await fetch(`${PLAYWRIGHT_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    })
    result.playwright_health_status = res.status
    result.playwright_health_body = await res.json()
  } catch (err) {
    result.playwright_health_error = err instanceof Error ? err.message : String(err)
  }

  return Response.json(result)
}
