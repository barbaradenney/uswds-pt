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

## Tier 2: Data Integrity (Future)

**Goal:** Detect and prevent data corruption during save/load cycles.

**Planned features:**
- **Content checksums** -- SHA-256 hash of `grapesData` stored alongside the prototype; verified on load to detect corruption
- **Optimistic concurrency** -- `updatedAt` timestamp sent with save requests; server rejects if another save happened since the client last loaded (HTTP 409 Conflict)
- **Retry with backoff** -- Failed saves retry automatically with exponential backoff before surfacing an error
- **Save receipt validation** -- After save, client verifies the returned data matches what was sent

**Implementation notes:**
- Checksums can be computed with `crypto.subtle.digest('SHA-256', ...)` (browser-native, zero dependencies)
- Concurrency control requires an API change: `PUT /api/prototypes/:slug` must accept and validate an `If-Unmodified-Since` header or `expectedVersion` body field
- Retry logic should reuse the existing `useEditorAutosave` debounce pattern

---

## Tier 3: Git-backed Version History (Future)

**Goal:** Rich version history with diffs, branching, and rollback beyond the current simple version snapshots.

**Planned features:**
- **Server-side isomorphic-git** -- Each prototype gets a bare git repository; saves create commits
- **Diff view** -- Show HTML/component tree diffs between any two versions
- **Branching** -- Create named branches for experimentation (e.g., "dark mode variant")
- **Rollback** -- Restore any commit, not just the most recent version

**Implementation notes:**
- `isomorphic-git` runs in Node.js (API server) with `fs` backend
- Repositories stored at `data/repos/<prototype-slug>.git`
- Existing `prototype_versions` table continues to serve as the primary index; git commits store the full project data
- This replaces simple version snapshots with a richer history model

---

## Tier 4: Enhanced UX (Future)

**Goal:** Power-user features for teams and complex projects.

**Planned features:**
- **Named versions** -- Users can name specific save points (e.g., "v2 approved by stakeholder")
- **Visual diff** -- Side-by-side rendered preview of two versions
- **Cross-tab coordination** -- `BroadcastChannel` to coordinate saves when the same prototype is open in multiple tabs; prevent overwrite conflicts in real time
- **Auto-merge** -- For non-conflicting concurrent edits, merge changes automatically (component-level granularity)

**Implementation notes:**
- `BroadcastChannel` is widely supported (all modern browsers); messages are same-origin only
- Visual diff can use the existing Preview component to render both versions
- Named versions are a UI feature on top of Tier 3's git commits (tag mechanism)

---

## Implementation Priority

| Tier | Status | Priority | Complexity |
|------|--------|----------|------------|
| 1. IndexedDB Crash Recovery | Done | Critical | Low |
| 2. Data Integrity | Planned | High | Medium |
| 3. Git-backed History | Planned | Medium | High |
| 4. Enhanced UX | Planned | Low | High |

Each tier builds on the previous one. Tier 2 can be implemented independently of Tier 3.
