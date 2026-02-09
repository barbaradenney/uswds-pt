# @uswds-pt/shared

Shared TypeScript types and utilities used across all packages in the monorepo. This is the leaf dependency with no internal package dependencies.

## Architecture

| File | Purpose |
|---|---|
| `types/prototype.ts` | `Prototype`, `PrototypeVersion`, `PrototypeListItem` types |
| `types/api.ts` | Request/response types: `LoginBody`, `PaginatedMeta`, `ApiError`, etc. |
| `types/cem.ts` | Custom Elements Manifest types |
| `types/editor-manifest.ts` | Editor manifest shape types |
| `sanitize.ts` | `escapeHtml()` -- XSS-safe HTML entity encoding |
| `checksum.ts` | `computeContentChecksum()` -- SHA-256 content integrity checksums |
| `debug.ts` | `createDebugLogger()` -- namespaced debug logging (enabled via `?debug=true` or `localStorage`) |
| `index.ts` | Barrel export -- re-exports all types and utilities |

## Key Exports

| Export | Description |
|---|---|
| `Prototype`, `PrototypeVersion` | Core data model types |
| `ApiError`, `PaginatedMeta` | API response envelope types |
| `escapeHtml(str)` | Encodes `&`, `<`, `>`, `"`, `'` to HTML entities |
| `computeContentChecksum(content)` | SHA-256 hex digest for content integrity |
| `createDebugLogger(namespace)` | Returns a scoped logger that only outputs when debug mode is active |

## Development

```bash
pnpm --filter @uswds-pt/shared build   # tsc
pnpm --filter @uswds-pt/shared dev     # tsc --watch
pnpm --filter @uswds-pt/shared test    # Run tests (Vitest)
```

No environment variables required.

## Usage

```typescript
import type { Prototype, PrototypeVersion } from '@uswds-pt/shared';
import { escapeHtml, computeContentChecksum, createDebugLogger } from '@uswds-pt/shared';

const debug = createDebugLogger('MyModule');
debug('processing', { id: 42 }); // [MyModule] processing { id: 42 }

const safe = escapeHtml('<script>alert("xss")</script>');
const hash = computeContentChecksum(htmlContent);
```

## Monorepo Dependencies

None -- this is the leaf package. All other packages depend on it:

- **`@uswds-pt/editor`** imports types, `escapeHtml`, `createDebugLogger`, `computeContentChecksum`
- **`@uswds-pt/api`** imports types, `computeContentChecksum`
- **`@uswds-pt/adapter`** imports `escapeHtml`, CEM types
