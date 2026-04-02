import fs from 'fs'
import path from 'path'
import { getJob } from '@/lib/db'

const FILENAME_RE = /^page-\d{3}\.md$/

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; filename: string }> },
) {
  const { id, filename } = await params

  if (!FILENAME_RE.test(filename)) {
    return Response.json({ error: 'Invalid filename' }, { status: 400 })
  }

  const job = getJob(id)
  if (!job) return Response.json({ error: 'Not found' }, { status: 404 })

  const filePath = path.join(process.cwd(), 'data', 'pages', id, filename)

  if (!fs.existsSync(filePath)) {
    return Response.json({ error: 'Page not found' }, { status: 404 })
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  return new Response(content, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
}
