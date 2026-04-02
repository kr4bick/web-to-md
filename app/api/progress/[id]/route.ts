import { getProgress } from '@/lib/progress'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const progress = getProgress(id)
  if (!progress) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  return Response.json(progress)
}
