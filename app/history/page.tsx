import Link from 'next/link'
import HistoryList from '@/components/HistoryList'
import ClearDataButton from '@/components/ClearDataButton'

async function getHistory() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const res = await fetch(`${base}/api/history`, { cache: 'no-store' })
  const data = await res.json()
  return data.jobs ?? []
}

export default async function HistoryPage() {
  const jobs = await getHistory()
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            ← Back
          </Link>
        </div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">History</h1>
          <ClearDataButton />
        </div>
        <HistoryList jobs={jobs} />
      </div>
    </main>
  )
}
