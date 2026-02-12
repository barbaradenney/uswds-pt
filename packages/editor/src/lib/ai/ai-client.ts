/**
 * AI Client Wrapper
 *
 * Thin wrapper around Anthropic / OpenAI SDKs.
 * Parses AI responses into explanation text + optional HTML code block.
 */

import { AI_API_KEY, AI_PROVIDER, AI_MODEL } from './ai-config';

export interface Attachment {
  /** File name for display */
  name: string;
  /** MIME type (application/pdf, image/png, etc.) */
  mediaType: string;
  /** Base64-encoded file data */
  base64Data: string;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
}

export interface AIResponse {
  /** Explanation text (everything outside the code fence) */
  explanation: string;
  /** Generated HTML (content inside ```html fence, if any) */
  html: string;
}

/**
 * Parse an AI response into explanation + HTML parts.
 *
 * Expected format:
 *   Some explanation text...
 *   ```html
 *   <usa-button>Click me</usa-button>
 *   ```
 *   Optional trailing text...
 */
export function parseAIResponse(raw: string): AIResponse {
  const fenceRegex = /```html\s*\n([\s\S]*?)```/;
  const match = raw.match(fenceRegex);

  if (match) {
    const html = match[1].trim();
    const explanation = raw
      .replace(fenceRegex, '')
      .trim()
      // Clean up double newlines left by removing the fence
      .replace(/\n{3,}/g, '\n\n');
    return { explanation: explanation || 'Here is the generated HTML:', html };
  }

  return { explanation: raw.trim(), html: '' };
}

/**
 * Send a message to the configured AI provider and get a parsed response.
 */
export async function sendAIMessage(
  systemPrompt: string,
  messages: AIMessage[],
  abortSignal?: AbortSignal,
): Promise<AIResponse> {
  if (!AI_API_KEY) {
    throw new Error('AI API key is not configured');
  }

  const raw = AI_PROVIDER === 'claude'
    ? await sendClaude(systemPrompt, messages, abortSignal)
    : await sendOpenAI(systemPrompt, messages, abortSignal);

  return parseAIResponse(raw);
}

/* ─── Content builders ─── */

function buildClaudeContent(m: AIMessage): string | any[] {
  if (!m.attachments?.length) return m.content;
  const parts: any[] = [];
  for (const att of m.attachments) {
    if (att.mediaType === 'application/pdf') {
      parts.push({
        type: 'document',
        source: { type: 'base64', media_type: att.mediaType, data: att.base64Data },
      });
    } else {
      parts.push({
        type: 'image',
        source: { type: 'base64', media_type: att.mediaType, data: att.base64Data },
      });
    }
  }
  parts.push({ type: 'text', text: m.content });
  return parts;
}

function buildOpenAIContent(m: AIMessage): string | any[] {
  if (!m.attachments?.length) return m.content;
  const parts: any[] = [];
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

/* ─── Claude (Anthropic) ─── */

async function sendClaude(
  systemPrompt: string,
  messages: AIMessage[],
  abortSignal?: AbortSignal,
): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({
    apiKey: AI_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.messages.create(
    {
      model: AI_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: buildClaudeContent(m),
      })),
    },
    { signal: abortSignal },
  );

  const textBlock = response.content.find((b: any) => b.type === 'text');
  return textBlock ? (textBlock as any).text : '';
}

/* ─── OpenAI ─── */

async function sendOpenAI(
  systemPrompt: string,
  messages: AIMessage[],
  abortSignal?: AbortSignal,
): Promise<string> {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({
    apiKey: AI_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create(
    {
      model: AI_MODEL,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: buildOpenAIContent(m),
        })),
      ],
    },
    { signal: abortSignal },
  );

  return response.choices[0]?.message?.content || '';
}
