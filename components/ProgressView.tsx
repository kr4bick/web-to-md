'use client'

import { useEffect, useRef, useState } from 'react'
import type { CrawlProgress, ParseJob } from '@/lib/types'

interface ProgressViewProps {
  jobId: string
  onComplete: (job: ParseJob) => void
}

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function getElapsedMs(progress: CrawlProgress): number {
  const endTime = progress.phase === 'done' ? progress.updatedAt : Date.now()
  return Math.max(0, endTime - progress.startedAt)
}

function getEtaMs(progress: CrawlProgress, elapsedMs: number): number | null {
  if (progress.pagesCompleted <= 0 || progress.pagesTotal <= progress.pagesCompleted) {
    return null
  }

  const remainingPages = progress.pagesTotal - progress.pagesCompleted
  return Math.round((elapsedMs / progress.pagesCompleted) * remainingPages)
}

function getPhaseLabel(phase: CrawlProgress['phase']): string {
  switch (phase) {
    case 'discovering':
      return 'Discovering pages…'
    case 'packaging':
      return 'Packaging results…'
    case 'done':
      return 'Finishing up…'
    default:
      return 'Crawling in progress…'
  }
}

export default function ProgressView({ jobId, onComplete }: ProgressViewProps) {
  const [progress, setProgress] = useState<CrawlProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function tryComplete(): Promise<boolean> {
      const resultRes = await fetch(`/api/result/${jobId}`)
      if (!resultRes.ok) {
        return false
      }

      const data = await resultRes.json()
      const job: ParseJob = data.job ?? data
      if (job.status === 'pending' || job.status === 'running') {
        return false
      }

      if (intervalRef.current) clearInterval(intervalRef.current)
      onComplete(job)
      return true
    }

    async function poll() {
      try {
        const res = await fetch(`/api/progress/${jobId}`)

        if (res.status === 404) {
          await tryComplete()
          return
        }

        if (!res.ok) {
          setError('Progress check failed.')
          if (intervalRef.current) clearInterval(intervalRef.current)
          return
        }

        const data: CrawlProgress = await res.json()
        setProgress(data)

        if (data.phase === 'done') {
          await tryComplete()
        }
      } catch {
        setError('Network error while polling progress.')
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [jobId, onComplete])

  if (error) {
    return (
      <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
        {error}
      </div>
    )
  }

  const elapsedMs = progress ? getElapsedMs(progress) : 0
  const etaMs = progress ? getEtaMs(progress, elapsedMs) : null
  const pct =
    progress && progress.pagesTotal > 0
      ? Math.min(100, Math.round((progress.pagesCompleted / progress.pagesTotal) * 100))
      : null
  const pageLabel = progress
    ? progress.pagesTotal > 0
      ? `${progress.pagesCompleted} of ${progress.pagesTotal} pages`
      : 'Starting…'
    : 'Starting…'

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <svg
          className="animate-spin h-4 w-4 text-gray-400 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm font-medium text-gray-700">
          {progress ? getPhaseLabel(progress.phase) : 'Preparing crawl…'}
        </span>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
          <span>{pageLabel}</span>
          {pct !== null && <span>{pct}%</span>}
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          {pct !== null ? (
            <div
              className="h-full bg-gray-900 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          ) : (
            <div className="h-full bg-gray-300 rounded-full animate-pulse w-full" />
          )}
        </div>
      </div>

      {progress && (
        <div className="space-y-2 text-sm text-gray-600">
          {progress.currentUrl && (
            <div className="flex gap-2">
              <span className="text-gray-400 shrink-0 w-16">URL</span>
              <span className="truncate text-gray-700 font-mono text-xs">{progress.currentUrl}</span>
            </div>
          )}
          {progress.currentStep && (
            <div className="flex gap-2">
              <span className="text-gray-400 shrink-0 w-16">Step</span>
              <span className="text-gray-600">{progress.currentStep}</span>
            </div>
          )}
          {progress.currentAsset && (
            <div className="flex gap-2">
              <span className="text-gray-400 shrink-0 w-16">Asset</span>
              <span className="truncate text-gray-600 font-mono text-xs">{progress.currentAsset}</span>
            </div>
          )}
        </div>
      )}

      {progress && (
        <div className="flex items-center gap-6 text-xs text-gray-400 border-t border-gray-100 pt-4">
          <div>
            <span className="text-gray-500 font-medium">{formatMs(elapsedMs)}</span>
            <span className="ml-1">elapsed</span>
          </div>
          {etaMs != null && etaMs > 0 && (
            <div>
              <span className="text-gray-500 font-medium">{formatMs(etaMs)}</span>
              <span className="ml-1">~ remaining</span>
            </div>
          )}
          {progress.imagesCompleted > 0 && (
            <div>
              <span className="text-gray-500 font-medium">{progress.imagesCompleted}</span>
              <span className="ml-1">images downloaded</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
