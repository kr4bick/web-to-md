import fs from 'fs'
import path from 'path'
import { clearAllJobs } from '@/lib/db'

export async function DELETE() {
  clearAllJobs()

  const dataDir = path.join(process.cwd(), 'data')
  for (const dir of ['images', 'pages']) {
    const target = path.join(dataDir, dir)
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true })
    }
  }

  return Response.json({ ok: true })
}
