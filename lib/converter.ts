import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import TurndownService from 'turndown'

export function convertToMarkdown(html: string, baseUrl: string, urlToLocal?: Map<string, string>): string {
  const dom = new JSDOM(html, { url: baseUrl })

  const reader = new Readability(dom.window.document)
  const article = reader.parse()
  const contentHtml = article?.content ?? dom.window.document.body.innerHTML

  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  })

  let markdown = td.turndown(contentHtml)

  if (urlToLocal && urlToLocal.size > 0) {
    markdown = markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
      const local = urlToLocal.get(src)
      return local ? `![${alt}](${local})` : match
    })
  }

  return markdown
}
