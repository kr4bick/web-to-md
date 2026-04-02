'use client'

import ReactMarkdown from 'react-markdown'

export default function MarkdownPreview({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  )
}
