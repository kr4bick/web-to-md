'use client'
import ReactMarkdown from 'react-markdown'

export default function MarkdownPreview({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-sm prose-gray max-w-none">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  )
}
