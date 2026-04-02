'use client'

import { useEffect, useState } from 'react'

interface MarkdownModalProps {
  jobId: string
  filename: string
  onClose: () => void
}

export default function MarkdownModal({ jobId, filename, onClose }: MarkdownModalProps) {
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/page-md/${jobId}/${filename}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load (${res.status})`)
        return res.text()
      })
      .then(setContent)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [jobId, filename])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
          <span className="text-sm font-medium text-gray-700 font-mono">{filename}</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="overflow-auto p-5 flex-1">
          {error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : content === null ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words font-mono leading-relaxed">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
