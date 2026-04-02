import Link from 'next/link'
import HistoryList from '@/components/HistoryList'

async function getHistory() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/history`,
    { cache: 'no-store' }
  )
  const data = await res.json()
  return data.jobs ?? []
}

export default async function HistoryPage() {
  const jobs = await getHistory()
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-gray-400 hover:text-white">
            ← Back
          </Link>
          <h1 className="text-3xl font-bold">History</h1>
        </div>
        <HistoryList jobs={jobs} />
      </div>
    </main>
  )
}
