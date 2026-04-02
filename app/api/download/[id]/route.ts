import { getJob } from '@/lib/db'

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const job = getJob(id)

  if (!job) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  if (!job.markdown || job.status !== 'success') {
    return Response.json({ error: 'No markdown available' }, { status: 400 })
  }

  const filename =
    job.title && job.title.trim().length > 0
      ? slugify(job.title) || `parse-${id}`
      : `parse-${id}`

  return new Response(job.markdown, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.md"`,
    },
  })
}
