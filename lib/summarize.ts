const MAX_SUMMARY_LENGTH = 150

/**
 * Extracts a short heuristic summary from Markdown.
 * Uses the first H1 heading, falling back to the first non-empty non-heading line.
 * Appends the first content paragraph if the heading alone is short enough.
 */
export function extractSummary(markdown: string): string {
  const lines = markdown.split('\n')

  let heading = ''
  let firstParagraph = ''
  let inCodeBlock = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue
    if (!trimmed) continue

    if (!heading && trimmed.startsWith('# ')) {
      heading = trimmed.replace(/^#+\s+/, '')
      continue
    }

    // Skip other headings and horizontal rules when looking for paragraph
    if (trimmed.startsWith('#') || trimmed.startsWith('---')) continue

    if (!firstParagraph) {
      firstParagraph = trimmed
      break
    }
  }

  // If no H1 found, use first paragraph as heading
  if (!heading) heading = firstParagraph

  const result = heading.length > 0 ? heading : ''
  return result.length > MAX_SUMMARY_LENGTH ? result.slice(0, MAX_SUMMARY_LENGTH - 1) + '…' : result
}
