# USWDS-PT API Reference

REST API for the USWDS Prototyping Tool. Built with Fastify, backed by PostgreSQL (Drizzle ORM), authenticated via JWT.

## Base URL

| Environment | URL |
|-------------|-----|
| Local dev   | `http://localhost:3001` |
| Production  | Configured via `PORT` and `HOST` env vars |

All endpoints are prefixed with `/api`.

## Authentication

Most endpoints require a JWT bearer token obtained from login or register. Include it in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens expire after **7 days**. The JWT payload contains `{ id, email }`.

---

## Endpoints

### Health

#### `GET /api/health`

No auth required. Exempt from rate limiting.

**Response `200`**
```json
{
  "status": "ok",
  "timestamp": "2026-02-08T12:00:00.000Z",
  "services": {
    "database": {
      "status": "healthy",
      "latencyMs": 5
    }
  }
}
```

Status is `"degraded"` and database status is `"unhealthy"` when the database is unreachable.

---

### Authentication

#### `POST /api/auth/register`

Create a new user account. Rate limited to **3 requests/minute**.

**Request Body**
| Field      | Type   | Required | Notes              |
|------------|--------|----------|--------------------|
| `email`    | string | yes      | Valid email format  |
| `password` | string | yes      | Min 8 characters   |
| `name`     | string | no       |                    |

**Response `201`**
```json
{
  "token": "eyJhbG...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jane",
    "organizationId": "uuid",
    "createdAt": "...",
    "isActive": true,
    "organization": { "id": "uuid", "name": "...", "slug": "..." },
    "teamMemberships": [
      { "teamId": "uuid", "teamName": "General", "teamSlug": "general", "role": "org_admin", "joinedAt": "..." }
    ]
  }
}
```

Registration automatically creates a personal organization and default "General" team (unless the email has a pending invitation).

**Errors:** `400` email already registered.

#### `POST /api/auth/login`

Authenticate and receive a JWT. Rate limited to **5 requests/minute**.

**Request Body**
| Field      | Type   | Required | Notes              |
|------------|--------|----------|--------------------|
| `email`    | string | yes      | Valid email format  |
| `password` | string | yes      | Min 8 characters   |

**Response `200`** -- same shape as register.

**Errors:** `401` invalid credentials or disabled account.

#### `GET /api/auth/me`

Get the current authenticated user with organization and team data.

**Auth:** required.

**Response `200`** -- same `user` object shape as register (without the `token` wrapper).

**Errors:** `404` user not found.

---

### Prototypes

#### `GET /api/prototypes`

List prototypes accessible to the current user, paginated.

**Auth:** required.

**Query Parameters**
| Param    | Type   | Default | Notes                          |
|----------|--------|---------|--------------------------------|
| `teamId` | uuid   | --      | Filter to a specific team      |
| `page`   | number | 1       | Page number (1-based)          |
| `limit`  | number | 20      | Items per page (max 100)       |

Without `teamId`, returns the user's legacy prototypes plus all prototypes from teams they belong to.

**Response `200`**
```json
{
  "prototypes": [ { ... } ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

**Errors:** `403` not a member of the specified team.

#### `GET /api/prototypes/:slug`

Get a single prototype by slug.

**Auth:** required. User must be a member of the prototype's team (or the creator for legacy prototypes).

**Response `200`** -- full prototype object.

**Errors:** `404` not found, `403` access denied.

#### `POST /api/prototypes`

Create a new prototype.

**Auth:** required. User must have at least `team_member` role in the target team.

**Request Body**
| Field         | Type   | Required | Notes                  |
|---------------|--------|----------|------------------------|
| `name`        | string | yes      | 1-255 chars, trimmed   |
| `teamId`      | uuid   | yes      |                        |
| `description` | string | no       | Max 1000 chars         |
| `htmlContent`  | string | no       | Max 2 MB               |
| `grapesData`  | object | no       | Max 5 MB serialized    |

`additionalProperties: false` -- no extra fields accepted.

**Response `201`** -- the created prototype object (includes `slug`, `version`, `contentChecksum`, timestamps).

**Errors:** `400` empty name or invalid grapesData, `403` not a member or viewer role.

#### `PUT /api/prototypes/:slug`

Update a prototype. Creates a version snapshot of the current state before applying changes. Supports optimistic concurrency via `If-Match` header.

**Auth:** required. User must have at least `team_member` role.

**Headers**
| Header     | Required | Notes |
|------------|----------|-------|
| `If-Match` | no       | Integer version number for optimistic concurrency |

**Request Body**
| Field         | Type   | Required | Notes                  |
|---------------|--------|----------|------------------------|
| `name`        | string | no       | 1-255 chars, trimmed   |
| `description` | string | no       | Max 1000 chars         |
| `htmlContent`  | string | no       | Max 2 MB               |
| `grapesData`  | object | no       | Max 5 MB serialized    |

`additionalProperties: false`.

**Response `200`** -- the updated prototype object with incremented `version`.

**Errors:** `400` empty name or invalid grapesData, `403` access denied, `404` not found, `409` concurrent modification.

#### `DELETE /api/prototypes/:slug`

Delete a prototype.

**Auth:** required. Creator can always delete; team admins can delete any team prototype.

**Response `200`**
```json
{ "success": true }
```

**Errors:** `403` access denied, `404` not found.

#### `POST /api/prototypes/:slug/duplicate`

Duplicate a prototype within the same team.

**Auth:** required. Must be able to view the original and have at least `team_member` role.

**Response `201`** -- the new prototype object. Name is prefixed with "Copy of".

**Errors:** `403` access denied, `404` not found, `409` duplicate key conflict.

---

### Version History

#### `GET /api/prototypes/:slug/versions`

List version history for a prototype, paginated.

**Auth:** required. Must have access to the prototype.

**Query Parameters**
| Param  | Type   | Default | Notes            |
|--------|--------|---------|------------------|
| `page` | number | 1       | 1-based          |
| `limit`| number | 20      | Max 100          |

**Response `200`**
```json
{
  "versions": [
    {
      "id": "uuid",
      "versionNumber": 3,
      "label": "Before redesign",
      "contentChecksum": "sha256:abc...",
      "createdAt": "..."
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 20
}
```

#### `PATCH /api/prototypes/:slug/versions/:version`

Set or clear a named label on a version.

**Auth:** required. Must have edit permission on the prototype.

**Request Body**
| Field   | Type   | Required | Notes                             |
|---------|--------|----------|-----------------------------------|
| `label` | string | yes      | Max 255 chars. Empty string clears |

`additionalProperties: false`.

**Response `200`** -- the updated version object.

**Errors:** `400` invalid version number, `403` access denied, `404` prototype or version not found.

#### `POST /api/prototypes/:slug/versions/:version/restore`

Restore a prototype to a previous version. Snapshots the current state first and increments the version counter.

**Auth:** required. Must have edit permission.

**Response `200`** -- the updated prototype object.

**Errors:** `400` invalid version number, `403` access denied, `404` prototype or version not found, `409` concurrent modification.

#### `GET /api/prototypes/:slug/versions/:v1/compare/:v2`

Compare the HTML content of two versions. `:v2` can be a version number or the literal string `current` to compare against the live prototype state.

**Auth:** required. Must have access to the prototype.

**Response `200`**
```json
{
  "version1": { "versionNumber": 1, "htmlContent": "..." },
  "version2": { "versionNumber": 2, "htmlContent": "..." }
}
```

When `:v2` is `current`, `version2.versionNumber` is the string `"current"`.

**Errors:** `400` invalid version numbers, `403` access denied, `404` prototype or version not found.

---

### Preview

#### `GET /api/preview/:slug`

Get a public prototype for preview. **No authentication required.** Only returns prototypes with `isPublic = true`.

Response includes a `Cache-Control: public, max-age=300, stale-while-revalidate=60` header.

**Response `200`**
```json
{
  "name": "My Prototype",
  "htmlContent": "<div>...</div>",
  "gjsData": "{...}"
}
```

`gjsData` is a JSON string of the GrapesJS project data, or omitted if empty.

**Errors:** `404` prototype not found (or not public).

---

### Organizations

#### `POST /api/organizations/setup`

Set up an organization and team for users who do not have one (e.g., users who registered via invitation).

**Auth:** required.

**Request Body**
| Field      | Type   | Required | Notes            |
|------------|--------|----------|------------------|
| `teamName` | string | yes      | 1-255 chars      |

**Response `200`**
```json
{
  "organization": { "id": "uuid", "name": "...", "slug": "...", ... },
  "team": { "id": "uuid", "name": "...", "slug": "...", "role": "org_admin", ... }
}
```

**Errors:** `400` user already has a team, `404` user not found.

#### `GET /api/organizations`

Get the current user's organization.

**Auth:** required.

**Response `200`**
```json
{
  "id": "uuid",
  "name": "...",
  "slug": "...",
  "description": "...",
  "logoUrl": "...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

**Errors:** `404` user has no organization.

#### `PUT /api/organizations/:orgId`

Update organization details.

**Auth:** required. Must be `org_admin`. Can only update own organization.

**Request Body**
| Field         | Type   | Required | Notes                          |
|---------------|--------|----------|--------------------------------|
| `name`        | string | no       | 1-255 chars                    |
| `description` | string | no       | Max 5000 chars                 |
| `logoUrl`     | string | no       | Max 500 chars, must start with `http://` or `https://` |

`additionalProperties: false`.

**Response `200`** -- the updated organization object.

**Errors:** `403` cannot update another organization, `404` not found.

#### `GET /api/organizations/:orgId/members`

List all members in the organization with their team memberships.

**Auth:** required. Must be `org_admin`. Can only view own organization.

**Response `200`**
```json
{
  "members": [
    {
      "id": "uuid",
      "email": "...",
      "name": "...",
      "createdAt": "...",
      "isActive": true,
      "teamMemberships": [
        { "teamId": "uuid", "teamName": "...", "role": "team_member", "joinedAt": "..." }
      ]
    }
  ]
}
```

---

### Teams

#### `GET /api/teams`

List all teams the current user belongs to.

**Auth:** required.

**Response `200`**
```json
{
  "teams": [
    {
      "id": "uuid", "name": "...", "slug": "...", "description": "...",
      "organizationId": "uuid", "createdAt": "...", "updatedAt": "...",
      "role": "team_member", "joinedAt": "..."
    }
  ]
}
```

#### `POST /api/teams`

Create a new team. Creator is added as `team_admin`.

**Auth:** required. Must be `org_admin`.

**Request Body**
| Field         | Type   | Required | Notes                          |
|---------------|--------|----------|--------------------------------|
| `name`        | string | yes      | 1-255 chars                    |
| `slug`        | string | no       | 1-100 chars. Auto-generated from name if omitted |
| `description` | string | no       | Max 5000 chars                 |

`additionalProperties: false`.

**Response `200`** -- the created team object.

**Errors:** `400` slug already exists in the organization.

#### `GET /api/teams/:teamId`

Get team details including organization info and the caller's role.

**Auth:** required. Must be a team member.

**Response `200`**
```json
{
  "id": "uuid", "name": "...", "slug": "...", "description": "...",
  "organizationId": "uuid", "createdAt": "...", "updatedAt": "...",
  "organization": { "id": "uuid", "name": "...", "slug": "..." },
  "userRole": "team_member"
}
```

#### `PUT /api/teams/:teamId`

Update team details.

**Auth:** required. Must be `team_admin` or higher.

**Request Body**
| Field         | Type   | Required | Notes            |
|---------------|--------|----------|------------------|
| `name`        | string | no       | 1-255 chars      |
| `description` | string | no       | Max 5000 chars   |

`additionalProperties: false`.

**Response `200`** -- the updated team object.

#### `DELETE /api/teams/:teamId`

Delete a team.

**Auth:** required. Must be `org_admin`. Team must belong to caller's organization.

**Response `200`**
```json
{ "message": "Team deleted successfully" }
```

#### `GET /api/teams/:teamId/members`

List team members.

**Auth:** required. Must be a team member.

**Response `200`**
```json
{
  "members": [
    { "id": "uuid", "email": "...", "name": "...", "role": "team_member", "joinedAt": "..." }
  ]
}
```

#### `POST /api/teams/:teamId/members`

Add a member to the team. Target user must be in the same organization.

**Auth:** required. Must be `team_admin` or higher.

**Request Body**
| Field    | Type   | Required | Notes                                           |
|----------|--------|----------|-------------------------------------------------|
| `userId` | uuid   | yes      |                                                 |
| `role`   | string | no       | Default `team_member`. One of: `org_admin`, `team_admin`, `team_member`, `team_viewer` |

**Response `200`** -- the membership record.

**Errors:** `400` already a member or different organization, `403` cannot assign higher role, `404` user or team not found.

#### `PUT /api/teams/:teamId/members/:userId`

Update a member's role.

**Auth:** required. Must be `team_admin` or higher.

**Request Body**
| Field  | Type   | Required | Notes                                    |
|--------|--------|----------|------------------------------------------|
| `role` | string | yes      | One of: `org_admin`, `team_admin`, `team_member`, `team_viewer` |

**Response `200`** -- the updated membership record.

**Errors:** `403` cannot assign higher role, `404` membership not found.

#### `DELETE /api/teams/:teamId/members/:userId`

Remove a member from the team. Cannot remove yourself.

**Auth:** required. Must be `team_admin` or higher. Cannot remove members with an equal or higher role.

**Response `200`**
```json
{ "message": "Member removed successfully" }
```

**Errors:** `400` cannot remove yourself, `403` insufficient role, `404` membership not found.

---

### Symbols

Symbols are team-scoped reusable component definitions shared across prototypes. Routes are nested under `/api/teams/:teamId/symbols`.

#### `GET /api/teams/:teamId/symbols`

List all symbols for a team.

**Auth:** required. Must be a team member.

**Response `200`**
```json
{
  "symbols": [
    { "id": "uuid", "teamId": "uuid", "name": "...", "symbolData": { ... }, "createdBy": "uuid", "createdAt": "...", "updatedAt": "..." }
  ]
}
```

#### `POST /api/teams/:teamId/symbols`

Create a new symbol.

**Auth:** required. Must be a team member.

**Request Body**
| Field        | Type   | Required | Notes          |
|--------------|--------|----------|----------------|
| `name`       | string | yes      | 1-255 chars    |
| `symbolData` | object | yes      | GrapesJS data  |

**Response `201`** -- the created symbol object.

#### `GET /api/teams/:teamId/symbols/:symbolId`

Get a specific symbol.

**Auth:** required. Must be a team member.

**Response `200`** -- the symbol object.

**Errors:** `404` not found.

#### `PUT /api/teams/:teamId/symbols/:symbolId`

Update a symbol.

**Auth:** required. Must be the symbol creator or a team admin.

**Request Body**
| Field        | Type   | Required | Notes          |
|--------------|--------|----------|----------------|
| `name`       | string | no       | 1-255 chars    |
| `symbolData` | object | no       | GrapesJS data  |

**Response `200`** -- the updated symbol object.

**Errors:** `403` not creator or admin, `404` not found.

#### `DELETE /api/teams/:teamId/symbols/:symbolId`

Delete a symbol.

**Auth:** required. Must be the symbol creator or a team admin.

**Response `200`**
```json
{ "message": "Symbol deleted successfully" }
```

**Errors:** `403` not creator or admin, `404` not found.

---

### Invitations

#### `POST /api/invitations/teams/:teamId/invitations`

Create a team invitation. In development, the response includes an `inviteUrl` field. In production, the token should be delivered via email.

**Auth:** required. Must be `team_admin` or higher in the target team.

**Request Body**
| Field   | Type   | Required | Notes                                    |
|---------|--------|----------|------------------------------------------|
| `email` | string | yes      | Valid email format                       |
| `role`  | string | no       | Default `team_member`. Cannot exceed caller's role |

**Response `201`**
```json
{
  "id": "uuid",
  "email": "...",
  "role": "team_member",
  "teamId": "uuid",
  "teamName": "...",
  "expiresAt": "...",
  "status": "pending",
  "inviteUrl": "/invite/<token>"
}
```

Invitations expire after **7 days**.

**Errors:** `400` already a member or invitation already sent, `403` cannot invite with higher role.

#### `GET /api/invitations`

List pending invitations for the current user's email (non-expired only).

**Auth:** required.

**Response `200`**
```json
{
  "invitations": [
    {
      "id": "uuid", "email": "...", "role": "...", "expiresAt": "...", "createdAt": "...",
      "teamId": "uuid", "teamName": "...", "teamSlug": "...",
      "organizationId": "uuid", "organizationName": "..."
    }
  ]
}
```

#### `POST /api/invitations/:token/accept`

Accept an invitation. Adds the user to the team and updates their organization if needed.

**Auth:** required. The authenticated user's email must match the invitation email.

**Response `200`**
```json
{
  "message": "Invitation accepted",
  "membership": { "teamId": "uuid", "role": "team_member", "joinedAt": "..." }
}
```

**Errors:** `400` already accepted/expired, or user belongs to a different organization. `404` not found or wrong email.

#### `POST /api/invitations/:token/decline`

Decline an invitation.

**Auth:** required. Must be the invited user.

**Response `200`**
```json
{ "message": "Invitation declined" }
```

**Errors:** `400` not pending, `403` wrong email, `404` not found.

#### `DELETE /api/invitations/:invitationId`

Cancel an invitation.

**Auth:** required. Must be `team_admin` or `org_admin` in the invitation's team.

**Response `200`**
```json
{ "message": "Invitation cancelled" }
```

**Errors:** `403` not a team admin, `404` not found.

#### `GET /api/invitations/teams/:teamId/invitations`

List all invitations (any status) for a team, including inviter info.

**Auth:** required. Must be `team_admin` or higher.

**Response `200`**
```json
{
  "invitations": [
    {
      "id": "uuid", "email": "...", "role": "...", "status": "pending",
      "expiresAt": "...", "createdAt": "...",
      "invitedById": "uuid", "invitedByEmail": "...", "invitedByName": "..."
    }
  ]
}
```

---

## Rate Limiting

Global rate limit of **100 requests per minute per IP**. Specific overrides:

| Endpoint               | Limit           |
|------------------------|-----------------|
| `POST /api/auth/login` | 5 per minute    |
| `POST /api/auth/register` | 3 per minute |
| `GET /api/health`      | Exempt          |

Rate limit headers are included in responses (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, etc.).

## Pagination

Paginated endpoints accept `?page=1&limit=20`. Default page size is **20**, maximum is **100**. Responses include `total`, `page`, and `limit` fields alongside the data array.

## Optimistic Concurrency

The `PUT /api/prototypes/:slug` endpoint supports optimistic concurrency control. Send the prototype's current `version` number in the `If-Match` header. If the version on the server differs, the request is rejected with `409 Conflict`:

```json
{
  "message": "This prototype was modified by another session",
  "serverVersion": 5,
  "yourVersion": 4
}
```

The version is also checked atomically inside a database transaction to prevent TOCTOU races.

## Error Response Format

All error responses use a consistent JSON shape:

```json
{
  "message": "Human-readable error description"
}
```

In production, `500` errors return a generic message. The original error is logged server-side but not leaked to the client.

## Roles

The system uses four roles in a hierarchy (highest to lowest):

| Role           | Level | Capabilities |
|----------------|-------|--------------|
| `org_admin`    | 100   | Full organization access, manage teams and all members |
| `team_admin`   | 75    | Manage team members, edit all team content |
| `team_member`  | 50    | Create/edit own content, view team content |
| `team_viewer`  | 25    | Read-only access to team content |

Admins can only assign roles **below** their own level.

## Body Size Limits

Fastify `bodyLimit` is set to **8 MB** to accommodate combined `htmlContent` (2 MB max) and `grapesData` (5 MB max) payloads.
