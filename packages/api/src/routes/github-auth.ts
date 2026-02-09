/**
 * GitHub OAuth Routes
 *
 * Handles GitHub OAuth flow:
 * GET /api/auth/github - Redirects to GitHub authorization page
 * GET /api/auth/github/callback - Handles OAuth callback, creates/links user, issues JWT
 */

import crypto from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import {
  findUserByGithubId,
  findUserByEmail,
  createOAuthUser,
  linkGithubToUser,
  updateGithubToken,
} from '../plugins/auth.js';
import {
  getGitHubAuthUrl,
  exchangeCodeForToken,
  fetchGitHubUser,
  fetchGitHubEmail,
  encryptToken,
} from '../lib/github-oauth.js';
import { JWT_EXPIRY } from '../constants.js';
import { normalizeEmail } from '../lib/email.js';
import { setupNewUserOrganization } from './auth.js';

// OAuth state cookie name
const STATE_COOKIE = 'gh_oauth_state';

export async function githubAuthRoutes(app: FastifyInstance) {
  /**
   * GET /api/auth/github
   * Redirects to GitHub OAuth authorization page.
   * Sets an HTTP-only cookie with the state parameter for CSRF validation.
   */
  app.get('/github', async (_request, reply) => {
    try {
      const { url, state } = getGitHubAuthUrl();

      // Store state in a secure, HTTP-only cookie for CSRF validation on callback
      const isProduction = process.env.NODE_ENV === 'production';
      reply.header(
        'Set-Cookie',
        `${STATE_COOKIE}=${state}; HttpOnly; SameSite=Lax; Max-Age=600; Path=/api/auth/github${isProduction ? '; Secure' : ''}`
      );

      return reply.redirect(url);
    } catch (err) {
      app.log.error(err, 'Failed to build GitHub auth URL');
      return reply.status(500).send({ message: 'GitHub OAuth not configured' });
    }
  });

  /**
   * GET /api/auth/github/callback
   * Handles the OAuth callback from GitHub.
   * Validates the state parameter against the cookie to prevent CSRF.
   */
  app.get<{ Querystring: { code?: string; error?: string; state?: string } }>(
    '/github/callback',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
      schema: {
        querystring: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            error: { type: 'string' },
            state: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { code, error, state } = request.query;
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      // Clear the state cookie regardless of outcome
      reply.header(
        'Set-Cookie',
        `${STATE_COOKIE}=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/api/auth/github`
      );

      if (error || !code) {
        return reply.redirect(`${frontendUrl}/#/login?error=oauth_denied`);
      }

      // CSRF: Validate state parameter against cookie
      const cookieHeader = request.headers.cookie || '';
      const stateCookie = cookieHeader
        .split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${STATE_COOKIE}=`))
        ?.substring(`${STATE_COOKIE}=`.length);

      const stateBuf = state ? Buffer.from(state) : Buffer.alloc(0);
      const cookieBuf = stateCookie ? Buffer.from(stateCookie) : Buffer.alloc(0);
      if (!state || !stateCookie || stateBuf.length !== cookieBuf.length || !crypto.timingSafeEqual(
        stateBuf,
        cookieBuf,
      )) {
        app.log.warn('OAuth state mismatch — possible CSRF attempt');
        return reply.redirect(`${frontendUrl}/#/login?error=oauth_failed`);
      }

      try {
        // 1. Exchange code for access token
        const tokenData = await exchangeCodeForToken(code);
        const accessToken = tokenData.access_token;
        const encryptedToken = encryptToken(accessToken);

        // 2. Fetch GitHub user profile
        const ghUser = await fetchGitHubUser(accessToken);

        // 3. Get verified email — ALWAYS use /user/emails endpoint
        // ghUser.email from /user may be unverified; only fetchGitHubEmail
        // checks the `verified` flag, preventing account takeover via unverified email.
        let email = await fetchGitHubEmail(accessToken);
        if (!email) {
          return reply.redirect(`${frontendUrl}/#/login?error=no_email`);
        }
        email = normalizeEmail(email);

        // 4. Find or create user
        let userId: string;

        // Check by GitHub ID first (returning user)
        const existingByGithub = await findUserByGithubId(ghUser.id);
        if (existingByGithub) {
          // Check isActive before allowing login
          if (!existingByGithub.isActive) {
            return reply.redirect(`${frontendUrl}/#/login?error=account_disabled`);
          }
          userId = existingByGithub.id;
          // Update token + refresh username/avatar in case they changed
          await updateGithubToken(userId, encryptedToken);
          await db
            .update(users)
            .set({
              githubUsername: ghUser.login,
              avatarUrl: ghUser.avatar_url,
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId));
        } else {
          // Check by verified email for account linking
          const existingByEmail = await findUserByEmail(email);
          if (existingByEmail) {
            // Check isActive before allowing login
            if (!existingByEmail.isActive) {
              return reply.redirect(`${frontendUrl}/#/login?error=account_disabled`);
            }
            // Link GitHub to existing account (email was verified by GitHub)
            userId = existingByEmail.id;
            await linkGithubToUser(
              userId,
              ghUser.id,
              ghUser.login,
              encryptedToken,
              ghUser.avatar_url,
            );
          } else {
            // New user — create account
            const newUser = await createOAuthUser(
              email,
              ghUser.name || ghUser.login,
              ghUser.id,
              ghUser.login,
              encryptedToken,
              ghUser.avatar_url,
            );
            userId = newUser.id;
            await setupNewUserOrganization(userId, email);
          }
        }

        // 5. Issue JWT
        const token = app.jwt.sign(
          { id: userId, email },
          { expiresIn: JWT_EXPIRY },
        );

        // 6. Redirect to frontend with token in hash fragment
        // (hash fragments are not sent to the server on subsequent requests)
        return reply.redirect(`${frontendUrl}/#/auth/callback?token=${encodeURIComponent(token)}`);
      } catch (err) {
        app.log.error(err, 'GitHub OAuth callback failed');
        return reply.redirect(`${frontendUrl}/#/login?error=oauth_failed`);
      }
    },
  );
}
