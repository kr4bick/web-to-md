import Link from 'next/link'
import ResultView from '@/components/ResultView'

interface ParseJob {
  id: string
  url: string
  final_url: string | null
  title: string | null
  status: 'pending' | 'success' | 'error'
  mode: 'simple' | 'auth' | 'interactive'
  markdown: string | null
  error: string | null
  created_at: number
}

async function getJob(id: string): Promise<ParseJob | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/result/${id}`,
      { cache: 'no-store' }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.job ?? data ?? null
  } catch {
    return null
  }
}

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await getJob(id)

  if (!job) {
    return (
      <main className="min-h-screen bg-gray-950 text-gray-100 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/history" className="text-gray-400 hover:text-white">
              ← History
            </Link>
          </div>
          <p className="text-red-400">Job not found.</p>
        </div>
      </main>
    )
  }

  if (job.status === 'error') {
    return (
      <main className="min-h-screen bg-gray-950 text-gray-100 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/history" className="text-gray-400 hover:text-white">
              ← History
            </Link>
            <h1 className="text-3xl font-bold">Result</h1>
          </div>
          <div className="px-4 py-3 bg-red-900/50 border border-red-700 rounded text-red-300">
            {job.error ?? 'Parse failed.'}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/history" className="text-gray-400 hover:text-white">
            ← History
          </Link>
          <h1 className="text-3xl font-bold">Result</h1>
        </div>
        <ResultView job={job} />
      </div>
    </main>
  )
}
