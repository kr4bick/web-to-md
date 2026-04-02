'use client'

import { useState, useCallback } from 'react'
import type { PageResult } from '@/lib/types'
import MarkdownModal from './MarkdownModal'

interface TreeNode {
  page: PageResult
  children: TreeNode[]
}

function buildTree(pages: PageResult[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  for (const page of pages) {
    nodeMap.set(page.url, { page, children: [] })
  }

  for (const page of pages) {
    const node = nodeMap.get(page.url)!
    if (page.parentUrl && nodeMap.has(page.parentUrl)) {
      nodeMap.get(page.parentUrl)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

function urlPath(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname + u.search || '/'
  } catch {
    return url
  }
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str
}

const statusIcon: Record<PageResult['status'], string> = {
  success: '✓',
  error: '✗',
  timeout: '⏱',
  skipped: '—',
}

const statusColor: Record<PageResult['status'], string> = {
  success: 'text-green-600',
  error: 'text-red-500',
  timeout: 'text-yellow-500',
  skipped: 'text-gray-400',
}

interface TreeNodeRowProps {
  node: TreeNode
  isLast: boolean
  prefix: string
  jobId: string
  onOpen: (filename: string) => void
}

function TreeNodeRow({ node, isLast, prefix, jobId, onOpen }: TreeNodeRowProps) {
  const { page, children } = node
  const label = truncate(page.summary ?? page.title ?? urlPath(page.url), 70)
  const imageCount = page.images.filter((image) => !image.skipped).length
  const connector = isLast ? '└─' : '├─'
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      const res = await fetch(`/api/page-md/${jobId}/${page.filename}`)
      if (!res.ok) return
      const text = await res.text()
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard errors are non-critical */ }
  }, [jobId, page.filename])

  return (
    <div>
      <div className="flex items-center gap-1.5 py-0.5 group">
        {prefix && (
          <span className="font-mono text-xs text-gray-300 select-none whitespace-pre">{prefix}{connector}</span>
        )}
        <span className={`font-mono text-xs shrink-0 ${statusColor[page.status]}`}>
          {statusIcon[page.status]}
        </span>
        <a
          href={page.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-700 hover:text-gray-900 hover:underline truncate"
          title={page.url}
        >
          {label}
        </a>
        {imageCount > 0 && (
          <span className="text-xs text-gray-400 shrink-0">{imageCount} img</span>
        )}
        {page.status === 'success' && (
          <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={handleCopy}
              title="Copy Markdown"
              className="text-gray-400 hover:text-gray-700 transition-colors text-xs px-1"
              aria-label="Copy Markdown"
            >
              {copied ? '✓' : '⎘'}
            </button>
            <button
              onClick={() => onOpen(page.filename)}
              title="Open Markdown"
              className="text-gray-400 hover:text-gray-700 transition-colors text-xs px-1"
              aria-label="Open Markdown"
            >
              ⊞
            </button>
          </span>
        )}
      </div>
      {children.length > 0 && (
        <div>
          {children.map((child, i) => (
            <TreeNodeRow
              key={child.page.url}
              node={child}
              isLast={i === children.length - 1}
              prefix={prefix + (isLast ? '   ' : '│  ')}
              jobId={jobId}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function SitemapTree({ pages, jobId }: { pages: PageResult[]; jobId: string }) {
  const [modalFilename, setModalFilename] = useState<string | null>(null)

  if (pages.length === 0) {
    return <p className="text-sm text-gray-400">No pages.</p>
  }

  const roots = buildTree(pages)

  return (
    <>
      <div className="font-mono bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto max-h-96 text-xs">
        {roots.map((node, i) => (
          <TreeNodeRow
            key={node.page.url}
            node={node}
            isLast={i === roots.length - 1}
            prefix=""
            jobId={jobId}
            onOpen={setModalFilename}
          />
        ))}
      </div>
      {modalFilename && (
        <MarkdownModal
          jobId={jobId}
          filename={modalFilename}
          onClose={() => setModalFilename(null)}
        />
      )}
    </>
  )
}
