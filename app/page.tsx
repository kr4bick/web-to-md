import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="bg-white">
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-24 pb-20 text-center">
        <h1 className="text-5xl font-semibold text-gray-900 tracking-tight mb-4">
          Web to Markdown
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
          Turn any webpage into clean Markdown. Works with JavaScript-heavy sites, authenticated pages, and dynamic content.
        </p>
        <Link
          href="/parse"
          className="inline-flex items-center bg-gray-900 text-white text-sm font-medium rounded-lg px-6 py-3 hover:bg-gray-700 transition-colors"
        >
          Start parsing
        </Link>
      </section>

      <div className="border-t border-gray-100" />

      {/* Why it exists */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-8">
          Why it exists
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            { title: 'AI workflows', desc: 'Feed clean Markdown directly into LLMs and RAG pipelines without HTML noise.' },
            { title: 'Documentation', desc: 'Export articles, docs, and references into portable Markdown files.' },
            { title: 'JS-heavy pages', desc: 'A real browser renders the page — JavaScript, lazy-load, infinite scroll all handled.' },
            { title: 'Authenticated content', desc: 'Pass cookies or session state to access pages behind login walls.' },
          ].map(item => (
            <div key={item.title} className="bg-gray-50 rounded-xl p-5">
              <div className="text-sm font-medium text-gray-900 mb-1">{item.title}</div>
              <div className="text-sm text-gray-500 leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-gray-100" />

      {/* How it works */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-8">
          How it works
        </h2>
        <ol className="space-y-4">
          {[
            'Paste a URL into the parser',
            'Optionally pass cookies or session state for authenticated pages',
            'A real Chromium browser opens and renders the page',
            'Main content is extracted and converted to clean Markdown',
            'Result is saved — download as .md or .zip with images',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-4">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-medium flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm text-gray-600 leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="border-t border-gray-100" />

      {/* What it can do */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-8">
          What it can do now
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            'Three parse modes: Simple, Auth, Interactive',
            'Cookie and storage state injection',
            'Auto-scroll and consent banner handling',
            'Image download and local path rewriting',
            'Export as .md or .zip with images',
            'Parse history with result viewer',
          ].map(item => (
            <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <div className="border-t border-gray-100" />

      {/* Planned improvements */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-8">
          Planned improvements
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            'Multi-page crawling',
            'Better auth flows',
            'Smarter content cleanup',
            'Diff between versions',
            'Scheduled parsing',
            'Proxy support',
            'More reliable iframe extraction',
          ].map(item => (
            <li key={item} className="flex items-center gap-2 text-sm text-gray-400">
              <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <div className="border-t border-gray-100" />

      {/* Footer CTA */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <Link
          href="/parse"
          className="inline-flex items-center bg-gray-900 text-white text-sm font-medium rounded-lg px-6 py-3 hover:bg-gray-700 transition-colors"
        >
          Start parsing
        </Link>
      </section>
    </main>
  )
}
