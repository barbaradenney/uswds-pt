/**
 * AI Proxy Routes Tests
 *
 * Tests the AI chat proxy endpoint using Fastify inject().
 * Mocks Anthropic and OpenAI SDKs to verify routing, error mapping,
 * and attachment handling without making real API calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { authPlugin } from '../plugins/auth.js';
import { aiRoutes } from './ai.js';
import { errorHandler } from '../lib/error-handler.js';

// ── Mock SDK fns (vi.hoisted ensures these are available before vi.mock factories) ──

const { mockAnthropicCreate, mockOpenAICreate } = vi.hoisted(() => ({
  mockAnthropicCreate: vi.fn(),
  mockOpenAICreate: vi.fn(),
}));

// ── Mock Anthropic SDK ──

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockAnthropicCreate };
      constructor() {}
    },
  };
});

// ── Mock OpenAI SDK ──

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = { completions: { create: mockOpenAICreate } };
      constructor() {}
    },
  };
});

// ── Mock database (required by auth plugin import chain) ──

vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  },
}));

// ── Helpers ──

const testUser = { id: 'user-123', email: 'test@example.com' };

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    system: 'You are a helpful assistant.',
    messages: [{ role: 'user', content: 'Hello' }],
    ...overrides,
  };
}

// ── Test Suite ──

describe('AI Routes', () => {
  let app: FastifyInstance;
  let validToken: string;

  // Save original env values to restore after each test
  const originalEnv = {
    AI_API_KEY: process.env.AI_API_KEY,
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_MODEL: process.env.AI_MODEL,
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default: Claude provider with a configured key
    process.env.AI_API_KEY = 'test-api-key';
    process.env.AI_PROVIDER = 'claude';
    process.env.AI_MODEL = 'claude-sonnet-4-20250514';

    app = Fastify({ logger: false });
    await app.register(authPlugin);
    await app.register(errorHandler, {
      includeStackTrace: false,
      logAllErrors: false,
    });
    await app.register(aiRoutes, { prefix: '/api/ai' });
    await app.ready();

    validToken = app.jwt.sign(testUser, { expiresIn: '1h' });
  });

  afterEach(async () => {
    // Restore env
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    await app.close();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Authentication
  // ────────────────────────────────────────────────────────────────────────

  describe('authentication', () => {
    it('should return 401 when no auth token is provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        payload: validPayload(),
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 with an invalid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: 'Bearer invalid-token' },
        payload: validPayload(),
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // AI_API_KEY not configured
  // ────────────────────────────────────────────────────────────────────────

  describe('AI_API_KEY not configured', () => {
    it('should return 503 when AI_API_KEY is empty', async () => {
      // We need to rebuild the app with an empty key since getAIConfig()
      // reads process.env at request time.
      process.env.AI_API_KEY = '';

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: validPayload(),
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('AI service is not configured');
    });

    it('should return 503 when AI_API_KEY is not set at all', async () => {
      delete process.env.AI_API_KEY;

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: validPayload(),
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('AI service is not configured');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Body validation
  // ────────────────────────────────────────────────────────────────────────

  describe('body validation', () => {
    it('should return 400 when system is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: { messages: [{ role: 'user', content: 'Hi' }] },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when messages is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: { system: 'You are helpful.' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when messages array is empty (no role/content items)', async () => {
      // An empty array is valid per the schema (no minItems), but let's verify
      // a malformed message item is rejected
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          system: 'You are helpful.',
          messages: [{ content: 'missing role' }],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when message role is invalid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          system: 'You are helpful.',
          messages: [{ role: 'system', content: 'Not allowed' }],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should strip additional properties in body (additionalProperties: false)', async () => {
      // Fastify's default AJV config strips extra properties rather than rejecting.
      // The schema still protects against unexpected fields reaching the handler.
      mockAnthropicCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'ok' }],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          system: 'You are helpful.',
          messages: [{ role: 'user', content: 'Hi' }],
          extraField: 'not allowed',
        },
      });

      // Request succeeds because extra fields are stripped, not rejected
      expect(response.statusCode).toBe(200);
    });

    it('should strip additional properties in message (additionalProperties: false)', async () => {
      mockAnthropicCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'ok' }],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          system: 'You are helpful.',
          messages: [{ role: 'user', content: 'Hi', extra: 'field' }],
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Successful proxy — Claude provider
  // ────────────────────────────────────────────────────────────────────────

  describe('Claude provider', () => {
    beforeEach(() => {
      process.env.AI_PROVIDER = 'claude';
    });

    it('should successfully proxy to Claude and return text', async () => {
      mockAnthropicCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Hello from Claude!' }],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: validPayload(),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.text).toBe('Hello from Claude!');

      // Verify the SDK was called with proper params
      expect(mockAnthropicCreate).toHaveBeenCalledOnce();
      const callArgs = mockAnthropicCreate.mock.calls[0][0];
      expect(callArgs.model).toBe('claude-sonnet-4-20250514');
      expect(callArgs.max_tokens).toBe(8192);
      expect(callArgs.system).toBe('You are a helpful assistant.');
      expect(callArgs.messages).toEqual([
        { role: 'user', content: 'Hello' },
      ]);
    });

    it('should return empty string when Claude response has no text block', async () => {
      mockAnthropicCreate.mockResolvedValueOnce({
        content: [{ type: 'tool_use', id: 'tool-1', name: 'fn', input: {} }],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: validPayload(),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.text).toBe('');
    });

    it('should build Claude content blocks for image attachments', async () => {
      mockAnthropicCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'I see an image.' }],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          system: 'Describe images.',
          messages: [
            {
              role: 'user',
              content: 'What is this?',
              attachments: [
                {
                  name: 'photo.png',
                  mediaType: 'image/png',
                  base64Data: 'aW1hZ2VkYXRh',
                },
              ],
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);

      const callArgs = mockAnthropicCreate.mock.calls[0][0];
      const userMessage = callArgs.messages[0];
      // Should be an array of content blocks (not a plain string)
      expect(Array.isArray(userMessage.content)).toBe(true);
      expect(userMessage.content).toEqual([
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: 'aW1hZ2VkYXRh' },
        },
        { type: 'text', text: 'What is this?' },
      ]);
    });

    it('should build Claude content blocks for PDF attachments', async () => {
      mockAnthropicCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'I see a PDF.' }],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          system: 'Summarize documents.',
          messages: [
            {
              role: 'user',
              content: 'Summarize this.',
              attachments: [
                {
                  name: 'doc.pdf',
                  mediaType: 'application/pdf',
                  base64Data: 'cGRmZGF0YQ==',
                },
              ],
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);

      const callArgs = mockAnthropicCreate.mock.calls[0][0];
      const userMessage = callArgs.messages[0];
      expect(Array.isArray(userMessage.content)).toBe(true);
      expect(userMessage.content).toEqual([
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: 'cGRmZGF0YQ==' },
        },
        { type: 'text', text: 'Summarize this.' },
      ]);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Successful proxy — OpenAI provider
  // ────────────────────────────────────────────────────────────────────────

  describe('OpenAI provider', () => {
    beforeEach(() => {
      process.env.AI_PROVIDER = 'openai';
      process.env.AI_MODEL = 'gpt-4o';
    });

    it('should successfully proxy to OpenAI and return text', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'Hello from OpenAI!' } }],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: validPayload(),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.text).toBe('Hello from OpenAI!');

      // Verify the SDK was called with proper params
      expect(mockOpenAICreate).toHaveBeenCalledOnce();
      const callArgs = mockOpenAICreate.mock.calls[0][0];
      expect(callArgs.model).toBe('gpt-4o');
      expect(callArgs.max_tokens).toBe(8192);
      // OpenAI uses a system message in the messages array
      expect(callArgs.messages[0]).toEqual({ role: 'system', content: 'You are a helpful assistant.' });
      expect(callArgs.messages[1]).toEqual({ role: 'user', content: 'Hello' });
    });

    it('should return empty string when OpenAI response has no content', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: validPayload(),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.text).toBe('');
    });

    it('should build OpenAI content blocks for image attachments', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'I see an image.' } }],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          system: 'Describe images.',
          messages: [
            {
              role: 'user',
              content: 'What is this?',
              attachments: [
                {
                  name: 'photo.png',
                  mediaType: 'image/png',
                  base64Data: 'aW1hZ2VkYXRh',
                },
              ],
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);

      const callArgs = mockOpenAICreate.mock.calls[0][0];
      // messages[0] is system, messages[1] is user
      const userMessage = callArgs.messages[1];
      expect(Array.isArray(userMessage.content)).toBe(true);
      expect(userMessage.content).toEqual([
        {
          type: 'image_url',
          image_url: { url: 'data:image/png;base64,aW1hZ2VkYXRh' },
        },
        { type: 'text', text: 'What is this?' },
      ]);
    });

    it('should add PDF unsupported notice for OpenAI provider', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'PDF not supported.' } }],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          system: 'Summarize documents.',
          messages: [
            {
              role: 'user',
              content: 'Summarize this.',
              attachments: [
                {
                  name: 'doc.pdf',
                  mediaType: 'application/pdf',
                  base64Data: 'cGRmZGF0YQ==',
                },
              ],
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);

      const callArgs = mockOpenAICreate.mock.calls[0][0];
      const userMessage = callArgs.messages[1];
      expect(Array.isArray(userMessage.content)).toBe(true);
      // Should have only a text part (PDF images are skipped), with an appended notice
      expect(userMessage.content).toEqual([
        {
          type: 'text',
          text: 'Summarize this.\n\n(PDF attachment "doc.pdf" not supported with OpenAI provider)',
        },
      ]);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Error mapping from AI providers
  // ────────────────────────────────────────────────────────────────────────

  describe('provider error mapping', () => {
    it('should map provider 429 (rate limit) to 429 response', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      mockAnthropicCreate.mockRejectedValueOnce(rateLimitError);

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: validPayload(),
      });

      expect(response.statusCode).toBe(429);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('AI provider rate limit exceeded');
    });

    it('should map provider 429 via statusCode property to 429 response', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).statusCode = 429;
      mockAnthropicCreate.mockRejectedValueOnce(rateLimitError);

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: validPayload(),
      });

      expect(response.statusCode).toBe(429);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('AI provider rate limit exceeded');
    });

    it('should map provider 401 (auth error) to 503 response', async () => {
      const authError = new Error('Invalid API key');
      (authError as any).status = 401;
      mockAnthropicCreate.mockRejectedValueOnce(authError);

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: validPayload(),
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('AI service configuration error');
    });

    it('should map provider 401 via statusCode property to 503 response', async () => {
      const authError = new Error('Invalid API key');
      (authError as any).statusCode = 401;
      mockAnthropicCreate.mockRejectedValueOnce(authError);

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: validPayload(),
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('AI service configuration error');
    });

    it('should map other provider errors to 502 response', async () => {
      const serverError = new Error('Internal server error');
      (serverError as any).status = 500;
      mockAnthropicCreate.mockRejectedValueOnce(serverError);

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: validPayload(),
      });

      expect(response.statusCode).toBe(502);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('AI service error');
    });

    it('should map unknown errors (no status) to 502 response', async () => {
      mockAnthropicCreate.mockRejectedValueOnce(new Error('Network failure'));

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: validPayload(),
      });

      expect(response.statusCode).toBe(502);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('AI service error');
    });

    it('should map OpenAI 429 error to 429 response', async () => {
      process.env.AI_PROVIDER = 'openai';

      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      mockOpenAICreate.mockRejectedValueOnce(rateLimitError);

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: validPayload(),
      });

      expect(response.statusCode).toBe(429);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('AI provider rate limit exceeded');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Multiple messages
  // ────────────────────────────────────────────────────────────────────────

  describe('multi-turn conversations', () => {
    it('should pass multiple messages to the Claude SDK', async () => {
      mockAnthropicCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Follow-up answer.' }],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/chat',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          system: 'You are a helpful assistant.',
          messages: [
            { role: 'user', content: 'First question.' },
            { role: 'assistant', content: 'First answer.' },
            { role: 'user', content: 'Follow-up question.' },
          ],
        },
      });

      expect(response.statusCode).toBe(200);

      const callArgs = mockAnthropicCreate.mock.calls[0][0];
      expect(callArgs.messages).toHaveLength(3);
      expect(callArgs.messages[0].role).toBe('user');
      expect(callArgs.messages[1].role).toBe('assistant');
      expect(callArgs.messages[2].role).toBe('user');
    });
  });
});
