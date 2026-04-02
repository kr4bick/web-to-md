'use client'

import { useCallback, useState } from 'react'
import type { ParseJob, ParseMode } from '@/lib/types'
import ProgressView from './ProgressView'
import ResultView from './ResultView'

type SameDomainMode = 'hostname' | 'origin'

export default function ParseForm() {
  const [url, setUrl] = useState('')
  const [mode, setMode] = useState<ParseMode>('simple')
  const [cookies, setCookies] = useState('')
  const [storageState, setStorageState] = useState('')
  const [waitSelector, setWaitSelector] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [multiPage, setMultiPage] = useState(false)
  const [depth, setDepth] = useState(1)
  const [maxPages, setMaxPages] = useState(10)
  const [concurrency, setConcurrency] = useState(3)
  const [sameDomain, setSameDomain] = useState<SameDomainMode>('hostname')

  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiProvider, setAiProvider] = useState<'gemini' | 'claude'>('gemini')
  const [aiTimeoutSecs, setAiTimeoutSecs] = useState(60)
  const [aiConcurrency, setAiConcurrency] = useState(2)
  const [aiPromptError, setAiPromptError] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [result, setResult] = useState<ParseJob | null>(null)
  const isAdvancedMode = mode === 'advance'
  const isInterfaceLocked = loading || jobId !== null

  const handleComplete = useCallback((job: ParseJob) => {
    setLoading(false)
    setJobId(null)
    setResult(job)
  }, [])

  function handleModeChange(nextMode: ParseMode) {
    setMode(nextMode)
    setShowAdvanced(nextMode === 'advance')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isInterfaceLocked) return

    // Client-side AI prompt validation
    if (isAdvancedMode && aiEnabled && !aiPrompt.trim()) {
      setAiPromptError('Prompt is required when AI post-processing is enabled.')
      return
    }
    setAiPromptError(null)

    setLoading(true)
    setError(null)
    setResult(null)
    setJobId(null)

    const body: Record<string, unknown> = { url, mode }
    if (isAdvancedMode) {
      if (cookies) body.cookies = cookies
      if (storageState) body.storageState = storageState
      if (waitSelector) body.waitSelector = waitSelector

      if (multiPage) {
        body.multiPage = true
        body.depth = depth
        body.maxPages = maxPages
        body.concurrency = concurrency
        body.sameDomain = sameDomain
      }

      if (aiEnabled) {
        body.aiEnabled = true
        body.aiPrompt = aiPrompt
        body.aiProvider = aiProvider
        body.aiTimeoutSecs = aiTimeoutSecs
        body.aiConcurrency = aiConcurrency
      }
    }

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 202) {
        const data = await res.json()
        setJobId(data.jobId)
        setLoading(false)
        return
      }

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
      <form
        onSubmit={handleSubmit}
        aria-busy={isInterfaceLocked}
        className={`space-y-4 transition-opacity ${isInterfaceLocked ? 'opacity-60' : ''}`}
      >
        <fieldset disabled={isInterfaceLocked} className="space-y-4">
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
              onChange={(e) => handleModeChange(e.target.value as ParseMode)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent w-full bg-white"
            >
              <option value="simple">Simple</option>
              <option value="advance">Advance</option>
            </select>
          </div>

          {isAdvancedMode && (
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
                  {/* Multi-page crawl */}
                  <div className="flex items-center gap-2">
                    <input
                      id="multiPage"
                      type="checkbox"
                      checked={multiPage}
                      onChange={(e) => setMultiPage(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    <label htmlFor="multiPage" className="text-sm font-medium text-gray-700">
                      Multi-page crawl
                    </label>
                  </div>

                  {multiPage && (
                    <div className="ml-6 space-y-4 border-l border-gray-200 pl-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <label htmlFor="depth" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Depth
                          </label>
                          <input
                            id="depth"
                            type="number"
                            min={1}
                            max={5}
                            value={depth}
                            onChange={(e) => setDepth(Number(e.target.value))}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent w-full"
                          />
                        </div>
                        <div>
                          <label htmlFor="maxPages" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Max pages
                          </label>
                          <input
                            id="maxPages"
                            type="number"
                            min={1}
                            max={50}
                            value={maxPages}
                            onChange={(e) => setMaxPages(Number(e.target.value))}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent w-full"
                          />
                        </div>
                        <div>
                          <label htmlFor="concurrency" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Concurrency
                          </label>
                          <input
                            id="concurrency"
                            type="number"
                            min={1}
                            max={5}
                            value={concurrency}
                            onChange={(e) => setConcurrency(Number(e.target.value))}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent w-full"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="sameDomain" className="block text-sm font-medium text-gray-700 mb-1.5">
                          Same domain mode
                        </label>
                        <select
                          id="sameDomain"
                          value={sameDomain}
                          onChange={(e) => setSameDomain(e.target.value as SameDomainMode)}
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent w-full bg-white"
                        >
                          <option value="hostname">same hostname</option>
                          <option value="origin">same origin</option>
                        </select>
                      </div>
                    </div>
                  )}

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

                  {/* AI post-processing */}
                  <div className="pt-2 border-t border-gray-100 space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        id="aiEnabled"
                        type="checkbox"
                        checked={aiEnabled}
                        onChange={(e) => {
                          setAiEnabled(e.target.checked)
                          if (!e.target.checked) setAiPromptError(null)
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                      <label htmlFor="aiEnabled" className="text-sm font-medium text-gray-700">
                        Use AI post-processing
                      </label>
                    </div>

                    {aiEnabled && (
                      <div className="ml-6 space-y-4 border-l border-gray-200 pl-4">
                        <div>
                          <label htmlFor="aiPrompt" className="block text-sm font-medium text-gray-700 mb-1.5">
                            AI prompt
                          </label>
                          <textarea
                            id="aiPrompt"
                            value={aiPrompt}
                            onChange={(e) => {
                              setAiPrompt(e.target.value)
                              if (e.target.value.trim()) setAiPromptError(null)
                            }}
                            placeholder="Clean this markdown and keep only the main content."
                            rows={3}
                            className={`border rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent placeholder:text-gray-400 w-full ${aiPromptError ? 'border-red-400' : 'border-gray-300'}`}
                          />
                          {aiPromptError && (
                            <p className="mt-1 text-xs text-red-500">{aiPromptError}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div>
                            <label htmlFor="aiProvider" className="block text-sm font-medium text-gray-700 mb-1.5">
                              AI provider
                            </label>
                            <select
                              id="aiProvider"
                              value={aiProvider}
                              onChange={(e) => setAiProvider(e.target.value as 'gemini' | 'claude')}
                              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent w-full bg-white"
                            >
                              <option value="gemini">Gemini</option>
                              <option value="claude">Claude</option>
                            </select>
                          </div>

                          <div>
                            <label htmlFor="aiTimeoutSecs" className="block text-sm font-medium text-gray-700 mb-1.5">
                              Timeout (sec)
                            </label>
                            <input
                              id="aiTimeoutSecs"
                              type="number"
                              min={10}
                              max={300}
                              value={aiTimeoutSecs}
                              onChange={(e) => setAiTimeoutSecs(Number(e.target.value))}
                              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent w-full"
                            />
                          </div>

                          <div>
                            <label htmlFor="aiConcurrency" className="block text-sm font-medium text-gray-700 mb-1.5">
                              Max parallel
                            </label>
                            <input
                              id="aiConcurrency"
                              type="number"
                              min={1}
                              max={5}
                              value={aiConcurrency}
                              onChange={(e) => setAiConcurrency(Number(e.target.value))}
                              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent w-full"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isInterfaceLocked}
            className="bg-gray-900 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Starting…' : jobId ? 'Parsing…' : 'Parse'}
          </button>
        </fieldset>
      </form>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {jobId && <ProgressView jobId={jobId} onComplete={handleComplete} />}

      {result && <ResultView job={result} />}
    </div>
  )
}
