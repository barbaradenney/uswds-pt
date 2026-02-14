# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

USWDS-PT is a visual drag-and-drop prototyping tool for building web interfaces using USWDS (U.S. Web Design System) Web Components. It outputs clean HTML that developers can integrate directly into codebases. The project uses GrapesJS as the visual editor and outputs native Web Components (not React/Vue-specific), making the output framework-agnostic.

## Monorepo Structure

This is a pnpm workspace monorepo using Turborepo. Four packages in `packages/`:

- **@uswds-pt/editor** - React frontend with GrapesJS visual editor (Vite)
- **@uswds-pt/api** - Fastify REST API with GitHub OAuth + JWT session tokens (tsx for dev)
- **@uswds-pt/adapter** - Converts Custom Elements Manifest to GrapesJS blocks/components
- **@uswds-pt/shared** - Shared TypeScript types (CEM, prototypes, editor manifest)

## Common Commands

```bash
# Install dependencies
pnpm install

# Development (runs all packages)
pnpm dev

# Build all packages
pnpm build

# Run tests across all packages
pnpm test

# Run tests for a specific package
pnpm --filter @uswds-pt/editor test
pnpm --filter @uswds-pt/api test
pnpm --filter @uswds-pt/adapter test

# Run single test file
pnpm --filter @uswds-pt/editor vitest run src/components/ErrorBoundary.test.tsx

# Watch mode for tests
pnpm --filter @uswds-pt/editor test:watch

# Linting
pnpm lint

# Database operations (API package)
pnpm db:migrate    # Run migrations
pnpm db:push       # Push schema changes
pnpm --filter @uswds-pt/api db:studio  # Open Drizzle Studio
```

## Architecture

### Data Flow

1. **Editor** loads GrapesJS with USWDS components registered via **adapter**
2. User drags components onto canvas, edits properties via traits panel
3. On save, editor sends `grapesData` (GrapesJS state) and `htmlContent` to **API**
4. API stores in PostgreSQL with version history
5. If a GitHub repo is connected, prototype data is pushed automatically on save
6. Export cleans HTML (removes GrapesJS artifacts) for developer handoff

### Key Concepts

**Component Registration**: The adapter's `component-registry-v2.ts` contains the `ComponentRegistry` class and wiring. Individual component registrations are split across focused files in `packages/adapter/src/components/`:
- `button-components.ts`, `form-components.ts`, `form-input-components.ts`, `text-input-components.ts`
- `selection-components.ts`, `date-time-components.ts`, `file-range-components.ts`
- `data-components.ts`, `feedback-components.ts`, `ui-components.ts`
- `layout-components.ts`, `structure-components.ts`
- `header-components.ts`, `footer-components.ts`, `navigation-components.ts`
- `pattern-components.ts` (multi-field USWDS patterns: name, address, phone, email, DOB, SSN)
- Helper modules: `shared-utils.ts`, `select-helpers.ts`, `page-link-traits.ts`, `form-trait-factories.ts`
- Barrel: `index.ts`

Components use Light DOM (no Shadow DOM), making GrapesJS integration straightforward.

**Trait System**: Properties are edited via GrapesJS traits. `WebComponentTraitManager.ts` handles syncing between DOM attributes and the editor. Some components (usa-header, usa-footer) require JavaScript initialization after render.

**Export**: `packages/editor/src/lib/export/` contains export utilities split across focused files (clean.ts, document.ts, init-script.ts) with a barrel `index.ts`. These clean GrapesJS artifacts (data-gjs-* attributes, generated IDs) and can generate full HTML documents with USWDS CDN imports.

**Symbols**: Reusable component groups shared across prototypes within a team. Stored in the `symbols` table as GrapesJS symbol structures. CRUD operations via `packages/api/src/routes/symbols.ts` at `/api/teams/:teamId/symbols`. Any team member can create symbols; only the creator or a team/org admin can edit or delete them.

### Database Schema (Drizzle ORM)

Tables in `packages/api/src/db/schema.ts`:
- `organizations` - Top-level tenant grouping (agencies/companies); has `stateDefinitions` and `userDefinitions` JSONB columns
- `teams` - Subdivisions within organizations (unique slug per org)
- `team_memberships` - Join table: users to teams with roles (`org_admin`, `team_admin`, `team_member`)
- `invitations` - Pending invitations for users to join teams (token-based, with expiry and status)
- `users` - User accounts; includes GitHub OAuth fields (`githubId`, `githubUsername`, `githubAccessToken` encrypted)
- `prototypes` - Stores `htmlContent`, `grapesData` (JSONB), `branchSlug`, GitHub push tracking (`lastGithubPushAt`, `lastGithubCommitSha`)
- `prototype_versions` - Version history snapshots with `contentChecksum`
- `symbols` - Team-scoped reusable symbol components (`symbolData` JSONB)
- `github_team_connections` - Links a team to a GitHub repo for push-on-save (one connection per team)
- `github_handoff_connections` - Links a team to a separate GitHub repo for clean HTML developer handoff
- `audit_logs` - Audit trail (for future use)

### Authentication

**GitHub OAuth only.** Email/password login and registration endpoints (`POST /api/auth/login`, `POST /api/auth/register`) return `410 Gone` and direct users to GitHub sign-in. Routes in `packages/api/src/routes/auth.ts` and `github-auth.ts`.

OAuth flow:
1. `GET /api/auth/github` redirects to GitHub with CSRF state cookie
2. `GET /api/auth/github/callback` exchanges code for access token, creates/links user, issues JWT
3. JWT returned via hash fragment redirect to frontend (`/#/auth/callback?token=...`)
4. JWT stored in localStorage on frontend for subsequent API calls

GitHub access tokens are encrypted with AES-256-GCM (via `ENCRYPTION_KEY`) before storage. The `passwordHash` column is nullable (all users are OAuth-only now).

### GitHub Repository Integration

Teams can connect to GitHub repositories for automatic prototype syncing. Managed via `packages/api/src/routes/github.ts`.

**Push-on-save connection** (`github_team_connections`): When a team is connected to a repo, saving a prototype pushes its GrapesJS data to a branch named after the prototype's `branchSlug`. Endpoints:
- `GET /api/teams/:teamId/github` - Connection status
- `POST /api/teams/:teamId/github/connect` - Connect repo (team/org admin only)
- `DELETE /api/teams/:teamId/github/disconnect` - Remove connection

**Developer handoff connection** (`github_handoff_connections`): A separate repo connection for clean HTML output (no GrapesJS metadata). Pushed to `handoff/{branchSlug}` branches. Endpoints:
- `GET /api/teams/:teamId/github/handoff` - Handoff connection status
- `POST /api/teams/:teamId/github/handoff/connect` - Connect handoff repo
- `DELETE /api/teams/:teamId/github/handoff/disconnect` - Remove handoff connection

**Listing repos**: `GET /api/github/repos` lists repositories accessible to the authenticated user's GitHub token.

Push implementation is in `packages/api/src/lib/github-push.ts` (multi-file atomic commits via Git Data API).

### Security

- **@fastify/helmet** -- CSP, X-Frame-Options (DENY), HSTS (2-year, preload in production), Referrer-Policy
- **@fastify/rate-limit** -- 100/min global, 5/min login (410), 3/min register (410), 10/min GitHub callback, 10/min AI chat
- **Input validation** -- `htmlContent` max 2MB, `grapesData` max 5MB, body limit 8MB, `additionalProperties: false`
- **Optimistic concurrency** -- `version` column + `If-Match` header + atomic transactions
- **Preview sandbox** -- `<iframe sandbox="allow-scripts" srcdoc={...}>` prevents stored XSS
- **OAuth state** -- SHA-256 hashed before `timingSafeEqual` to prevent timing side-channel
- **Token encryption** -- GitHub access tokens encrypted with AES-256-GCM before DB storage
- **Docker** -- API runs as non-root user (`appuser:appgroup`)

## Environment Variables

See `packages/api/.env.example` and `packages/editor/.env.example` for full documentation with defaults.

### API (`packages/api/.env`)

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Auth token signing (required in production; dev fallback exists)

GitHub OAuth (all required if any are set):
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `GITHUB_CALLBACK_URL` - OAuth app credentials
- `ENCRYPTION_KEY` - AES-256-GCM key for encrypting GitHub access tokens (required when OAuth is configured). Accepts a 32-char raw string or a 64-char hex-encoded string.

Optional server:
- `PORT` - API server port (default: 3001)
- `HOST` - Bind address (default: 0.0.0.0)
- `NODE_ENV` - `development` or `production`
- `FRONTEND_URL` - CORS allowed origin (default: http://localhost:3000)
- `CORS_ORIGINS` - Additional CORS origins, comma-separated
- `LOG_LEVEL` - Pino log level (default: info)

Optional AI:
- `AI_API_KEY` - API key for AI copilot (Claude or OpenAI) -- server-side only
- `AI_PROVIDER` - `claude` or `openai` (default: claude)
- `AI_MODEL` - Model name (default: claude-sonnet-4-20250514 or gpt-4o)

### Editor (`packages/editor/.env`)

- `VITE_API_URL` - Backend API URL (default: empty = demo mode with no backend)
- `VITE_AI_ENABLED` - Set to `true` to enable AI copilot UI
- `VITE_AI_SECRET` - (Optional) Gate AI access via URL parameter `?ai=<secret>`; when set, AI copilot requires this URL param to activate

## AI Copilot Feature

The editor includes an optional AI assistant. Users describe what they want in natural language and the AI generates USWDS HTML. AI SDK calls are proxied through the API server so API keys are never exposed in the browser bundle.

### Enabling AI Copilot

1. Add the AI API key to `packages/api/.env` (server-side):
```bash
AI_API_KEY=your-api-key-here
AI_PROVIDER=claude  # or "openai"
AI_MODEL=claude-sonnet-4-20250514  # optional, uses default for provider
```

2. Enable the AI UI in `packages/editor/.env`:
```bash
VITE_AI_ENABLED=true
```

### How It Works

- The editor sends conversation context to `POST /api/ai/chat` (authenticated, rate-limited: 10 req/min)
- The API server calls the AI provider SDK (Anthropic or OpenAI) with the server-side API key
- The AI is trained on all USWDS web components through a custom prompt (`src/lib/ai/uswds-prompt.ts`)
- Supports image and PDF attachments (Claude only for PDFs)
- Users can request things like "add a contact form" or "make this card have a warning style"
- The AI knows about usa-button, usa-header, usa-card, usa-alert, and all other USWDS components

## Database Setup

This project uses **Supabase** (PostgreSQL) as the external database for development and production.

### Supabase Configuration

The database connection is configured in `packages/api/.env`:
```
DATABASE_URL=postgresql://[user]:[password]@[host]:5432/postgres
```

### Testing Database Connection

```bash
# Test if the database is reachable
pnpm --filter @uswds-pt/api tsx src/db/test-connection.ts
```

### Troubleshooting Database Issues

**"Tenant or user not found" error:**
- Supabase free tier pauses projects after 7 days of inactivity
- Go to [Supabase Dashboard](https://supabase.com/dashboard) and restore the project
- After restoring, wait a few minutes for the database to come back online
- If credentials changed, update `DATABASE_URL` in `packages/api/.env` with new connection string from Settings → Database

**"Prototypes not found" or "Can't save" errors:**
- Usually indicates the database is unreachable or paused
- Run the connection test above to verify connectivity
- Check that the API server is running (`pnpm dev`)

### Running Migrations

After restoring a paused database or setting up fresh:
```bash
pnpm db:push       # Push current schema to database
pnpm db:migrate    # Run pending migrations
```

## Testing

Uses Vitest. Tests colocated with source files or in `__tests__/` directories. The adapter package uses happy-dom for DOM testing.

## Deployment

- **Database**: Supabase (PostgreSQL) - external hosted database
- **API**: Render web service using `render.yaml` blueprint
- **Frontend**: GitHub Pages (static site)
- **Docker**: Compose file in `docker/` for local full-stack development

## USWDS Web Components

The tool uses these CDN versions (defined in `packages/adapter/src/constants/cdn.ts`). Adapter constants are split across `packages/adapter/src/constants/` (categories.ts, icons.ts, templates.ts, cdn.ts, scripts.ts) with a barrel `index.ts`. CDN versions:
- USWDS CSS: 3.8.1
- USWDS Web Components Bundle: 2.5.15

Components render Light DOM content, so standard DOM manipulation works. Complex components (usa-header, usa-footer) need property initialization after the custom element is defined.

## Quick Troubleshooting

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| "Tenant or user not found" | Supabase project paused | Restore project in Supabase dashboard |
| "Can't save prototype" | Database unreachable | Check DB connection, restore if paused |
| API not responding | Server not running | Run `pnpm dev` |
| CORS errors | Wrong FRONTEND_URL | Update `packages/api/.env` |
| "Failed to fetch" in editor | API URL mismatch | Check `packages/editor/.env` |
| "Email/password login removed" | 410 Gone from auth | Use GitHub OAuth sign-in instead |
| GitHub push fails | Token expired or no connection | Re-authenticate via GitHub OAuth; check team connection |
