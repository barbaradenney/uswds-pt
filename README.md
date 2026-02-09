# USWDS Prototyping Tool

A visual drag-and-drop prototyping tool for building web interfaces using [USWDS (U.S. Web Design System)](https://designsystem.digital.gov/) Web Components. Outputs clean, framework-agnostic HTML that developers can integrate directly into codebases.

Built on [GrapesJS](https://grapesjs.com/) as the visual editor, using native Web Components for output.

## Quick Start

**Prerequisites:** Node.js >= 20, pnpm >= 9, PostgreSQL (via [Supabase](https://supabase.com/) or local)

```bash
# Install dependencies
pnpm install

# Copy environment files and fill in values
cp packages/api/.env.example packages/api/.env
cp packages/editor/.env.example packages/editor/.env

# Push database schema
pnpm db:push

# Start all packages in development mode
pnpm dev
```

The editor runs at `http://localhost:3000` and the API at `http://localhost:3001`.

## Monorepo Structure

| Package | Path | Description |
|---------|------|-------------|
| **@uswds-pt/editor** | `packages/editor/` | React frontend with GrapesJS visual editor (Vite) |
| **@uswds-pt/api** | `packages/api/` | Fastify REST API with JWT auth |
| **@uswds-pt/adapter** | `packages/adapter/` | Converts Custom Elements Manifest to GrapesJS blocks/components |
| **@uswds-pt/shared** | `packages/shared/` | Shared TypeScript types (CEM, prototypes, editor manifest) |

Managed with [pnpm workspaces](https://pnpm.io/workspaces) and [Turborepo](https://turbo.build/).

## Architecture

```
User drags USWDS component onto canvas
        │
        ▼
  ┌─────────────┐     ┌──────────────┐
  │   Editor     │────▶│   Adapter    │  Registers blocks + traits
  │  (GrapesJS)  │◀────│  (CEM→GJS)   │  from Custom Elements Manifest
  └──────┬───────┘     └──────────────┘
         │ Save
         ▼
  ┌─────────────┐     ┌──────────────┐
  │    API       │────▶│  PostgreSQL   │  Stores grapesData + htmlContent
  │  (Fastify)   │     │  (Supabase)   │  with version history
  └─────────────┘     └──────────────┘
```

- **Component Registration**: The adapter's `component-registry-v2.ts` defines all USWDS web components with GrapesJS block definitions and trait configurations. Components use Light DOM.
- **Trait System**: Properties are edited via GrapesJS traits. `WebComponentTraitManager.ts` syncs DOM attributes with the editor.
- **Export**: `packages/editor/src/lib/export.ts` cleans GrapesJS artifacts and generates full HTML documents with USWDS CDN imports.
- **Crash Recovery**: IndexedDB snapshots every 3s protect against data loss. See [Reliability Roadmap](docs/prototype-reliability-roadmap.md).

For detailed editor architecture, see [docs/EDITOR_ARCHITECTURE.md](docs/EDITOR_ARCHITECTURE.md).

## Common Commands

```bash
# Development
pnpm dev                              # Run all packages
pnpm build                            # Build all packages
pnpm test                             # Run all tests
pnpm lint                             # Lint all packages

# Package-specific tests
pnpm --filter @uswds-pt/editor test   # Editor tests only
pnpm --filter @uswds-pt/api test      # API tests only
pnpm --filter @uswds-pt/adapter test  # Adapter tests only

# Single test file
pnpm --filter @uswds-pt/editor vitest run src/components/ErrorBoundary.test.tsx

# Database
pnpm db:push                          # Push schema changes
pnpm db:migrate                       # Run migrations
pnpm --filter @uswds-pt/api db:studio # Open Drizzle Studio
```

## Documentation

- [CLAUDE.md](CLAUDE.md) - AI agent instructions and project context
- [docs/EDITOR_ARCHITECTURE.md](docs/EDITOR_ARCHITECTURE.md) - Editor internals and state machine
- [docs/API.md](docs/API.md) - REST API endpoint reference
- [docs/prototype-reliability-roadmap.md](docs/prototype-reliability-roadmap.md) - Reliability tiers roadmap

## Deployment

| Component | Platform |
|-----------|----------|
| Database | Supabase (PostgreSQL) |
| API | Render (via `render.yaml`) |
| Frontend | GitHub Pages |
| Local dev | Docker Compose (`docker/`) |

## License

Private - all rights reserved.
