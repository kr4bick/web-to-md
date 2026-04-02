import type { CrawlProgress } from './types'

const store = new Map<string, CrawlProgress>()

export function initProgress(jobId: string): void {
  store.set(jobId, {
    jobId,
    phase: 'discovering',
    currentUrl: null,
    currentStep: null,
    currentAsset: null,
    pagesCompleted: 0,
    pagesTotal: 0,
    imagesCompleted: 0,
    startedAt: Date.now(),
    updatedAt: Date.now(),
  })
}

export function setProgress(jobId: string, update: Partial<CrawlProgress>): void {
  const current = store.get(jobId)
  if (!current) return
  store.set(jobId, { ...current, ...update, updatedAt: Date.now() })
}

export function getProgress(jobId: string): CrawlProgress | undefined {
  return store.get(jobId)
}

export function deleteProgress(jobId: string): void {
  // Keep for 30s so client can see phase='done' before cleanup
  setTimeout(() => store.delete(jobId), 30_000)
}
