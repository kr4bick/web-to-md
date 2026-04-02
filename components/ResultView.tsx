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
  created_at: number
}

export default function ResultView({ job }: { job: ParseJob }) {
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview')
  const displayUrl = job.final_url ?? job.url

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-100">{job.title ?? 'Untitled'}</h2>
        <a
          href={displayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 text-sm break-all"
        >
          {displayUrl}
        </a>
      </div>

      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'preview'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Preview
        </button>
        <button
          onClick={() => setActiveTab('raw')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'raw'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Raw Markdown
        </button>
      </div>

      <div>
        {activeTab === 'preview' ? (
          <MarkdownPreview markdown={job.markdown ?? ''} />
        ) : (
          <pre className="overflow-auto text-sm bg-gray-900 p-4 rounded">{job.markdown}</pre>
        )}
      </div>

      <div>
        <a
          href={`/api/download/${job.id}`}
          download
          className="inline-block px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 text-sm rounded transition-colors"
        >
          Download .md
        </a>
      </div>
    </div>
  )
}
