import { describe, it, expect } from 'vitest'
import { extractSummary } from '../summarize'

describe('extractSummary', () => {
  it('returns H1 heading as summary', () => {
    const md = '# My Page Title\n\nSome paragraph text here.'
    expect(extractSummary(md)).toBe('My Page Title')
  })

  it('appends nothing when H1 alone is used', () => {
    const md = '# Title\n\n## Sub\n\nParagraph.'
    expect(extractSummary(md)).toBe('Title')
  })

  it('falls back to first non-heading line when no H1', () => {
    const md = '## Section\n\nFirst paragraph content.'
    expect(extractSummary(md)).toBe('First paragraph content.')
  })

  it('falls back to first line when no heading at all', () => {
    const md = 'Just plain text\n\nMore text.'
    expect(extractSummary(md)).toBe('Just plain text')
  })

  it('truncates to 150 chars with ellipsis', () => {
    const long = 'A'.repeat(200)
    const md = `# ${long}`
    const result = extractSummary(md)
    expect(result.length).toBe(150)
    expect(result.endsWith('…')).toBe(true)
  })

  it('returns empty string for empty markdown', () => {
    expect(extractSummary('')).toBe('')
  })

  it('returns empty string for whitespace-only markdown', () => {
    expect(extractSummary('   \n\n  ')).toBe('')
  })

  it('skips code fence lines when looking for paragraph', () => {
    const md = '```js\nconst x = 1\n```\n\nActual paragraph.'
    expect(extractSummary(md)).toBe('Actual paragraph.')
  })

  it('skips horizontal rules', () => {
    const md = '---\n\nContent after rule.'
    expect(extractSummary(md)).toBe('Content after rule.')
  })
})
