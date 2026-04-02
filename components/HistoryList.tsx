'use client'

import Link from 'next/link'

type ParseStatus = 'pending' | 'success' | 'error'
type ParseMode = 'simple' | 'auth' | 'interactive'

interface ParseJobSummary {
  id: string
  url: string
  final_url: string | null
  title: string | null
  status: ParseStatus
  mode: ParseMode
  error: string | null
  created_at: number
}

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
  success: 'bg-green-900/50 text-green-300 border border-green-700',
  error: 'bg-red-900/50 text-red-300 border border-red-700',
  pending: 'bg-gray-700/50 text-gray-300 border border-gray-600',
}

export default function HistoryList({ jobs }: { jobs: ParseJobSummary[] }) {
  if (jobs.length === 0) {
    return <p className="text-gray-400">No history yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="text-gray-400 border-b border-gray-700">
            <th className="pb-3 pr-4 font-medium">URL</th>
            <th className="pb-3 pr-4 font-medium">Domain</th>
            <th className="pb-3 pr-4 font-medium">Mode</th>
            <th className="pb-3 pr-4 font-medium">Status</th>
            <th className="pb-3 pr-4 font-medium">Date</th>
            <th className="pb-3 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {jobs.map((job) => (
            <tr key={job.id} className="text-gray-300">
              <td className="py-3 pr-4 max-w-xs">
                <span title={job.title ?? job.url}>{truncate(job.url, 60)}</span>
              </td>
              <td className="py-3 pr-4 text-gray-400">{getDomain(job.url)}</td>
              <td className="py-3 pr-4">
                <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-200">
                  {job.mode}
                </span>
              </td>
              <td className="py-3 pr-4">
                <span className={`px-2 py-0.5 rounded text-xs ${statusStyles[job.status]}`}>
                  {job.status}
                </span>
              </td>
              <td className="py-3 pr-4 text-gray-400 whitespace-nowrap">
                {new Date(job.created_at).toLocaleString()}
              </td>
              <td className="py-3">
                <Link
                  href={`/result/${job.id}`}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded text-xs transition-colors"
                >
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
