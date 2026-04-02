import { listJobs } from '@/lib/db'

export async function GET() {
  const jobs = listJobs()
  return Response.json({ jobs }, { status: 200 })
}
