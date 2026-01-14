/**
 * Invitation Routes
 * Handles team invitation endpoints
 */

import { FastifyInstance } from 'fastify';
import { eq, and, gt } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { invitations, teams, teamMemberships, users, organizations } from '../db/schema.js';
import { ROLES, canAssignRole, Role, INVITATION_STATUS, INVITATION_EXPIRY_DAYS } from '../db/roles.js';
import {
  getAuthUser,
  requireTeamMember,
  requireTeamRole,
} from '../middleware/permissions.js';
import { normalizeEmail } from '../lib/email.js';

interface CreateInvitationBody {
  email: string;
  role?: string;
}

/**
 * Generate a secure random token for invitations
 */
function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calculate expiration date for invitation
 */
function getExpirationDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + INVITATION_EXPIRY_DAYS);
  return date;
}

export async function invitationRoutes(app: FastifyInstance) {
  /**
   * POST /api/teams/:teamId/invitations
   * Create a new invitation (team_admin only)
   */
  app.post<{ Params: { teamId: string }; Body: CreateInvitationBody }>(
    '/teams/:teamId/invitations',
    {
      preHandler: [
        app.authenticate,
        requireTeamMember('teamId'),
        requireTeamRole(ROLES.TEAM_ADMIN),
      ],
      schema: {
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: Object.values(ROLES) },
          },
        },
      },
    },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { teamId } = request.params;
      const { email, role = ROLES.TEAM_MEMBER } = request.body;

      // Check if user can assign this role
      const userRole = request.teamMembership?.role as Role;
      if (!canAssignRole(userRole, role as Role)) {
        return reply.status(403).send({ message: 'Cannot invite with a role higher than your own' });
      }

      // Check if user is already a member
      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizeEmail(email)))
        .limit(1);

      if (existingUser) {
        const [existingMembership] = await db
          .select()
          .from(teamMemberships)
          .where(
            and(
              eq(teamMemberships.teamId, teamId),
              eq(teamMemberships.userId, existingUser.id)
            )
          )
          .limit(1);

        if (existingMembership) {
          return reply.status(400).send({ message: 'User is already a member of this team' });
        }
      }

      // Check for existing pending invitation
      const [existingInvitation] = await db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.teamId, teamId),
            eq(invitations.email, normalizeEmail(email)),
            eq(invitations.status, INVITATION_STATUS.PENDING)
          )
        )
        .limit(1);

      if (existingInvitation) {
        return reply.status(400).send({ message: 'Invitation already sent to this email' });
      }

      // Create invitation
      const [invitation] = await db
        .insert(invitations)
        .values({
          email: normalizeEmail(email),
          teamId,
          role,
          token: generateInvitationToken(),
          expiresAt: getExpirationDate(),
          invitedBy: authUser.id,
          status: INVITATION_STATUS.PENDING,
        })
        .returning();

      // Get team info for response
      const [team] = await db
        .select({ name: teams.name })
        .from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);

      return {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        teamId: invitation.teamId,
        teamName: team?.name,
        expiresAt: invitation.expiresAt,
        status: invitation.status,
        // In a real app, you'd send an email with this token
        // For now, we return it so it can be used manually
        inviteUrl: `/invite/${invitation.token}`,
      };
    }
  );

  /**
   * GET /api/invitations
   * List pending invitations for the current user's email
   */
  app.get(
    '/',
    {
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const authUser = getAuthUser(request);

      // Get user's email
      const [user] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, authUser.id))
        .limit(1);

      if (!user) {
        return reply.status(404).send({ message: 'User not found' });
      }

      // Get pending invitations for this email
      const pendingInvitations = await db
        .select({
          id: invitations.id,
          email: invitations.email,
          role: invitations.role,
          token: invitations.token,
          expiresAt: invitations.expiresAt,
          createdAt: invitations.createdAt,
          teamId: invitations.teamId,
          teamName: teams.name,
          teamSlug: teams.slug,
          organizationId: teams.organizationId,
          organizationName: organizations.name,
        })
        .from(invitations)
        .innerJoin(teams, eq(invitations.teamId, teams.id))
        .innerJoin(organizations, eq(teams.organizationId, organizations.id))
        .where(
          and(
            eq(invitations.email, normalizeEmail(user.email)),
            eq(invitations.status, INVITATION_STATUS.PENDING),
            gt(invitations.expiresAt, new Date())
          )
        );

      return { invitations: pendingInvitations };
    }
  );

  /**
   * POST /api/invitations/:token/accept
   * Accept an invitation
   */
  app.post<{ Params: { token: string } }>(
    '/:token/accept',
    {
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { token } = request.params;

      // Get user's email
      const [user] = await db
        .select({ id: users.id, email: users.email, organizationId: users.organizationId })
        .from(users)
        .where(eq(users.id, authUser.id))
        .limit(1);

      if (!user) {
        return reply.status(404).send({ message: 'User not found' });
      }

      // Find the invitation
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.token, token))
        .limit(1);

      if (!invitation) {
        return reply.status(404).send({ message: 'Invitation not found' });
      }

      // Verify invitation is for this user
      if (normalizeEmail(invitation.email) !== normalizeEmail(user.email)) {
        return reply.status(403).send({ message: 'This invitation is for a different email address' });
      }

      // Check if invitation is still valid
      if (invitation.status !== INVITATION_STATUS.PENDING) {
        return reply.status(400).send({ message: `Invitation has already been ${invitation.status}` });
      }

      if (new Date() > invitation.expiresAt) {
        // Mark as expired
        await db
          .update(invitations)
          .set({ status: INVITATION_STATUS.EXPIRED })
          .where(eq(invitations.id, invitation.id));

        return reply.status(400).send({ message: 'Invitation has expired' });
      }

      // Get team to find organization
      const [team] = await db
        .select({ organizationId: teams.organizationId })
        .from(teams)
        .where(eq(teams.id, invitation.teamId))
        .limit(1);

      if (!team) {
        return reply.status(404).send({ message: 'Team not found' });
      }

      // Update user's organization if they don't have one
      if (!user.organizationId) {
        await db
          .update(users)
          .set({ organizationId: team.organizationId })
          .where(eq(users.id, user.id));
      } else if (user.organizationId !== team.organizationId) {
        return reply.status(400).send({
          message: 'You already belong to a different organization. Contact support to transfer.',
        });
      }

      // Create team membership
      const [membership] = await db
        .insert(teamMemberships)
        .values({
          teamId: invitation.teamId,
          userId: user.id,
          role: invitation.role,
          invitedBy: invitation.invitedBy,
        })
        .returning();

      // Mark invitation as accepted
      await db
        .update(invitations)
        .set({
          status: INVITATION_STATUS.ACCEPTED,
          acceptedAt: new Date(),
        })
        .where(eq(invitations.id, invitation.id));

      return {
        message: 'Invitation accepted',
        membership: {
          teamId: membership.teamId,
          role: membership.role,
          joinedAt: membership.joinedAt,
        },
      };
    }
  );

  /**
   * POST /api/invitations/:token/decline
   * Decline an invitation (by the invited user)
   */
  app.post<{ Params: { token: string } }>(
    '/:token/decline',
    {
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { token } = request.params;

      // Get user's email
      const [user] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, authUser.id))
        .limit(1);

      if (!user) {
        return reply.status(404).send({ message: 'User not found' });
      }

      // Find the invitation
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.token, token))
        .limit(1);

      if (!invitation) {
        return reply.status(404).send({ message: 'Invitation not found' });
      }

      // Verify invitation is for this user
      if (normalizeEmail(invitation.email) !== normalizeEmail(user.email)) {
        return reply.status(403).send({ message: 'This invitation is for a different email address' });
      }

      // Check if invitation is still pending
      if (invitation.status !== INVITATION_STATUS.PENDING) {
        return reply.status(400).send({ message: `Invitation has already been ${invitation.status}` });
      }

      // Mark as declined
      await db
        .update(invitations)
        .set({ status: INVITATION_STATUS.DECLINED })
        .where(eq(invitations.id, invitation.id));

      return { message: 'Invitation declined' };
    }
  );

  /**
   * DELETE /api/invitations/:invitationId
   * Cancel an invitation (team_admin only)
   */
  app.delete<{ Params: { invitationId: string } }>(
    '/:invitationId',
    {
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { invitationId } = request.params;

      // Get the invitation
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.id, invitationId))
        .limit(1);

      if (!invitation) {
        return reply.status(404).send({ message: 'Invitation not found' });
      }

      // Check if user has permission to cancel (must be team_admin of the team)
      const [membership] = await db
        .select({ role: teamMemberships.role })
        .from(teamMemberships)
        .where(
          and(
            eq(teamMemberships.teamId, invitation.teamId),
            eq(teamMemberships.userId, authUser.id)
          )
        )
        .limit(1);

      if (!membership) {
        return reply.status(403).send({ message: 'Not a member of this team' });
      }

      const userRole = membership.role as Role;
      if (userRole !== ROLES.ORG_ADMIN && userRole !== ROLES.TEAM_ADMIN) {
        return reply.status(403).send({ message: 'Only team admins can cancel invitations' });
      }

      // Cancel the invitation
      await db
        .update(invitations)
        .set({ status: INVITATION_STATUS.CANCELLED })
        .where(eq(invitations.id, invitationId));

      return { message: 'Invitation cancelled' };
    }
  );

  /**
   * GET /api/teams/:teamId/invitations
   * List pending invitations for a team (team_admin only)
   */
  app.get<{ Params: { teamId: string } }>(
    '/teams/:teamId/invitations',
    {
      preHandler: [
        app.authenticate,
        requireTeamMember('teamId'),
        requireTeamRole(ROLES.TEAM_ADMIN),
      ],
    },
    async (request, reply) => {
      const { teamId } = request.params;

      const teamInvitations = await db
        .select({
          id: invitations.id,
          email: invitations.email,
          role: invitations.role,
          status: invitations.status,
          expiresAt: invitations.expiresAt,
          createdAt: invitations.createdAt,
          invitedById: invitations.invitedBy,
          invitedByEmail: users.email,
          invitedByName: users.name,
        })
        .from(invitations)
        .leftJoin(users, eq(invitations.invitedBy, users.id))
        .where(eq(invitations.teamId, teamId));

      return { invitations: teamInvitations };
    }
  );
}
