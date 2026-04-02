import ParseForm from '@/components/ParseForm'

export default function ParsePage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Parse a webpage</h1>
        <p className="text-sm text-gray-500 mb-8">Enter a URL to convert it to Markdown.</p>
        <ParseForm />
      </div>
    </main>
  )
}
