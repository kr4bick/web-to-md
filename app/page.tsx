import ParseForm from '@/components/ParseForm'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Web Parser</h1>
        <p className="text-gray-400 mb-8">Parse any webpage to Markdown</p>
        <ParseForm />
      </div>
    </main>
  )
}
