# @uswds-pt/api

Fastify REST API with JWT authentication, PostgreSQL persistence (Drizzle ORM), and optional AI copilot proxy. Handles prototype CRUD, version history, multi-tenant organizations/teams, GitHub OAuth, and rate-limited AI chat.

## Architecture

| File / Directory | Purpose |
|---|---|
| `src/index.ts` | Fastify server bootstrap -- CORS, helmet, rate-limit, compression, route registration |
| `src/plugins/auth.ts` | JWT auth plugin (`@fastify/jwt`) with `authenticate` decorator |
| `src/routes/auth.ts` | Register / login / me endpoints (bcrypt password hashing) |
| `src/routes/github-auth.ts` | GitHub OAuth login/callback flow with encrypted token storage |
| `src/routes/prototypes.ts` | Prototype CRUD with optimistic concurrency (`version` + `If-Match`) |
| `src/routes/preview.ts` | Public prototype preview endpoint |
| `src/routes/organizations.ts` | Organization management |
| `src/routes/teams.ts` | Team management and membership |
| `src/routes/invitations.ts` | Team invitation workflow |
| `src/routes/symbols.ts` | Reusable design symbol endpoints |
| `src/routes/github.ts` | GitHub repo integration and team connections |
| `src/routes/ai.ts` | AI chat proxy (Anthropic / OpenAI) -- server-side API key |
| `src/db/schema.ts` | Drizzle ORM schema (organizations, teams, prototypes, versions) |
| `src/db/index.ts` | Database connection (postgres.js driver) |
| `src/db/roles.ts` | Role-based access control helpers |
| `src/db/migrations/` | Incremental schema migrations |
| `src/lib/error-handler.ts` | Centralized error handler and database health check |
| `src/lib/github-oauth.ts` | GitHub OAuth token exchange and encryption |
| `src/lib/github-push.ts` | Push prototype HTML to GitHub repositories |

## Key Exports

| Export | Description |
|---|---|
| Fastify server | Starts on `PORT` (default 3001) with all routes registered |
| `db` | Drizzle ORM database instance |
| `authPlugin` | Fastify plugin that decorates requests with `authenticate` |

## Development

```bash
pnpm --filter @uswds-pt/api dev            # tsx watch (port 3001)
pnpm --filter @uswds-pt/api build          # tsc
pnpm --filter @uswds-pt/api start          # node dist/index.js
pnpm --filter @uswds-pt/api test           # Run tests (Vitest)
pnpm --filter @uswds-pt/api test:watch     # Watch mode
pnpm --filter @uswds-pt/api test:coverage  # Coverage report
pnpm --filter @uswds-pt/api db:push        # Push schema to database
pnpm --filter @uswds-pt/api db:migrate     # Run pending migrations
pnpm --filter @uswds-pt/api db:studio      # Open Drizzle Studio
```

Requires `packages/api/.env` with `DATABASE_URL` and `JWT_SECRET`. Optional: `AI_API_KEY` for AI copilot, `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `GITHUB_CALLBACK_URL` for GitHub OAuth. See the root `CLAUDE.md` for the full variable list.

## Monorepo Dependencies

- **`@uswds-pt/shared`** -- Types (`Prototype`, `ApiError`), `computeContentChecksum`
