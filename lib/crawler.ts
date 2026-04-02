import fs from 'fs'
import path from 'path'
import { scrape } from './scraper'
import { convertToMarkdown } from './converter'
import { downloadImagesForPage } from './images'
import { extractLinks } from './links'
import { initProgress, setProgress, deleteProgress, getProgress, addCurrentAsset, removeCurrentAsset, clearCurrentAssets } from './progress'
import { processWithGemini, GeminiTimeoutError } from './gemini-client'
import { processWithClaude, ClaudeTimeoutError } from './claude-client'
import { extractSummary } from './summarize'
import type { CrawlParams, CrawlResult, PageResult, PageImage, ParseMode } from './types'

const PAGE_TIMEOUT_MS = 30_000
const JOB_TIMEOUT_MS = 5 * 60_000

/** Simple promise-based semaphore to cap concurrent AI calls. */
function createSemaphore(limit: number) {
  let active = 0
  const queue: Array<() => void> = []

  function release() {
    active--
    if (queue.length > 0) {
      active++
      queue.shift()!()
    }
  }

  function acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (active < limit) {
        active++
        resolve(release)
      } else {
        queue.push(() => resolve(release))
      }
    })
  }

  return { acquire }
}

export async function crawl(params: CrawlParams, jobId: string): Promise<CrawlResult> {
  initProgress(jobId)

  const { url: startUrl, mode, cookies, storageState, waitSelector,
          depth: maxDepth, maxPages, concurrency, sameDomain,
          aiEnabled, aiPrompt, aiProvider, aiTimeoutMs, aiConcurrency } = params

  const aiSemaphore = createSemaphore(aiConcurrency ?? 2)

  const results: PageResult[] = []
  const visited = new Set<string>([normalizeUrl(startUrl)])

  interface QueueItem { url: string; depth: number; parentUrl: string | null }
  const queue: QueueItem[] = [{ url: startUrl, depth: 0, parentUrl: null }]

  let aborted = false
  const globalTimer = setTimeout(() => { aborted = true }, JOB_TIMEOUT_MS)

  setProgress(jobId, { phase: 'crawling', pagesTotal: 1 })

  try {
    while (queue.length > 0 && !aborted && results.length < maxPages) {
      const batch = queue.splice(0, concurrency)

      const batchResults = await Promise.all(
        batch.map((item, idx) => processPage({
          item, jobId, pageIndex: results.length + idx,
          mode, cookies, storageState, waitSelector,
          maxDepth, sameDomain,
          aiEnabled, aiPrompt, aiProvider,
          aiTimeoutMs: aiTimeoutMs ?? 60_000,
          aiSemaphore,
        }))
      )

      for (const { pageResult, discoveredLinks } of batchResults) {
        results.push(pageResult)
        setProgress(jobId, { pagesCompleted: results.length })

        if (pageResult.status === 'success' && pageResult.depth < maxDepth) {
          for (const link of discoveredLinks) {
            const norm = normalizeUrl(link)
            if (!visited.has(norm) && results.length + queue.length < maxPages) {
              visited.add(norm)
              queue.push({ url: link, depth: pageResult.depth + 1, parentUrl: pageResult.url })
              setProgress(jobId, { pagesTotal: results.length + queue.length })
            }
          }
        }
      }
    }
  } finally {
    clearTimeout(globalTimer)
  }

  clearCurrentAssets(jobId)
  setProgress(jobId, { phase: 'packaging' })

  const status = aborted || (results.length >= maxPages && queue.length > 0) ? 'partial' : 'success'
  const successPages = results.filter(p => p.status === 'success')
  const imageCount = results.reduce((sum, p) => sum + p.images.filter(i => !i.skipped).length, 0)
  const domain = (() => { try { return new URL(startUrl).hostname } catch { return startUrl } })()
  const firstPage = results[0]
  const title = firstPage?.title ?? null
  const finalUrl = firstPage?.finalUrl ?? null

  let summary: string
  if (status === 'partial' && aborted) {
    summary = `Job timed out after 5 minutes. Archive includes ${successPages.length} completed pages and ${imageCount} images.`
  } else if (status === 'partial') {
    summary = `Hit page limit. Parsed ${successPages.length} of ${results.length} pages from ${domain}. Archive contains ${successPages.length} markdown files and ${imageCount} images.`
  } else if (successPages.length === 1) {
    summary = `Parsed root page from ${domain}. Archive contains 1 markdown file and ${imageCount} images.`
  } else {
    summary = `Parsed ${successPages.length} pages from ${domain} up to depth ${maxDepth}. Archive contains ${successPages.length} markdown files and ${imageCount} images.`
  }

  return { pages: results, status, summary, title, finalUrl }
}

interface ProcessPageInput {
  item: { url: string; depth: number; parentUrl: string | null }
  jobId: string
  pageIndex: number
  mode: ParseMode
  cookies?: string
  storageState?: string
  waitSelector?: string
  maxDepth: number
  sameDomain: 'hostname' | 'origin'
  aiEnabled?: boolean
  aiPrompt?: string
  aiProvider?: 'gemini' | 'claude'
  aiTimeoutMs: number
  aiSemaphore: ReturnType<typeof createSemaphore>
}

async function processPage(input: ProcessPageInput): Promise<{
  pageResult: PageResult
  discoveredLinks: string[]
}> {
  const { item, jobId, pageIndex, mode, cookies, storageState, waitSelector, maxDepth, sameDomain,
          aiEnabled, aiPrompt, aiTimeoutMs, aiSemaphore } = input
  const pageNum = String(pageIndex + 1).padStart(3, '0')
  const filename = `page-${pageNum}.md`

  setProgress(jobId, {
    currentUrl: item.url,
    currentStep: 'loading page',
  })

  const scrapeParams = {
    url: item.url,
    mode,
    cookies, storageState, waitSelector,
  }

  let scrapeResult: { html: string; finalUrl: string; title: string }

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Page timeout')), PAGE_TIMEOUT_MS)
    )
    scrapeResult = await Promise.race([scrape(scrapeParams), timeoutPromise])
  } catch (err) {
    const isTimeout = err instanceof Error && err.message === 'Page timeout'
    return {
      pageResult: {
        url: item.url, finalUrl: item.url, title: null,
        depth: item.depth, parentUrl: item.parentUrl,
        status: isTimeout ? 'timeout' : 'error',
        filename, images: [],
        error: err instanceof Error ? err.message : String(err),
      },
      discoveredLinks: [],
    }
  }

  // Extract links before Readability strips them
  const discoveredLinks = item.depth < maxDepth
    ? extractLinks(scrapeResult.html, scrapeResult.finalUrl, sameDomain)
    : []

  setProgress(jobId, { currentStep: 'downloading images' })

  let images: PageImage[] = []
  let urlToLocal = new Map<string, string>()
  try {
    const result = await downloadImagesForPage(
      scrapeResult.html,
      jobId,
      pageIndex,
      scrapeResult.finalUrl,
      ({ asset, status }) => {
        if (status === 'start') {
          addCurrentAsset(jobId, asset)
          return
        }
        removeCurrentAsset(jobId, asset)
      },
    )
    images = result.images
    urlToLocal = result.urlToLocal
    const imagesCompleted = getProgress(jobId)?.imagesCompleted ?? 0
    setProgress(jobId, {
      imagesCompleted: imagesCompleted + images.filter(i => !i.skipped).length,
    })
  } catch { /* image failure doesn't fail the page */ }

  setProgress(jobId, { currentStep: 'converting to markdown' })

  const rawMarkdown = convertToMarkdown(scrapeResult.html, scrapeResult.finalUrl, urlToLocal)

  // Save pages directory
  const pagesDir = path.join(process.cwd(), 'data', 'pages', jobId)
  fs.mkdirSync(pagesDir, { recursive: true })

  // Always save raw markdown first (baseline / fallback)
  fs.writeFileSync(path.join(pagesDir, filename), rawMarkdown, 'utf-8')

  // Heuristic summary as fallback
  let summary = extractSummary(rawMarkdown)
  let aiStatus: PageResult['aiStatus']
  let aiError: string | undefined

  if (aiEnabled && aiPrompt) {
    // Save raw for debugging before AI potentially overwrites the main file
    fs.writeFileSync(path.join(pagesDir, filename.replace('.md', '.raw.md')), rawMarkdown, 'utf-8')

    setProgress(jobId, { currentStep: 'AI processing' })

    const release = await aiSemaphore.acquire()
    try {
      const aiResult = input.aiProvider === 'claude'
        ? await processWithClaude(aiPrompt, rawMarkdown, scrapeResult.finalUrl, aiTimeoutMs)
        : await processWithGemini(aiPrompt, rawMarkdown, scrapeResult.finalUrl, aiTimeoutMs)

      // Overwrite main file with AI-processed markdown
      fs.writeFileSync(path.join(pagesDir, filename), aiResult.processedMarkdown, 'utf-8')

      if (aiResult.summary) summary = aiResult.summary
      aiStatus = 'success'
    } catch (err) {
      aiStatus = (err instanceof GeminiTimeoutError || err instanceof ClaudeTimeoutError) ? 'timeout' : 'error'
      aiError = err instanceof Error ? err.message : String(err)
      console.warn(`[crawler] AI processing failed for ${item.url}: ${aiError}`)
      // Raw markdown stays as the final file — already written above
    } finally {
      release()
    }

    const aiPagesCompleted = (getProgress(jobId)?.aiPagesCompleted ?? 0) + 1
    setProgress(jobId, { aiPagesCompleted, currentStep: 'saving result' })
  } else {
    setProgress(jobId, { currentStep: 'saving result' })
  }

  return {
    pageResult: {
      url: item.url,
      finalUrl: scrapeResult.finalUrl,
      title: scrapeResult.title || null,
      depth: item.depth,
      parentUrl: item.parentUrl,
      status: 'success',
      filename,
      images,
      summary,
      ...(aiStatus !== undefined && { aiStatus }),
      ...(aiError !== undefined && { aiError }),
    },
    discoveredLinks,
  }
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    u.hash = ''
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1)
    }
    return u.toString()
  } catch {
    return url
  }
}
