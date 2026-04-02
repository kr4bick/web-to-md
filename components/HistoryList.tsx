'use client'

import Link from 'next/link'
import type { ParseJobSummary, ParseStatus, StoredParseMode } from '@/lib/types'

function getDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str
}

const statusStyles: Record<ParseStatus, string> = {
  success: 'bg-green-100 text-green-700',
  partial: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-600',
  pending: 'bg-gray-100 text-gray-500',
  running: 'bg-blue-100 text-blue-700',
}

function formatModeLabel(mode: StoredParseMode): string {
  switch (mode) {
    case 'advance':
      return 'advance'
    case 'interactive':
      return 'interactive'
    case 'auth':
      return 'auth'
    default:
      return 'simple'
  }
}

export default function HistoryList({ jobs }: { jobs: ParseJobSummary[] }) {
  if (jobs.length === 0) {
    return (
      <div className="flex justify-center">
        <Link
          href="/parse"
          className="inline-flex items-center bg-gray-900 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-gray-700 transition-colors"
        >
          Start parsing
        </Link>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">URL</th>
              <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Domain</th>
              <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Mode</th>
              <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Pages</th>
              <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Images</th>
              <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Date</th>
              <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide"></th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 max-w-xs">
                  <div>
                    <span className="text-gray-900" title={job.title ?? job.url}>{truncate(job.url, 55)}</span>
                    {job.summary && (
                      <p className="text-xs text-gray-400 mt-0.5">{truncate(job.summary, 80)}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{getDomain(job.url)}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-600">
                    {formatModeLabel(job.mode)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700 text-center">
                  {job.page_count != null ? job.page_count : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-700 text-center">
                  {job.image_count != null ? job.image_count : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-md text-xs ${statusStyles[job.status]}`}>
                    {job.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {new Date(job.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/result/${job.id}`}
                    className="bg-white text-gray-700 text-sm font-medium rounded-lg px-3 py-1.5 border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
