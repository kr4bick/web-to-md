export type ParseMode = 'simple' | 'auth' | 'interactive'
export type ParseStatus = 'pending' | 'success' | 'error'

export interface ParseJob {
  id: string
  url: string
  final_url: string | null
  title: string | null
  status: ParseStatus
  mode: ParseMode
  markdown: string | null
  error: string | null
  created_at: number
}

export interface ParseJobSummary {
  id: string
  url: string
  final_url: string | null
  title: string | null
  status: ParseStatus
  mode: ParseMode
  error: string | null
  created_at: number
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
}
