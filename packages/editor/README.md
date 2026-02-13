# @uswds-pt/editor

React frontend with GrapesJS visual editor for drag-and-drop USWDS prototyping. Handles canvas rendering, save/load persistence, crash recovery, multi-page navigation, and HTML export.

## Architecture

| File / Directory | Purpose |
|---|---|
| `components/Editor.tsx` | Main editor orchestration -- state machine, save/load, autosave |
| `components/editor/EditorCanvas.tsx` | `GjsEditor` wrapper -- plugins, projectData, blockManager |
| `components/Preview.tsx` | Sandboxed iframe preview (`<iframe sandbox>` with `srcdoc`) |
| `components/PrototypeList.tsx` | Dashboard with search, sort, pagination |
| `hooks/useEditorStateMachine.ts` | Finite state machine for editor lifecycle |
| `hooks/useEditorPersistence.ts` | Save/load/createNew API calls |
| `hooks/useGrapesJSSetup.ts` | GrapesJS initialization, event listeners, `onReady` |
| `hooks/useCrashRecovery.ts` | IndexedDB crash recovery snapshots (every 3s) |
| `hooks/useEditorAutosave.ts` | Debounced autosave on content changes |
| `lib/export.ts` | Clean HTML export and full document generation |
| `lib/export/` | Modular export helpers: `clean.ts`, `document.ts`, `init-script.ts` |
| `lib/grapesjs/resource-loader.ts` | Loads USWDS CSS/JS into the canvas iframe |
| `lib/grapesjs/data-extractor.ts` | Extracts HTML + grapesData from editor for saves |
| `lib/grapesjs/plugins/` | Block search, pages manager |
| `lib/ai/` | AI copilot panel and USWDS-aware prompt |
| `lib/indexeddb.ts` | Promise-based IndexedDB wrapper for recovery |
| `lib/constants.ts` | Named timing constants (autosave, debounce, etc.) |

## Key Exports

| Export | Description |
|---|---|
| `Editor` | Main editor component with full lifecycle management |
| `Preview` | Sandboxed preview rendering via iframe |
| `PrototypeList` | Prototype dashboard with cards, search, sort |
| `Home` | Landing/home page component |
| `ExportModal` | HTML export dialog with copy/download |
| `RecoveryBanner` | Crash recovery restore/dismiss banner |
| `KeyboardShortcutsDialog` | Keyboard shortcuts reference dialog |

## Development

```bash
pnpm --filter @uswds-pt/editor dev          # Vite dev server (port 3000)
pnpm --filter @uswds-pt/editor build        # tsc + vite build
pnpm --filter @uswds-pt/editor test         # Run tests (Vitest)
pnpm --filter @uswds-pt/editor test:watch   # Watch mode
pnpm --filter @uswds-pt/editor test:e2e     # Playwright end-to-end tests
```

Requires `packages/editor/.env` with `VITE_API_URL` (default `http://localhost:3001`). Optional: `VITE_AI_ENABLED=true` for AI copilot (API key configured server-side).

## Monorepo Dependencies

- **`@uswds-pt/adapter`** -- Component registry, block definitions, trait configs, CDN URLs
- **`@uswds-pt/shared`** -- Types (`Prototype`, `ApiError`), `escapeHtml`, `createDebugLogger`, `computeContentChecksum`
