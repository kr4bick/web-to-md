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
  page_count?: number
  image_count?: number
  summary?: string | null
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
  success: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-600',
  pending: 'bg-gray-100 text-gray-500',
}

export default function HistoryList({ jobs }: { jobs: ParseJobSummary[] }) {
  if (jobs.length === 0) {
    return <p className="text-sm text-gray-500">No history yet.</p>
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
                    {job.mode}
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
