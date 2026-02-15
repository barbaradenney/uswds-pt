/**
 * AI Proxy Routes
 *
 * Server-side proxy for AI SDK calls. Keeps API keys on the server
 * so they are never exposed in the browser bundle.
 */

import { FastifyInstance } from 'fastify';
import { DEFAULT_AI_MODEL_CLAUDE, DEFAULT_AI_MODEL_OPENAI } from '../constants.js';

/* ─── Types ─── */

interface Attachment {
  name: string;
  mediaType: string;
  base64Data: string;
}

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
}

interface ChatRequestBody {
  system: string;
  messages: AIMessage[];
}

/*
 * Content part types are defined by the Anthropic and OpenAI SDKs.
 * Since the SDKs are dynamically imported, we cast at call boundaries
 * rather than duplicating their complex type hierarchies here.
 */

/* ─── Config ─── */

function getAIConfig() {
  const apiKey = process.env.AI_API_KEY || '';
  const provider = (process.env.AI_PROVIDER || 'claude') as 'claude' | 'openai';
  const model =
    process.env.AI_MODEL ||
    (provider === 'claude' ? DEFAULT_AI_MODEL_CLAUDE : DEFAULT_AI_MODEL_OPENAI);
  return { apiKey, provider, model };
}

/* ─── Content Builders ─── */

function buildClaudeContent(m: AIMessage): string | unknown[] {
  if (!m.attachments?.length) return m.content;
  const parts: unknown[] = [];
  for (const att of m.attachments) {
    parts.push({
      type: att.mediaType === 'application/pdf' ? 'document' : 'image',
      source: { type: 'base64', media_type: att.mediaType, data: att.base64Data },
    });
  }
  parts.push({ type: 'text', text: m.content });
  return parts;
}

function buildOpenAIContent(m: AIMessage): string | unknown[] {
  if (!m.attachments?.length) return m.content;
  const parts: unknown[] = [];
  let textSuffix = '';
  for (const att of m.attachments) {
    if (att.mediaType === 'application/pdf') {
      textSuffix += `\n\n(PDF attachment "${att.name}" not supported with OpenAI provider)`;
    } else {
      parts.push({
        type: 'image_url',
        image_url: { url: `data:${att.mediaType};base64,${att.base64Data}` },
      });
    }
  }
  parts.push({ type: 'text', text: m.content + textSuffix });
  return parts;
}

/* ─── SDK Callers ─── */

async function callClaude(
  apiKey: string,
  model: string,
  system: string,
  messages: AIMessage[],
): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    system,
    // Content builders return SDK-compatible structures; cast required because
    // the SDK types are only available after dynamic import.
    messages: messages.map((m) => ({
      role: m.role,
      content: buildClaudeContent(m) as string,
    })),
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  return textBlock && 'text' in textBlock ? textBlock.text : '';
}

async function callOpenAI(
  apiKey: string,
  model: string,
  system: string,
  messages: AIMessage[],
): Promise<string> {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model,
    max_tokens: 8192,
    // Content builders return SDK-compatible structures; cast required because
    // the SDK types are only available after dynamic import.
    messages: [
      { role: 'system' as const, content: system },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: buildOpenAIContent(m) as string,
      })),
    ],
  });

  return response.choices[0]?.message?.content || '';
}

/* ─── Validation ─── */

const MAX_SYSTEM_LENGTH = 50_000;
const MAX_MESSAGES = 50;
const MAX_ATTACHMENTS = 5;
const MAX_BASE64_LENGTH = 7_000_000; // ~5MB binary

/* ─── Routes ─── */

export async function aiRoutes(app: FastifyInstance) {
  app.post<{ Body: ChatRequestBody }>(
    '/chat',
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } } as Record<string, unknown>,
      schema: {
        body: {
          type: 'object',
          required: ['system', 'messages'],
          properties: {
            system: { type: 'string', maxLength: MAX_SYSTEM_LENGTH },
            messages: {
              type: 'array',
              maxItems: MAX_MESSAGES,
              items: {
                type: 'object',
                required: ['role', 'content'],
                properties: {
                  role: { type: 'string', enum: ['user', 'assistant'] },
                  content: { type: 'string', maxLength: 50000 },
                  attachments: {
                    type: 'array',
                    maxItems: MAX_ATTACHMENTS,
                    items: {
                      type: 'object',
                      required: ['name', 'mediaType', 'base64Data'],
                      properties: {
                        name: { type: 'string', maxLength: 255 },
                        mediaType: { type: 'string', maxLength: 100 },
                        base64Data: { type: 'string', maxLength: MAX_BASE64_LENGTH },
                      },
                      additionalProperties: false,
                    },
                  },
                },
                additionalProperties: false,
              },
            },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { apiKey, provider, model } = getAIConfig();

      if (!apiKey) {
        return reply.status(503).send({ message: 'AI service is not configured' });
      }

      const { system, messages } = request.body;

      try {
        const text =
          provider === 'claude'
            ? await callClaude(apiKey, model, system, messages)
            : await callOpenAI(apiKey, model, system, messages);

        return { text };
      } catch (err: unknown) {
        request.log.error(err, 'AI proxy error');

        const status =
          (err as Record<string, unknown>)?.status ??
          (err as Record<string, unknown>)?.statusCode;
        if (status === 429) {
          return reply.status(429).send({ message: 'AI provider rate limit exceeded' });
        }
        if (status === 401) {
          return reply.status(503).send({ message: 'AI service configuration error' });
        }

        return reply.status(502).send({ message: 'AI service error' });
      }
    },
  );
}
