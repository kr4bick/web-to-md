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
  images: string | null
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
      <main className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="mb-8">
            <Link href="/history" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              ← History
            </Link>
          </div>
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            Job not found.
          </div>
        </div>
      </main>
    )
  }

  if (job.status === 'error') {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="mb-8">
            <Link href="/history" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              ← History
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Result</h1>
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {job.error ?? 'Parse failed.'}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/history" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            ← History
          </Link>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Result</h1>
        <ResultView job={job} />
      </div>
    </main>
  )
}
