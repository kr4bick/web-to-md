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
          <label htmlFor="url" className="block text-sm font-medium text-gray-300 mb-1">
            URL
          </label>
          <input
            id="url"
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="mode" className="block text-sm font-medium text-gray-300 mb-1">
            Mode
          </label>
          <select
            id="mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as ParseMode)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-gray-100 focus:outline-none focus:border-blue-500"
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
            className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            {showAdvanced ? '▾' : '▸'} Advanced options
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-3 pl-4 border-l border-gray-700">
              <div>
                <label htmlFor="cookies" className="block text-sm font-medium text-gray-300 mb-1">
                  Cookies
                </label>
                <textarea
                  id="cookies"
                  value={cookies}
                  onChange={(e) => setCookies(e.target.value)}
                  placeholder="session=abc; token=xyz"
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm font-mono"
                />
              </div>

              <div>
                <label htmlFor="storageState" className="block text-sm font-medium text-gray-300 mb-1">
                  Storage State (JSON)
                </label>
                <textarea
                  id="storageState"
                  value={storageState}
                  onChange={(e) => setStorageState(e.target.value)}
                  placeholder={'{"cookies":[],"origins":[]}'}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm font-mono"
                />
              </div>

              <div>
                <label htmlFor="waitSelector" className="block text-sm font-medium text-gray-300 mb-1">
                  Wait Selector
                </label>
                <input
                  id="waitSelector"
                  type="text"
                  value={waitSelector}
                  onChange={(e) => setWaitSelector(e.target.value)}
                  placeholder="#main-content"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm font-mono"
                />
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
        >
          Parse
        </button>
      </form>

      {loading && (
        <div className="flex items-center gap-3 text-gray-300">
          <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Parsing… this may take up to 60 seconds</span>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm">
          {error}
        </div>
      )}

      {result && <ResultView job={result} />}
    </div>
  )
}
