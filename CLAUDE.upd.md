# Claude Update Notes

Last updated: 2026-04-02

## Crawl Progress Contract

- `GET /api/progress/:id` returns the shared `CrawlProgress` shape from `lib/types.ts`.
- Do not expect frontend-only fields like `totalDiscovered`, `completed`, `failed`, `elapsedMs`, or `etaMs`.
- Real progress fields are:
  - `phase`: `'discovering' | 'crawling' | 'packaging' | 'done'`
  - `currentUrl`, `currentStep`, `currentAsset`
  - `pagesCompleted`, `pagesTotal`, `imagesCompleted`
  - `startedAt`, `updatedAt`
- UI should derive elapsed time from `Date.now() - startedAt` and ETA from completed vs total pages.

## Completion Handling

- `phase = 'done'` can appear before the final DB row is observed by the client.
- After `phase = 'done'` or progress `404`, poll `/api/result/:id` until job status is no longer `'pending'` or `'running'`.
- This avoids rendering an incomplete result because of the fire-and-forget crawl flow.

## Shared Type Truths

- `sameDomain` request values must be `'hostname' | 'origin'`.
- Human-readable labels like `"same hostname"` and `"same origin"` are UI labels only.
- Page statuses are `'success' | 'error' | 'timeout' | 'skipped'`.
- Do not use stale status names like `'parsed'` or `'failed'` in UI code.

## Page/Image Display

- `PageResult` stores images in `page.images`, not `imageCount`.
- Image count for display should be derived with:
  - `page.images.filter((image) => !image.skipped).length`
- Parsed page count should be derived from `status === 'success'`.

## Progress Store Behavior

- `initProgress(jobId)` may run more than once for the same job.
- Preserve `startedAt` and existing counters if the progress entry already exists.
- `imagesCompleted` must accumulate from the current progress entry, not from a hardcoded zero.
