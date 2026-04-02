<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project documentation

For full architecture, API contract, DB schema, types, and common pitfalls — read **CODEX.md** in this directory.

# Testing rules

**MANDATORY — always follow these rules:**

1. **After any code change** — run the full test suite before finishing:
   ```bash
   npm run test:run
   ```
   Do not consider a task complete if tests are failing.

2. **When adding a new lib function** — add unit tests in `lib/__tests__/<filename>.test.ts`.

3. **When adding or modifying a component** — add/update UI tests in `components/__tests__/<ComponentName>.test.tsx`.

4. **When adding a new API route** — at minimum add a unit test for the business logic it calls (in `lib/__tests__/`).

5. **Test file location rules:**
   - `lib/foo.ts` → `lib/__tests__/foo.test.ts`
   - `components/Foo.tsx` → `components/__tests__/Foo.test.tsx`

6. **Mocking rules:**
   - Mock `next/navigation`: `vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))`
   - Mock `fetch`: `vi.stubGlobal('fetch', vi.fn())`
   - Never mock `lib/db.ts` or `lib/progress.ts` in unit tests — test them directly

7. **Test quality bar:**
   - Unit tests must cover happy path + at least one edge/error case
   - UI tests must cover: initial render, user interaction, and any conditional rendering (error state, empty state, etc.)
