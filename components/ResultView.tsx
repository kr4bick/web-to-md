'use client'

import { useState } from 'react'
import MarkdownPreview from './MarkdownPreview'

interface ParseJob {
  id: string
  url: string
  final_url: string | null
  title: string | null
  status: 'pending' | 'success' | 'error'
  mode: 'simple' | 'auth' | 'interactive'
  markdown: string | null
  error: string | null
  images: string | null
  created_at: number
}

export default function ResultView({ job }: { job: ParseJob }) {
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview')
  const displayUrl = job.final_url ?? job.url

  const hasImages = (() => {
    try {
      const imgs = job.images ? JSON.parse(job.images) : []
      return imgs.some((i: { skipped: boolean }) => !i.skipped)
    } catch { return false }
  })()

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-1">{job.title ?? 'Untitled'}</h2>
        <a
          href={displayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors break-all"
        >
          {displayUrl}
        </a>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'preview'
                ? 'text-gray-900 border-b-2 border-gray-900 -mb-px'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'raw'
                ? 'text-gray-900 border-b-2 border-gray-900 -mb-px'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Raw Markdown
          </button>
        </div>

        <div className="p-5">
          {activeTab === 'preview' ? (
            <MarkdownPreview markdown={job.markdown ?? ''} />
          ) : (
            <pre className="overflow-auto text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono leading-relaxed">{job.markdown}</pre>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <a
          href={`/api/download/${job.id}`}
          download
          className="bg-gray-900 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-gray-700 transition-colors"
        >
          Download .md
        </a>
        {hasImages && (
          <a
            href={`/api/download/${job.id}/zip`}
            download
            className="bg-white text-gray-700 text-sm font-medium rounded-lg px-4 py-2 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Download .zip
          </a>
        )}
      </div>
    </div>
  )
}
