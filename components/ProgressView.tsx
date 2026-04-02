'use client'

import { useEffect, useRef, useState } from 'react'

interface CrawlProgress {
  phase: 'crawling' | 'done' | 'error'
  totalDiscovered: number
  completed: number
  failed: number
  currentUrl?: string
  currentStep?: string
  currentAsset?: string
  elapsedMs: number
  etaMs?: number
}

interface PageResult {
  url: string
  title?: string
  depth: number
  status: 'parsed' | 'failed' | 'timeout' | 'skipped'
  filename?: string
  imageCount: number
  parentUrl?: string
}

interface ParseJob {
  id: string
  url: string
  status: string
  created_at: number
  markdown: string | null
  pages: string | null
  summary: string | null
  page_count: number
  image_count: number
}

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

export default function ProgressView({ jobId, onComplete }: ProgressViewProps) {
  const [progress, setProgress] = useState<CrawlProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch(`/api/progress/${jobId}`)

        if (res.status === 404) {
          // Job done — fetch result
          if (intervalRef.current) clearInterval(intervalRef.current)
          const resultRes = await fetch(`/api/result/${jobId}`)
          if (!resultRes.ok) {
            setError('Failed to load result.')
            return
          }
          const data = await resultRes.json()
          onComplete(data.job ?? data)
          return
        }

        if (!res.ok) {
          setError('Progress check failed.')
          if (intervalRef.current) clearInterval(intervalRef.current)
          return
        }

        const data: CrawlProgress = await res.json()
        setProgress(data)

        if (data.phase === 'done' || data.phase === 'error') {
          if (intervalRef.current) clearInterval(intervalRef.current)
          if (data.phase === 'done') {
            const resultRes = await fetch(`/api/result/${jobId}`)
            if (resultRes.ok) {
              const result = await resultRes.json()
              onComplete(result.job ?? result)
            }
          } else {
            setError('Crawl encountered an error.')
          }
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

  const pct =
    progress && progress.totalDiscovered > 0
      ? Math.min(100, Math.round((progress.completed / progress.totalDiscovered) * 100))
      : null

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
        <span className="text-sm font-medium text-gray-700">Crawling in progress…</span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
          <span>
            {progress
              ? `${progress.completed} of ${progress.totalDiscovered > 0 ? progress.totalDiscovered : '?'} pages`
              : 'Starting…'}
          </span>
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

      {/* Details */}
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

      {/* Time */}
      {progress && (
        <div className="flex items-center gap-6 text-xs text-gray-400 border-t border-gray-100 pt-4">
          <div>
            <span className="text-gray-500 font-medium">{formatMs(progress.elapsedMs)}</span>
            <span className="ml-1">elapsed</span>
          </div>
          {progress.etaMs != null && progress.etaMs > 0 && (
            <div>
              <span className="text-gray-500 font-medium">{formatMs(progress.etaMs)}</span>
              <span className="ml-1">~ remaining</span>
            </div>
          )}
          {progress.failed > 0 && (
            <div className="text-red-400">
              {progress.failed} failed
            </div>
          )}
        </div>
      )}
    </div>
  )
}
