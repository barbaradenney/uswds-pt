/**
 * Authentication Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  createUser,
  findUserByEmail,
  verifyPassword,
} from '../plugins/auth.js';

interface LoginBody {
  email: string;
  password: string;
}

interface RegisterBody {
  email: string;
  password: string;
  name?: string;
}

export async function authRoutes(app: FastifyInstance) {
  /**
   * POST /api/auth/login
   * Authenticate a user and return a JWT token
   */
  app.post<{ Body: LoginBody }>(
    '/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      // Find user
      const user = await findUserByEmail(email);
      if (!user) {
        return reply.status(401).send({ message: 'Invalid email or password' });
      }

      // Check if user is active
      if (!user.isActive) {
        return reply.status(401).send({ message: 'Account is disabled' });
      }

      // Verify password
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return reply.status(401).send({ message: 'Invalid email or password' });
      }

      // Generate JWT token
      const token = app.jwt.sign(
        { id: user.id, email: user.email },
        { expiresIn: '7d' }
      );

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      };
    }
  );

  /**
   * POST /api/auth/register
   * Create a new user account
   */
  app.post<{ Body: RegisterBody }>(
    '/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            name: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password, name } = request.body;

      // Check if user already exists
      const existing = await findUserByEmail(email);
      if (existing) {
        return reply.status(400).send({ message: 'Email already registered' });
      }

      // Create user
      const user = await createUser(email, password, name);

      // Generate JWT token
      const token = app.jwt.sign(
        { id: user.id, email: user.email },
        { expiresIn: '7d' }
      );

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      };
    }
  );

  /**
   * GET /api/auth/me
   * Get the current authenticated user
   */
  app.get(
    '/me',
    {
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      return {
        id: request.user.id,
        email: request.user.email,
      };
    }
  );
}
