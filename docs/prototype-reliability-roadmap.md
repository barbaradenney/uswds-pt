# Prototype Reliability Roadmap

Reference document for the multi-tier reliability strategy for USWDS-PT prototypes.

---

## Tier 1: IndexedDB Crash Recovery (Implemented)

**Goal:** Protect against browser crashes, tab kills, and network save failures.

**How it works:**
- A debounced snapshot (editor project data + HTML) is written to IndexedDB every 3 seconds during editing
- Snapshots are also flushed on `beforeunload`, `visibilitychange`, and component unmount
- On next load, if a snapshot exists that is newer than the last server save, a recovery banner is shown
- User can choose to **Restore** (loads snapshot into editor) or **Dismiss** (deletes snapshot)
- After a successful server save, the recovery snapshot is automatically cleared

**Key files:**
- `packages/editor/src/lib/indexeddb.ts` -- Promise-based IndexedDB wrapper
- `packages/editor/src/hooks/useCrashRecovery.ts` -- Recovery hook (debounce, lifecycle, restore/dismiss)
- `packages/editor/src/components/RecoveryBanner.tsx` -- Warning banner UI

**Edge cases handled:**
| Case | Handling |
|------|----------|
| Two tabs, different prototypes | Each gets its own IndexedDB key |
| Two tabs, same prototype | Last writer wins (acceptable for crash recovery) |
| New unsaved prototype | Key: `unsaved-<editorKey>`, migrated to slug after first save |
| Private browsing / IndexedDB disabled | `isIndexedDBAvailable()` returns false, hook is a no-op |
| Large prototypes (1-5MB) | IndexedDB handles 50MB+ per origin |
| Version restore | Recovery data cleared so stale snapshot does not override |

---

## Tier 2: Data Integrity (Implemented)

**Goal:** Detect and prevent data corruption during save/load cycles.

### Content Checksums
- SHA-256 hash of `htmlContent` + `grapesData` computed on every save
- Uses `crypto.subtle.digest()` in browser, `crypto.createHash()` in Node.js
- `stableSerialize()` ensures deterministic JSON output (sorted keys) for consistent hashes
- Stored in `content_checksum` column on both `prototypes` and `prototype_versions` tables

**Key files:**
- `packages/shared/src/checksum.ts` -- `computeChecksum()`, `computeContentChecksum()`, `stableSerialize()`
- `packages/api/src/db/schema.ts` -- `contentChecksum` columns on `prototypes` (line 216) and `prototype_versions` (line 251)

### Optimistic Concurrency Control
- `version` integer column on `prototypes` table, incremented on every save
- Client sends current version via `If-Match` header on PUT requests
- Server validates version match before update; returns **HTTP 409 Conflict** on mismatch
- Atomic `UPDATE ... WHERE version =` inside `db.transaction()` prevents race conditions
- Restore endpoint also validates and increments version

**Key files:**
- `packages/api/src/routes/prototypes.ts` -- PUT handler (version check + atomic update), restore handler
- `packages/editor/src/hooks/useEditorPersistence.ts` -- sends `If-Match` header from `state.prototype?.version`

### Retry with Exponential Backoff
- `withRetry<T>()` generic retry function with configurable max attempts, delays, and jitter
- Error classification: `retriable` (500+, network), `permanent` (4xx), `auth` (401/403), `rate_limit` (429), `offline`
- Backoff formula: `initialDelay × 2^(attempt-1)` capped at `maxDelayMs` (30s), plus 0-50% random jitter
- 409 Conflict errors marked `noRetry` to skip retry (user must reload)
- Manual saves: max 3 retries; autosaves: max 2 retries
- Network monitoring: `subscribeToOnlineStatus()` triggers auto-retry when connectivity returns

**Key files:**
- `packages/editor/src/lib/retry.ts` -- `withRetry()`, `classifyError()`, online status utilities
- `packages/editor/src/hooks/useEditorPersistence.ts` -- retry integration in save callback

### Save Receipt Validation
- After successful save, client computes local checksum and compares to server-returned `contentChecksum`
- Non-blocking: mismatch is logged as debug, does not fail the save
- Catches computation errors to prevent exceptions

**Key files:**
- `packages/editor/src/hooks/useEditorPersistence.ts` -- receipt validation in save `.then()` chain

---

## Tier 3: Version History (Partially Implemented)

**Goal:** Rich version history with diffs, branching, and rollback.

### Rollback/Restore (Implemented)
- Any version can be restored via `POST /api/prototypes/:slug/versions/:version/restore`
- Creates a new version snapshot of current state before restoring (preserves history)
- Transaction-wrapped with optimistic concurrency control
- Recovery data cleared after restore to prevent stale snapshots

**Key files:**
- `packages/api/src/routes/prototypes.ts` -- restore endpoint
- `packages/editor/src/hooks/useVersionHistory.ts` -- `restoreVersion()` client function

### Text Diff (Implemented)
- `GET /api/prototypes/:slug/versions/:v1/compare/:v2` returns HTML from two versions
- Client-side line-by-line diff using `diffLines` from the `diff` npm package
- `VersionDiffView` renders colored diff (green = added, red = removed)
- Supports comparing any version vs "current"

**Key files:**
- `packages/editor/src/lib/diff-utils.ts` -- `computeHtmlDiff()`
- `packages/editor/src/components/VersionDiffView.tsx` -- diff rendering UI
- `packages/api/src/routes/prototypes.ts` -- compare endpoint

### Not Yet Implemented
- **Server-side isomorphic-git** -- Each prototype gets a bare git repository; saves create commits. Repositories stored at `data/repos/<prototype-slug>.git`. This would replace simple version snapshots with a richer history model.
- **Branching** -- Named branches for experimentation (e.g., "dark mode variant"). Requires git backing or schema changes to support non-linear version history.

---

## Tier 4: Enhanced UX (Partially Implemented)

**Goal:** Power-user features for teams and complex projects.

### Named Version Labels (Implemented)
- `label` varchar column on `prototype_versions` table
- `PATCH /api/prototypes/:slug/versions/:version` accepts `{ label }` body
- Inline label editing UI in `VersionHistoryPanel` with save/cancel

**Key files:**
- `packages/api/src/routes/prototypes.ts` -- PATCH label endpoint
- `packages/editor/src/hooks/useVersionHistory.ts` -- `updateLabel()`
- `packages/editor/src/components/VersionHistoryPanel.tsx` -- inline label editing UI

### Not Yet Implemented
- **Visual diff** -- Side-by-side rendered preview of two versions using the Preview component. Currently only text diff is available.
- **Cross-tab coordination** -- `BroadcastChannel` to coordinate saves when the same prototype is open in multiple tabs; prevent overwrite conflicts in real time. `BroadcastChannel` is widely supported (all modern browsers); messages are same-origin only.
- **Auto-merge** -- For non-conflicting concurrent edits, merge changes automatically (component-level granularity). Currently, optimistic concurrency rejects concurrent writes entirely (409 Conflict).

---

## Implementation Priority

| Tier | Status | Priority | Complexity |
|------|--------|----------|------------|
| 1. IndexedDB Crash Recovery | **Done** | Critical | Low |
| 2. Data Integrity | **Done** | High | Medium |
| 3. Version History | **Partial** -- restore + text diff done; git backing + branching remaining | Medium | High |
| 4. Enhanced UX | **Partial** -- named labels done; visual diff, cross-tab, auto-merge remaining | Low | High |

Each tier builds on the previous one. Remaining Tier 3 work (isomorphic-git, branching) is independent of remaining Tier 4 work (visual diff, cross-tab coordination, auto-merge).
