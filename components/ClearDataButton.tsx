'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ClearDataButton() {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    await fetch('/api/clear', { method: 'DELETE' })
    setLoading(false)
    setConfirming(false)
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Clear all data?</span>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Clearing…' : 'Yes, clear'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-sm text-gray-400 hover:text-red-500 transition-colors"
    >
      Clear all
    </button>
  )
}
