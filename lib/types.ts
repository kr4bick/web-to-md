export type ParseMode = 'simple' | 'advance'
export type LegacyParseMode = 'auth' | 'interactive'
export type StoredParseMode = ParseMode | LegacyParseMode
export type ParseStatus = 'pending' | 'running' | 'success' | 'partial' | 'error'

// Single image within one page
export interface PageImage {
  originalUrl: string
  filename: string        // e.g. "page-001-img-000.jpg"
  skipped: boolean
  skipReason?: 'size_exceeded' | 'fetch_error'
}

// Result of parsing one page
export interface PageResult {
  url: string
  finalUrl: string
  title: string | null
  depth: number
  parentUrl: string | null
  status: 'success' | 'error' | 'timeout' | 'skipped'
  filename: string        // e.g. "page-001.md"
  images: PageImage[]
  error?: string
  summary?: string
  aiStatus?: 'success' | 'error' | 'timeout' | 'skipped'
  aiError?: string
}

// Sitemap tree node
export interface SitemapNode {
  url: string
  title: string | null
  summary?: string
  depth: number
  status: 'success' | 'error' | 'timeout' | 'skipped' | 'queued'
  filename: string | null
  children: SitemapNode[]
}

// Live progress (in-memory)
export interface CrawlProgress {
  jobId: string
  phase: 'discovering' | 'crawling' | 'packaging' | 'done'
  currentUrl: string | null
  currentStep: string | null
  currentAsset: string | null
  currentAssets: string[]
  pagesCompleted: number
  pagesTotal: number
  imagesCompleted: number
  aiPagesCompleted: number
  startedAt: number
  updatedAt: number
}

// Full parse job (DB row)
export interface ParseJob {
  id: string
  url: string
  final_url: string | null
  title: string | null
  status: ParseStatus
  mode: StoredParseMode
  markdown: string | null
  error: string | null
  images: string | null       // JSON JobImage[] — legacy single-page field
  pages: string | null        // JSON PageResult[]
  summary: string | null
  page_count: number
  image_count: number
  created_at: number
}

// Summary for list views (no markdown/pages)
export interface ParseJobSummary {
  id: string
  url: string
  final_url: string | null
  title: string | null
  status: ParseStatus
  mode: StoredParseMode
  error: string | null
  summary: string | null
  page_count: number
  image_count: number
  created_at: number
}

export interface JobImage {
  originalUrl: string
  filename: string       // e.g. "0.jpg", "1.png"
  skipped: boolean
  skipReason?: 'size_exceeded' | 'fetch_error'
}

export interface ScrapeParams {
  url: string
  mode: ParseMode
  cookies?: string
  storageState?: string
  waitSelector?: string
}

export interface ScrapeResult {
  html: string
  finalUrl: string
  title: string
}

export interface CrawlParams extends ScrapeParams {
  multiPage: boolean
  depth: number
  maxPages: number
  concurrency: number
  sameDomain: 'hostname' | 'origin'
  aiEnabled?: boolean
  aiPrompt?: string
  aiProvider?: 'gemini'
  aiTimeoutMs?: number
  aiConcurrency?: number
}

export interface CrawlResult {
  pages: PageResult[]
  status: 'success' | 'partial' | 'error'
  summary: string
  title: string | null
  finalUrl: string | null
}

export interface CreateJobParams {
  id: string
  url: string
  mode: ParseMode
}

export interface UpdateJobParams {
  final_url?: string
  title?: string
  status: ParseStatus
  markdown?: string
  error?: string
  images?: string
  pages?: string
  summary?: string
  page_count?: number
  image_count?: number
}
