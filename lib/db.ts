import Database from 'better-sqlite3'
import type { CreateJobParams, UpdateJobParams, ParseJob, ParseJobSummary } from './types'

const globalForDb = globalThis as unknown as { db: Database.Database | undefined }

function initDb(): Database.Database {
  const db = new Database(process.cwd() + '/data/db.sqlite')

  db.exec(`
    CREATE TABLE IF NOT EXISTS parse_jobs (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      final_url TEXT,
      title TEXT,
      status TEXT NOT NULL,
      mode TEXT NOT NULL,
      markdown TEXT,
      error TEXT,
      created_at INTEGER NOT NULL
    )
  `)

  return db
}

export function getDb(): Database.Database {
  if (!globalForDb.db) {
    globalForDb.db = initDb()
  }
  return globalForDb.db
}

export function createJob(params: CreateJobParams): void {
  const db = getDb()
  db.prepare(`
    INSERT INTO parse_jobs (id, url, mode, status, created_at)
    VALUES (@id, @url, @mode, 'pending', @created_at)
  `).run({ ...params, created_at: Date.now() })
}

export function updateJob(id: string, params: UpdateJobParams): void {
  const db = getDb()
  const fields = Object.keys(params)
    .map((key) => `${key} = @${key}`)
    .join(', ')
  db.prepare(`UPDATE parse_jobs SET ${fields} WHERE id = @id`).run({ ...params, id })
}

export function getJob(id: string): ParseJob | undefined {
  const db = getDb()
  return db.prepare('SELECT * FROM parse_jobs WHERE id = ?').get(id) as ParseJob | undefined
}

export function listJobs(): ParseJobSummary[] {
  const db = getDb()
  return db.prepare(`
    SELECT id, url, final_url, title, status, mode, error, created_at
    FROM parse_jobs
    ORDER BY created_at DESC
  `).all() as ParseJobSummary[]
}
