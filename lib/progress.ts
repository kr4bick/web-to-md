import type { CrawlProgress } from './types'

const store = new Map<string, CrawlProgress>()

function getPrimaryAsset(currentAssets: string[]): string | null {
  return currentAssets[0] ?? null
}

export function initProgress(jobId: string): void {
  const existing = store.get(jobId)
  const currentAssets = existing?.currentAssets ?? []

  store.set(jobId, {
    jobId,
    phase: 'discovering',
    currentUrl: null,
    currentStep: null,
    currentAsset: getPrimaryAsset(currentAssets),
    currentAssets,
    pagesCompleted: existing?.pagesCompleted ?? 0,
    pagesTotal: existing?.pagesTotal ?? 0,
    imagesCompleted: existing?.imagesCompleted ?? 0,
    startedAt: existing?.startedAt ?? Date.now(),
    updatedAt: Date.now(),
  })
}

export function setProgress(jobId: string, update: Partial<CrawlProgress>): void {
  const current = store.get(jobId)
  if (!current) return

  const next = { ...current, ...update, updatedAt: Date.now() }
  if (update.currentAssets) {
    next.currentAsset = getPrimaryAsset(update.currentAssets)
  }

  store.set(jobId, next)
}

export function getProgress(jobId: string): CrawlProgress | undefined {
  return store.get(jobId)
}

export function addCurrentAsset(jobId: string, asset: string): void {
  const current = store.get(jobId)
  if (!current) return

  const currentAssets = [...current.currentAssets, asset]
  setProgress(jobId, {
    currentAssets,
    currentAsset: getPrimaryAsset(currentAssets),
  })
}

export function removeCurrentAsset(jobId: string, asset: string): void {
  const current = store.get(jobId)
  if (!current) return

  const index = current.currentAssets.indexOf(asset)
  if (index === -1) return

  const currentAssets = current.currentAssets.filter((_, idx) => idx !== index)
  setProgress(jobId, {
    currentAssets,
    currentAsset: getPrimaryAsset(currentAssets),
  })
}

export function clearCurrentAssets(jobId: string): void {
  setProgress(jobId, {
    currentAsset: null,
    currentAssets: [],
  })
}

export function deleteProgress(jobId: string): void {
  // Keep for 30s so client can see phase='done' before cleanup
  setTimeout(() => store.delete(jobId), 30_000)
}
