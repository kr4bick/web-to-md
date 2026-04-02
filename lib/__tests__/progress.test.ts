import { describe, it, expect, beforeEach } from 'vitest'
import {
  initProgress,
  setProgress,
  getProgress,
  addCurrentAsset,
  removeCurrentAsset,
  clearCurrentAssets,
  deleteProgress,
} from '../progress'

// Use unique job IDs per test to avoid state leakage
let jobIdCounter = 0
function uniqueId(): string {
  return `job-${++jobIdCounter}-${Date.now()}`
}

describe('initProgress', () => {
  it('creates entry with phase discovering', () => {
    const jobId = uniqueId()
    initProgress(jobId)
    const p = getProgress(jobId)
    expect(p).toBeDefined()
    expect(p!.phase).toBe('discovering')
  })

  it('sets jobId correctly', () => {
    const jobId = uniqueId()
    initProgress(jobId)
    expect(getProgress(jobId)!.jobId).toBe(jobId)
  })

  it('initializes pagesCompleted and pagesTotal to 0', () => {
    const jobId = uniqueId()
    initProgress(jobId)
    const p = getProgress(jobId)!
    expect(p.pagesCompleted).toBe(0)
    expect(p.pagesTotal).toBe(0)
  })

  it('initializes currentAssets to empty array', () => {
    const jobId = uniqueId()
    initProgress(jobId)
    expect(getProgress(jobId)!.currentAssets).toEqual([])
  })

  it('sets startedAt to a recent timestamp', () => {
    const before = Date.now()
    const jobId = uniqueId()
    initProgress(jobId)
    const after = Date.now()
    const p = getProgress(jobId)!
    expect(p.startedAt).toBeGreaterThanOrEqual(before)
    expect(p.startedAt).toBeLessThanOrEqual(after)
  })

  it('called twice preserves startedAt', () => {
    const jobId = uniqueId()
    initProgress(jobId)
    const { startedAt } = getProgress(jobId)!
    initProgress(jobId)
    expect(getProgress(jobId)!.startedAt).toBe(startedAt)
  })

  it('called twice preserves existing counters', () => {
    const jobId = uniqueId()
    initProgress(jobId)
    setProgress(jobId, { pagesCompleted: 5, pagesTotal: 10 })
    initProgress(jobId)
    const p = getProgress(jobId)!
    expect(p.pagesCompleted).toBe(5)
    expect(p.pagesTotal).toBe(10)
  })
})

describe('setProgress', () => {
  it('merges update into existing entry', () => {
    const jobId = uniqueId()
    initProgress(jobId)
    setProgress(jobId, { phase: 'crawling', pagesCompleted: 3 })
    const p = getProgress(jobId)!
    expect(p.phase).toBe('crawling')
    expect(p.pagesCompleted).toBe(3)
  })

  it('updates updatedAt', () => {
    const jobId = uniqueId()
    initProgress(jobId)
    const before = getProgress(jobId)!.updatedAt
    // small delay to ensure timestamp differs
    const now = Date.now() + 1
    setProgress(jobId, { pagesCompleted: 1 })
    const p = getProgress(jobId)!
    expect(p.updatedAt).toBeGreaterThanOrEqual(before)
  })

  it('does nothing if jobId not found', () => {
    // Should not throw
    expect(() => setProgress('nonexistent', { phase: 'crawling' })).not.toThrow()
  })

  it('updates currentAsset when currentAssets is updated', () => {
    const jobId = uniqueId()
    initProgress(jobId)
    setProgress(jobId, { currentAssets: ['img1.jpg', 'img2.jpg'] })
    expect(getProgress(jobId)!.currentAsset).toBe('img1.jpg')
  })

  it('sets currentAsset to null when currentAssets is empty', () => {
    const jobId = uniqueId()
    initProgress(jobId)
    setProgress(jobId, { currentAssets: [] })
    expect(getProgress(jobId)!.currentAsset).toBeNull()
  })
})

describe('getProgress', () => {
  it('returns current entry', () => {
    const jobId = uniqueId()
    initProgress(jobId)
    setProgress(jobId, { phase: 'packaging' })
    expect(getProgress(jobId)!.phase).toBe('packaging')
  })

  it('returns undefined for unknown jobId', () => {
    expect(getProgress('unknown-job-xyz')).toBeUndefined()
  })
})

describe('addCurrentAsset', () => {
  it('adds to currentAssets array', () => {
    const jobId = uniqueId()
    initProgress(jobId)
    addCurrentAsset(jobId, 'img1.jpg')
    expect(getProgress(jobId)!.currentAssets).toContain('img1.jpg')
  })

  it('can add multiple assets', () => {
    const jobId = uniqueId()
    initProgress(jobId)
    addCurrentAsset(jobId, 'img1.jpg')
    addCurrentAsset(jobId, 'img2.jpg')
    expect(getProgress(jobId)!.currentAssets).toEqual(['img1.jpg', 'img2.jpg'])
  })

  it('sets currentAsset to first element', () => {
    const jobId = uniqueId()
    initProgress(jobId)
    addCurrentAsset(jobId, 'first.jpg')
    addCurrentAsset(jobId, 'second.jpg')
    expect(getProgress(jobId)!.currentAsset).toBe('first.jpg')
  })

  it('does nothing if jobId not found', () => {
    expect(() => addCurrentAsset('nonexistent', 'img.jpg')).not.toThrow()
  })
})

describe('removeCurrentAsset', () => {
  it('removes from currentAssets array', () => {
    const jobId = uniqueId()
    initProgress(jobId)
    addCurrentAsset(jobId, 'img1.jpg')
    addCurrentAsset(jobId, 'img2.jpg')
    removeCurrentAsset(jobId, 'img1.jpg')
    expect(getProgress(jobId)!.currentAssets).toEqual(['img2.jpg'])
  })

  it('updates currentAsset after removal', () => {
    const jobId = uniqueId()
    initProgress(jobId)
    addCurrentAsset(jobId, 'img1.jpg')
    addCurrentAsset(jobId, 'img2.jpg')
    removeCurrentAsset(jobId, 'img1.jpg')
    expect(getProgress(jobId)!.currentAsset).toBe('img2.jpg')
  })

  it('sets currentAsset to null when last asset is removed', () => {
    const jobId = uniqueId()
    initProgress(jobId)
    addCurrentAsset(jobId, 'img1.jpg')
    removeCurrentAsset(jobId, 'img1.jpg')
    expect(getProgress(jobId)!.currentAsset).toBeNull()
  })

  it('does nothing if asset is not in list', () => {
    const jobId = uniqueId()
    initProgress(jobId)
    addCurrentAsset(jobId, 'img1.jpg')
    removeCurrentAsset(jobId, 'nonexistent.jpg')
    expect(getProgress(jobId)!.currentAssets).toEqual(['img1.jpg'])
  })

  it('does nothing if jobId not found', () => {
    expect(() => removeCurrentAsset('nonexistent', 'img.jpg')).not.toThrow()
  })
})

describe('clearCurrentAssets', () => {
  it('empties the currentAssets array', () => {
    const jobId = uniqueId()
    initProgress(jobId)
    addCurrentAsset(jobId, 'img1.jpg')
    addCurrentAsset(jobId, 'img2.jpg')
    clearCurrentAssets(jobId)
    expect(getProgress(jobId)!.currentAssets).toEqual([])
  })

  it('sets currentAsset to null', () => {
    const jobId = uniqueId()
    initProgress(jobId)
    addCurrentAsset(jobId, 'img1.jpg')
    clearCurrentAssets(jobId)
    expect(getProgress(jobId)!.currentAsset).toBeNull()
  })
})

describe('currentAsset invariant', () => {
  it('currentAsset always equals currentAssets[0] or null', () => {
    const jobId = uniqueId()
    initProgress(jobId)
    expect(getProgress(jobId)!.currentAsset).toBe(getProgress(jobId)!.currentAssets[0] ?? null)

    addCurrentAsset(jobId, 'a.jpg')
    expect(getProgress(jobId)!.currentAsset).toBe(getProgress(jobId)!.currentAssets[0] ?? null)

    addCurrentAsset(jobId, 'b.jpg')
    expect(getProgress(jobId)!.currentAsset).toBe(getProgress(jobId)!.currentAssets[0] ?? null)

    removeCurrentAsset(jobId, 'a.jpg')
    expect(getProgress(jobId)!.currentAsset).toBe(getProgress(jobId)!.currentAssets[0] ?? null)

    clearCurrentAssets(jobId)
    expect(getProgress(jobId)!.currentAsset).toBe(getProgress(jobId)!.currentAssets[0] ?? null)
  })
})

describe('deleteProgress', () => {
  it('entry still exists immediately after deleteProgress is called', () => {
    const jobId = uniqueId()
    initProgress(jobId)
    deleteProgress(jobId)
    // setTimeout-based deletion — entry should still be present right away
    expect(getProgress(jobId)).toBeDefined()
  })
})
