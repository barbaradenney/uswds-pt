/**
 * AI Client Wrapper
 *
 * Thin wrapper around Anthropic / OpenAI SDKs.
 * Parses AI responses into explanation text + optional HTML code block.
 */

import { AI_API_KEY, AI_PROVIDER, AI_MODEL } from './ai-config';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
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
        content: m.content,
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
          content: m.content,
        })),
      ],
    },
    { signal: abortSignal },
  );

  return response.choices[0]?.message?.content || '';
}
