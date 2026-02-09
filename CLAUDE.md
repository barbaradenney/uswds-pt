# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

USWDS-PT is a visual drag-and-drop prototyping tool for building web interfaces using USWDS (U.S. Web Design System) Web Components. It outputs clean HTML that developers can integrate directly into codebases. The project uses GrapesJS as the visual editor and outputs native Web Components (not React/Vue-specific), making the output framework-agnostic.

## Monorepo Structure

This is a pnpm workspace monorepo using Turborepo. Four packages in `packages/`:

- **@uswds-pt/editor** - React frontend with GrapesJS visual editor (Vite)
- **@uswds-pt/api** - Fastify REST API with JWT auth (tsx for dev)
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
5. Export cleans HTML (removes GrapesJS artifacts) for developer handoff

### Key Concepts

**Component Registration**: The adapter's `component-registry-v2.ts` contains the `ComponentRegistry` class and wiring. Individual component registrations are split across focused files in `packages/adapter/src/components/` (form-components.ts, data-components.ts, feedback-components.ts, layout-components.ts, navigation-components.ts, etc.) with a barrel `index.ts`. Components use Light DOM (no Shadow DOM), making GrapesJS integration straightforward.

**Trait System**: Properties are edited via GrapesJS traits. `WebComponentTraitManager.ts` handles syncing between DOM attributes and the editor. Some components (usa-header, usa-footer) require JavaScript initialization after render.

**Export**: `packages/editor/src/lib/export/` contains export utilities split across focused files (clean.ts, document.ts, init-script.ts) with a barrel `index.ts`. These clean GrapesJS artifacts (data-gjs-* attributes, generated IDs) and can generate full HTML documents with USWDS CDN imports.

### Database Schema (Drizzle ORM)

Key tables in `packages/api/src/db/schema.ts`:
- `organizations` / `teams` - Multi-tenant hierarchy
- `team_memberships` - Users belong to teams with roles
- `prototypes` - Stores htmlContent and grapesData (JSONB)
- `prototype_versions` - Version history snapshots

### Authentication

JWT-based auth. Routes in `packages/api/src/routes/auth.ts`. Tokens stored in localStorage on frontend.

## Environment Variables

The API package has its own `.env` file at `packages/api/.env`. Key variables:
- `DATABASE_URL` - PostgreSQL connection string (required)
- `JWT_SECRET` - Auth token signing
- `FRONTEND_URL` - CORS allowed origin (default: http://localhost:3000)
- `PORT` - API server port (default: 3001)

The editor package has its own `.env` file at `packages/editor/.env` for frontend-specific config:
- `VITE_API_URL` - Backend API URL (default: http://localhost:3001)
- `VITE_AI_API_KEY` - (Optional) API key for AI copilot (Claude or OpenAI)
- `VITE_AI_PROVIDER` - (Optional) AI provider: "claude" or "openai" (default: claude)
- `VITE_AI_MODEL` - (Optional) AI model name (default: claude-sonnet-4-20250514 or gpt-4o)

## AI Copilot Feature

The editor includes an optional AI assistant powered by the `@silexlabs/grapesjs-ai-copilot` plugin. When enabled, users can describe what they want to build in natural language and the AI will generate GrapesJS code to create USWDS components.

### Enabling AI Copilot

Add these environment variables to `packages/editor/.env`:
```bash
VITE_AI_API_KEY=your-api-key-here
VITE_AI_PROVIDER=claude  # or "openai"
VITE_AI_MODEL=claude-sonnet-4-20250514  # optional, uses default for provider
```

### How It Works

- The AI is trained on all USWDS web components through a custom prompt (`src/lib/ai/uswds-prompt.ts`)
- It generates JavaScript code that uses the GrapesJS API to add/modify components
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

The tool uses these CDN versions (defined in adapter constants and export utilities). Adapter constants are split across `packages/adapter/src/constants/` (categories.ts, icons.ts, templates.ts, cdn.ts, scripts.ts) with a barrel `index.ts`. CDN versions:
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
