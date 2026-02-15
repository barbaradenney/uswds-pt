/**
 * Prototype Push Routes
 * GitHub push and handoff endpoints for prototypes
 *
 * POST /:slug/push          - Push prototype to team's connected GitHub repo
 * POST /:slug/push-handoff  - Push clean HTML to team's handoff GitHub repo
 */

import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { prototypes, users, githubTeamConnections, githubHandoffConnections } from '../db/schema.js';
import { getAuthUser } from '../middleware/permissions.js';
import { pushFilesToGitHub, createGitHubBranch } from '../lib/github-push.js';
import { PrototypeParams, canEditPrototype } from './prototype-helpers.js';

// ============================================================================
// Shared push helper
// ============================================================================

interface PushFile {
  path: string;
  content: string;
}

interface ExecutePushOptions {
  /** The prototype record from the database */
  prototype: typeof prototypes.$inferSelect;
  /** The authenticated user's ID */
  userId: string;
  /** Which connection type to use */
  connectionType: 'push' | 'handoff';
  /** Files to push to the repository */
  files: PushFile[];
  /** Git commit message */
  commitMessage: string;
}

/**
 * Shared logic for pushing prototype data to a GitHub repository.
 *
 * Both push and push-handoff follow the same flow:
 * 1. Verify prototype belongs to a team
 * 2. Look up the team's GitHub connection (push or handoff)
 * 3. Get the user's GitHub access token
 * 4. Create the branch if needed
 * 5. Push files and return the result
 *
 * The only differences are:
 * - Which connection table to query (githubTeamConnections vs githubHandoffConnections)
 * - Which branch prefix to use ("uswds-pt/" vs "handoff/")
 * - Whether to update push metadata on the prototype (push only)
 */
async function executePush(opts: ExecutePushOptions) {
  const { prototype, userId, connectionType, files, commitMessage } = opts;

  if (!prototype.teamId) {
    return { error: 'Prototype must belong to a team', statusCode: 400 };
  }

  // Look up team-level GitHub connection
  const connectionTable = connectionType === 'push' ? githubTeamConnections : githubHandoffConnections;
  const [connection] = await db
    .select()
    .from(connectionTable)
    .where(eq(connectionTable.teamId, prototype.teamId))
    .limit(1);

  if (!connection) {
    const label = connectionType === 'push' ? 'GitHub connection' : 'handoff connection';
    return { error: `No ${label} for this team`, statusCode: 400 };
  }

  // Get user's GitHub token
  const [user] = await db
    .select({ githubAccessToken: users.githubAccessToken })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.githubAccessToken) {
    return { error: 'Your GitHub account is not linked. Connect via Settings.', statusCode: 400 };
  }

  // Git branch prefix differs between push and handoff
  const branchPrefix = connectionType === 'push' ? 'uswds-pt' : 'handoff';
  const gitBranch = `${branchPrefix}/${prototype.branchSlug}`;

  // Try to create the branch (may already exist)
  try {
    await createGitHubBranch({
      encryptedAccessToken: user.githubAccessToken,
      owner: connection.repoOwner,
      repo: connection.repoName,
      branchName: gitBranch,
      fromBranch: connection.defaultBranch,
    });
  } catch {
    // Branch may already exist
  }

  const result = await pushFilesToGitHub({
    encryptedAccessToken: user.githubAccessToken,
    owner: connection.repoOwner,
    repo: connection.repoName,
    branch: gitBranch,
    files,
    commitMessage,
  });

  // Update prototype with push metadata (push-on-save only, not handoff)
  if (connectionType === 'push') {
    await db
      .update(prototypes)
      .set({
        lastGithubPushAt: new Date(),
        lastGithubCommitSha: result.commitSha,
      })
      .where(eq(prototypes.id, prototype.id));
  }

  return {
    commitSha: result.commitSha,
    commitUrl: result.htmlUrl,
    branch: gitBranch,
  };
}

// ============================================================================
// Route registration
// ============================================================================

export async function prototypePushRoutes(app: FastifyInstance) {
  /**
   * POST /api/prototypes/:slug/push
   * Manually push a prototype to the team's connected GitHub repo
   */
  app.post<{ Params: PrototypeParams }>(
    '/:slug/push',
    {
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const { slug } = request.params;
      const userId = getAuthUser(request).id;

      // Get prototype
      const [prototype] = await db
        .select()
        .from(prototypes)
        .where(eq(prototypes.slug, slug))
        .limit(1);

      if (!prototype) {
        return reply.status(404).send({ message: 'Prototype not found' });
      }

      // Check edit permission
      if (!(await canEditPrototype(userId, prototype))) {
        return reply.status(403).send({ message: 'Access denied' });
      }

      // Build the 3 files for a full prototype backup
      const grapesData = prototype.grapesData as Record<string, unknown> | null;
      const states = grapesData && Array.isArray((grapesData as Record<string, unknown>).states)
        ? (grapesData as Record<string, unknown>).states
        : [];

      const files = [
        {
          path: '.uswds-pt/project-data.json',
          content: JSON.stringify(grapesData, null, 2),
        },
        {
          path: '.uswds-pt/metadata.json',
          content: JSON.stringify({
            name: prototype.name,
            description: prototype.description,
            version: prototype.version,
            branchSlug: prototype.branchSlug,
            slug: prototype.slug,
            states,
            updatedAt: prototype.updatedAt.toISOString(),
            createdAt: prototype.createdAt.toISOString(),
            generator: 'uswds-pt',
          }, null, 2),
        },
        {
          path: 'output/index.html',
          content: prototype.htmlContent,
        },
      ];

      const result = await executePush({
        prototype,
        userId,
        connectionType: 'push',
        files,
        commitMessage: `Update ${prototype.name} (v${prototype.version})`,
      });

      if ('error' in result) {
        return reply.status(result.statusCode).send({ message: result.error });
      }

      return result;
    }
  );

  /**
   * POST /api/prototypes/:slug/push-handoff
   * Push clean HTML to the team's handoff GitHub repo for developer handoff
   */
  app.post<{ Params: PrototypeParams; Body: { htmlContent: string } }>(
    '/:slug/push-handoff',
    {
      preHandler: [app.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['htmlContent'],
          properties: {
            htmlContent: { type: 'string', maxLength: 5 * 1024 * 1024 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params;
      const userId = getAuthUser(request).id;
      const { htmlContent } = request.body;

      // Get prototype
      const [prototype] = await db
        .select()
        .from(prototypes)
        .where(eq(prototypes.slug, slug))
        .limit(1);

      if (!prototype) {
        return reply.status(404).send({ message: 'Prototype not found' });
      }

      // Check edit permission
      if (!(await canEditPrototype(userId, prototype))) {
        return reply.status(403).send({ message: 'Access denied' });
      }

      // Push a single clean index.html
      const files = [
        {
          path: 'index.html',
          content: htmlContent,
        },
      ];

      const result = await executePush({
        prototype,
        userId,
        connectionType: 'handoff',
        files,
        commitMessage: `Handoff: ${prototype.name}`,
      });

      if ('error' in result) {
        return reply.status(result.statusCode).send({ message: result.error });
      }

      return result;
    }
  );
}
