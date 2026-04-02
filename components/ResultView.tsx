'use client'

import SitemapTree from './SitemapTree'

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

export default function ResultView({ job }: { job: ParseJob }) {
  const pages: PageResult[] = (() => {
    try {
      return job.pages ? JSON.parse(job.pages) : []
    } catch {
      return []
    }
  })()

  const parsedCount = pages.filter((p) => p.status === 'parsed').length
  const mdCount = parsedCount || job.page_count || 0
  const imgCount = job.image_count || 0

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <div>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors break-all"
          >
            {job.url}
          </a>
        </div>
        {job.summary && (
          <p className="text-sm text-gray-700 leading-relaxed">{job.summary}</p>
        )}
        <div className="flex gap-4 text-sm text-gray-500">
          <span>
            <span className="font-medium text-gray-900">{mdCount}</span> pages parsed
          </span>
          <span>
            <span className="font-medium text-gray-900">{imgCount}</span> images downloaded
          </span>
        </div>
      </div>

      {/* Sitemap tree */}
      {pages.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Pages</h3>
          <SitemapTree pages={pages} />
        </div>
      )}

      {/* Archive info + Download */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4">
        <p className="text-sm text-gray-500">
          Archive contains{' '}
          <span className="text-gray-900 font-medium">{mdCount} markdown file{mdCount !== 1 ? 's' : ''}</span>
          {imgCount > 0 && (
            <>
              {' '}and{' '}
              <span className="text-gray-900 font-medium">{imgCount} image{imgCount !== 1 ? 's' : ''}</span>
            </>
          )}
        </p>
        <a
          href={`/api/download/${job.id}/zip`}
          download
          className="shrink-0 bg-gray-900 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-gray-700 transition-colors"
        >
          Download ZIP
        </a>
      </div>
    </div>
  )
}
