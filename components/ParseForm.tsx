'use client'

import { useState } from 'react'
import ResultView from './ResultView'

type ParseMode = 'simple' | 'auth' | 'interactive'

interface ParseJob {
  id: string
  url: string
  final_url: string | null
  title: string | null
  status: 'pending' | 'success' | 'error'
  mode: ParseMode
  markdown: string | null
  error: string | null
  images: string | null
  created_at: number
}

export default function ParseForm() {
  const [url, setUrl] = useState('')
  const [mode, setMode] = useState<ParseMode>('simple')
  const [cookies, setCookies] = useState('')
  const [storageState, setStorageState] = useState('')
  const [waitSelector, setWaitSelector] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ParseJob | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    const body: Record<string, string> = { url, mode }
    if (cookies) body.cookies = cookies
    if (storageState) body.storageState = storageState
    if (waitSelector) body.waitSelector = waitSelector

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        const msg = data?.error ?? data?.message ?? 'An error occurred while parsing.'
        setError(msg)
        setLoading(false)
        return
      }

      setResult(data.job ?? data)
      setLoading(false)
    } catch {
      setError('Failed to connect to the server.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1.5">
            URL
          </label>
          <input
            id="url"
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent placeholder:text-gray-400 w-full"
          />
        </div>

        <div>
          <label htmlFor="mode" className="block text-sm font-medium text-gray-700 mb-1.5">
            Mode
          </label>
          <select
            id="mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as ParseMode)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent w-full bg-white"
          >
            <option value="simple">Simple</option>
            <option value="auth">Auth</option>
            <option value="interactive">Interactive</option>
          </select>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1"
          >
            <span>{showAdvanced ? '▾' : '▸'}</span>
            <span>Advanced options</span>
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4 pl-4 border-l border-gray-200">
              <div>
                <label htmlFor="cookies" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Cookies
                </label>
                <textarea
                  id="cookies"
                  value={cookies}
                  onChange={(e) => setCookies(e.target.value)}
                  placeholder="session=abc; token=xyz"
                  rows={2}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent placeholder:text-gray-400 w-full font-mono"
                />
              </div>

              <div>
                <label htmlFor="storageState" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Storage State (JSON)
                </label>
                <textarea
                  id="storageState"
                  value={storageState}
                  onChange={(e) => setStorageState(e.target.value)}
                  placeholder={'{"cookies":[],"origins":[]}'}
                  rows={3}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent placeholder:text-gray-400 w-full font-mono"
                />
              </div>

              <div>
                <label htmlFor="waitSelector" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Wait Selector
                </label>
                <input
                  id="waitSelector"
                  type="text"
                  value={waitSelector}
                  onChange={(e) => setWaitSelector(e.target.value)}
                  placeholder="#main-content"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent placeholder:text-gray-400 w-full font-mono"
                />
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-gray-900 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Parse
        </button>
      </form>

      {loading && (
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="animate-spin h-4 w-4 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Parsing — this may take up to 60 seconds</span>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {result && <ResultView job={result} />}
    </div>
  )
}
