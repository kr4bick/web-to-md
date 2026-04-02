'use client'

interface PageResult {
  url: string
  title?: string
  depth: number
  status: 'parsed' | 'failed' | 'timeout' | 'skipped'
  filename?: string
  imageCount: number
  parentUrl?: string
}

interface TreeNode {
  page: PageResult
  children: TreeNode[]
}

function buildTree(pages: PageResult[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  // Create all nodes first
  for (const page of pages) {
    nodeMap.set(page.url, { page, children: [] })
  }

  // Build tree by parentUrl relationships
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
  parsed: '✓',
  failed: '✗',
  timeout: '⏱',
  skipped: '—',
}

const statusColor: Record<PageResult['status'], string> = {
  parsed: 'text-green-600',
  failed: 'text-red-500',
  timeout: 'text-yellow-500',
  skipped: 'text-gray-400',
}

function TreeNodeRow({ node, isLast, prefix }: { node: TreeNode; isLast: boolean; prefix: string }) {
  const { page, children } = node
  const label = page.title ? truncate(page.title, 60) : truncate(urlPath(page.url), 60)
  const connector = isLast ? '└─' : '├─'

  return (
    <div>
      <div className="flex items-center gap-2 py-0.5 group">
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
        {page.imageCount > 0 && (
          <span className="text-xs text-gray-400 shrink-0">{page.imageCount} img</span>
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
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function SitemapTree({ pages }: { pages: PageResult[] }) {
  if (pages.length === 0) {
    return <p className="text-sm text-gray-400">No pages.</p>
  }

  const roots = buildTree(pages)

  return (
    <div className="font-mono bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto max-h-96 text-xs">
      {roots.map((node, i) => (
        <TreeNodeRow
          key={node.page.url}
          node={node}
          isLast={i === roots.length - 1}
          prefix=""
        />
      ))}
    </div>
  )
}
