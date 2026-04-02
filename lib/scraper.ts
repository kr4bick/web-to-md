import { chromium } from 'playwright'
import type { ScrapeParams, ScrapeResult } from './types'

const CONTEXT_SETTINGS = {
  viewport: { width: 1280, height: 900 },
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  locale: 'en-US',
  timezoneId: 'America/New_York',
}

function parseCookieString(
  cookieStr: string,
  url: string,
): Array<{ name: string; value: string; domain: string; path: string }> {
  const domain = new URL(url).hostname
  return cookieStr
    .split(';')
    .map((pair) => pair.trim())
    .filter((pair) => pair.length > 0)
    .map((pair) => {
      const eqIndex = pair.indexOf('=')
      const name = eqIndex >= 0 ? pair.slice(0, eqIndex).trim() : pair.trim()
      const value = eqIndex >= 0 ? pair.slice(eqIndex + 1).trim() : ''
      return { name, value, domain, path: '/' }
    })
}

async function scrapeInner(params: ScrapeParams): Promise<ScrapeResult> {
  const { url, mode, cookies, storageState, waitSelector } = params

  const browser = await chromium.launch({ headless: true })

  try {
    let context: Awaited<ReturnType<typeof browser.newContext>>

    if (mode === 'auth' && storageState) {
      context = await browser.newContext({
        ...CONTEXT_SETTINGS,
        storageState: JSON.parse(storageState),
      })
    } else if (mode === 'interactive' && storageState) {
      context = await browser.newContext({
        ...CONTEXT_SETTINGS,
        storageState: JSON.parse(storageState),
      })
    } else {
      context = await browser.newContext(CONTEXT_SETTINGS)
    }

    if ((mode === 'auth' || mode === 'interactive') && cookies) {
      const parsedCookies = parseCookieString(cookies, url)
      await context.addCookies(parsedCookies)
    }

    const page = await context.newPage()

    if (mode === 'simple') {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })

      if (waitSelector) {
        await page.waitForSelector(waitSelector, { timeout: 10000 })
      }

      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 600))
        await page.waitForTimeout(400)
      }

      const html = await page.content()
      const title = await page.title()
      const finalUrl = page.url()

      return { html, title, finalUrl }
    }

    if (mode === 'auth') {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })

      if (waitSelector) {
        await page.waitForSelector(waitSelector, { timeout: 10000 })
      }

      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 600))
        await page.waitForTimeout(400)
      }

      const html = await page.content()
      const title = await page.title()
      const finalUrl = page.url()

      return { html, title, finalUrl }
    }

    // mode === 'interactive'
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })

    if (waitSelector) {
      await page.waitForSelector(waitSelector, { timeout: 10000 })
    }

    // Try to click cookie banners / consent buttons
    try {
      await page
        .getByRole('button', { name: /accept|agree|got it/i })
        .first()
        .click({ timeout: 3000 })
      await page.waitForLoadState('networkidle', { timeout: 15000 })
    } catch {
      // best effort — continue
    }

    // Extended auto-scroll: 10 iterations
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 500))
      await page.waitForTimeout(500)
    }

    // Try to click "show more" / "expand" buttons
    try {
      await page
        .getByRole('button', { name: /show more|read more|expand/i })
        .first()
        .click({ timeout: 3000 })
      await page.waitForLoadState('networkidle', { timeout: 15000 })
    } catch {
      // best effort — continue
    }

    // Extract main frame HTML + accessible iframes
    const mainHtml = await page.content()
    const title = await page.title()
    const finalUrl = page.url()

    let combinedHtml = mainHtml

    for (const frame of page.frames()) {
      if (frame === page.mainFrame()) continue
      try {
        const frameHtml = await frame.content()
        combinedHtml += `\n<!-- iframe: ${frame.url()} -->\n${frameHtml}`
      } catch {
        // silently skip inaccessible iframes
      }
    }

    return { html: combinedHtml, title, finalUrl }
  } finally {
    await browser.close()
  }
}

export async function scrape(params: ScrapeParams): Promise<ScrapeResult> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Scrape timed out after 60 seconds')), 60000),
  )

  return Promise.race([scrapeInner(params), timeoutPromise])
}
