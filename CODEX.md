# Agent Guide — Web to Markdown Parser

This document is the primary reference for any AI agent (Claude Code, Codex, Cursor, etc.) working on this codebase. Read it fully before making changes.

---

## What this app does

Takes a URL, opens it in a real Chromium browser (Playwright), extracts main content, converts to Markdown, downloads images, and packages results as a ZIP archive. Supports multi-page crawling within the same domain with live progress tracking.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, App Router, TypeScript |
| Styling | Tailwind CSS v4 (no config file — works natively) |
| Database | SQLite via `better-sqlite3` |
| Auth | `iron-session` (cookie-based), IP whitelist |
| Browser | Playwright in a separate Docker service |
| HTML→MD | `@mozilla/readability` + `turndown` |
| Archive | `archiver` (ZIP) |

> **IMPORTANT — Next.js 16 breaking changes**: `middleware.ts` is deprecated; this project uses `proxy.ts` with `export { proxy }`. Route handler `params` are async: `const { id } = await params`. Read `node_modules/next/dist/docs/` before touching routing.

---

## Repository layout

```
app/                              ← git root, Next.js project
  proxy.ts                        ← IP whitelist + session (runs on every request)
  lib/
    types.ts                      ← all shared TypeScript types
    db.ts                         ← SQLite singleton + CRUD
    scraper.ts                    ← HTTP client → playwright-service
    crawler.ts                    ← BFS multi-page crawl engine
    links.ts                      ← internal link extraction + filtering
    images.ts                     ← parallel image downloader
    converter.ts                  ← HTML → Markdown (Readability + Turndown)
    progress.ts                   ← in-memory progress store (Map)
    session.ts                    ← iron-session config
  app/
    page.tsx                      ← landing page (/)
    parse/page.tsx                ← parse form (/parse)
    history/page.tsx              ← job history (/history)
    result/[id]/page.tsx          ← job result detail (/result/:id)
    api/
      parse/route.ts              ← POST /api/parse
      progress/[id]/route.ts      ← GET /api/progress/:id
      result/[id]/route.ts        ← GET /api/result/:id
      history/route.ts            ← GET /api/history
      download/[id]/route.ts      ← GET /api/download/:id (.md)
      download/[id]/zip/route.ts  ← GET /api/download/:id/zip
  components/
    ParseForm.tsx                 ← main parse form (with multi-page options)
    ProgressView.tsx              ← live progress polling UI
    ResultView.tsx                ← result summary + sitemap + download
    SitemapTree.tsx               ← nested page tree with status icons
    HistoryList.tsx               ← job history table
    MarkdownPreview.tsx           ← legacy, not used in main flow
  playwright-service/
    server.ts                     ← HTTP server port 3001 (POST /scrape, GET /health)
    scraper.ts                    ← Playwright browser automation
    Dockerfile
  docker-compose.yml
  Dockerfile
  railway.json
```

---

## API contract

### POST `/api/parse`
**Request body:**
```typescript
{
  url: string
  mode?: 'simple' | 'advance'  // default: 'simple'
  cookies?: string
  storageState?: string
  waitSelector?: string
  multiPage?: boolean        // default: false
  depth?: number             // 0-5, default 1
  maxPages?: number          // 1-50, default 10
  concurrency?: number       // 1-5, default 3
  sameDomain?: 'hostname' | 'origin'  // default: 'hostname'
}
```
**Response: HTTP 202**
```json
{ "jobId": "...", "status": "running" }
```
Crawl runs fire-and-forget in background. The route handler never awaits it.

### GET `/api/progress/:id`
Returns `CrawlProgress` while job is running. Returns **404** when job is done.
Client should then fetch `/api/result/:id`.

```typescript
interface CrawlProgress {
  jobId: string
  phase: 'discovering' | 'crawling' | 'packaging' | 'done'
  currentUrl: string | null
  currentStep: string | null
  currentAsset: string | null
  pagesCompleted: number
  pagesTotal: number
  imagesCompleted: number
  startedAt: number   // Date.now()
  updatedAt: number
}
```

### GET `/api/result/:id`
```json
{ "job": { ...ParseJob } }
```

### GET `/api/history`
```json
{ "jobs": [ ...ParseJobSummary ] }
```

### GET `/api/download/:id/zip`
ZIP binary. Available when `status = 'success' | 'partial'`.

---

## Database schema

Table: `parse_jobs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | |
| `url` | TEXT | original input URL |
| `final_url` | TEXT | after redirects |
| `title` | TEXT | first page title |
| `status` | TEXT | `pending\|running\|success\|partial\|error` |
| `mode` | TEXT | `simple\|advance` for new jobs; legacy rows may still contain `auth\|interactive` |
| `markdown` | TEXT | legacy single-page markdown |
| `images` | TEXT | legacy JSON `JobImage[]` |
| `pages` | TEXT | JSON `PageResult[]` |
| `summary` | TEXT | human-readable description |
| `page_count` | INTEGER | successfully parsed pages |
| `image_count` | INTEGER | total downloaded images |
| `error` | TEXT | |
| `created_at` | INTEGER | Unix ms |

DB migrations use `try { ALTER TABLE ... ADD COLUMN } catch {}` — safe on existing DBs.

---

## Key types (lib/types.ts)

```typescript
interface PageResult {
  url: string
  finalUrl: string
  title: string | null
  depth: number
  parentUrl: string | null
  status: 'success' | 'error' | 'timeout' | 'skipped'
  filename: string      // "page-001.md"
  images: PageImage[]
  error?: string
}

interface CrawlParams {
  url: string
  mode: 'simple' | 'advance'
  multiPage: boolean
  depth: number
  maxPages: number
  concurrency: number
  sameDomain: 'hostname' | 'origin'
  cookies?: string
  storageState?: string
  waitSelector?: string
}
```

---

## Data directory layout (runtime, gitignored)

```
data/
  db.sqlite
  pages/{jobId}/page-001.md ...
  images/{jobId}/page-001-img-000.jpg ...
```

ZIP archive structure:
```
{slug}.zip
  manifest.json
  sitemap.json
  pages/page-001.md ...
  images/page-001-img-000.jpg ...
```

Always use `path.join(process.cwd(), 'data', ...)`. CWD is `/app` in Docker.

---

## Security model

- **IP whitelist**: `ALLOWED_IPS` env var (comma-separated). Enforced in `proxy.ts`.
- **Sessions**: eternal `iron-session` cookie, auto-created on first allowed-IP visit.
- Non-allowed IPs → redirect `/access-denied`.
- Docker: bridge network IP ≠ `127.0.0.1`. For curl testing through Docker: `-H "x-forwarded-for: 127.0.0.1"`.

---

## Environment variables

```bash
PLAYWRIGHT_SERVICE_URL=http://localhost:3001    # http://playwright-service:3001 in Docker
ALLOWED_IPS=127.0.0.1,::1
SESSION_SECRET=<32+ char random string>
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## Local dev

```bash
npm run dev   # concurrently: playwright-service (port 3001) + next dev (port 3000)
```

Kill stuck ports: `lsof -ti :3000 | xargs kill -9`

---

## Docker

```bash
docker compose up -d
docker compose build web-parser             # ~30s, for app code changes
docker compose build playwright-service     # slow, only when scraper.ts changes
```

- `playwright-service`: `mcr.microsoft.com/playwright:v1.50.0-jammy`, ~1.5GB
- `web-parser`: `node:22-slim`, fast rebuild

---

## Deployment (Railway)

Two separate Railway services. `railway.json` configures Dockerfile builder + healthcheck. Persistent volume at `/app/data`. Set env vars in Railway dashboard.

---

## Crawler behavior (lib/crawler.ts)

- BFS queue, processes pages in batches of `concurrency`
- **Per-page timeout**: 30s via `Promise.race`
- **Global job timeout**: 5 min via `setTimeout` + `aborted` flag
- On timeout: completed pages saved, ZIP built from partial results, `status = 'partial'`
- Link filtering (`lib/links.ts`): same domain, skips PDF/ZIP/image/auth paths, normalizes URLs

---

## UI design

- Minimal white Apple-inspired, light theme only
- Tailwind CSS v4 utilities (no `tailwind.config.js`)
- No emojis in UI text (SitemapTree status icons are the exception)
- Result page: no markdown preview — summary + SitemapTree + archive stats + Download ZIP
- History: summary, page_count, image_count per job

---

## Common pitfalls

1. **`params` is async**: `const { id } = await params` in route handlers and page components.
2. **`proxy.ts` not `middleware.ts`**: export `proxy`, not `middleware`.
3. **Fire-and-forget**: never `await` the crawl call in `/api/parse` route handler.
4. **Progress store is in-memory**: restarts clear in-progress jobs. Intentional.
5. **`data/` path**: use `process.cwd()` — it's `/app` in Docker, the Next.js project root locally.
6. **Zod v4**: this project uses `zod@^4`. The API changed from v3 — `z.string().min(1)` still works but `z.object().strict()` is `z.strictObject()`.
