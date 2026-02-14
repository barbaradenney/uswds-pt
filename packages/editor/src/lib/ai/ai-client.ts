/**
 * AI Client
 *
 * Sends messages to the server-side AI proxy and parses responses
 * into explanation text + optional HTML code block.
 *
 * AI SDK calls happen server-side — this module only does HTTP + parsing.
 */

import { authFetch } from '../../hooks/useAuth';
import { parseJsonSafely } from '../api';

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

export interface PageDefinition {
  name: string;
  html: string;
}

export interface AIResponse {
  /** Explanation text (everything outside the code fence) */
  explanation: string;
  /** Generated HTML (content inside ```html fence, if any) */
  html: string;
  /** Parsed multi-page definitions, or null if single-page response */
  pages: PageDefinition[] | null;
}

/**
 * Parse multi-page HTML from AI response.
 *
 * Looks for `<!-- PAGE: Name -->` delimiters. Returns null if none found
 * (backward-compatible single-page). Content before the first delimiter
 * is ignored. Empty page sections are skipped.
 */
export function parseMultiPageHtml(html: string): PageDefinition[] | null {
  const delimiterRegex = /<!--\s*PAGE:\s*(.+?)\s*-->/g;
  const matches = [...html.matchAll(delimiterRegex)];

  if (matches.length === 0) return null;

  const pages: PageDefinition[] = [];

  for (let i = 0; i < matches.length; i++) {
    const name = matches[i][1].trim();
    const startIndex = matches[i].index! + matches[i][0].length;
    const endIndex = i + 1 < matches.length ? matches[i + 1].index! : html.length;
    const pageHtml = html.slice(startIndex, endIndex).trim();

    if (pageHtml) {
      pages.push({ name, html: pageHtml });
    }
  }

  return pages.length > 0 ? pages : null;
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
    const pages = parseMultiPageHtml(html);
    return { explanation: explanation || 'Here is the generated HTML:', html, pages };
  }

  return { explanation: raw.trim(), html: '', pages: null };
}

/* ─── Auto-split helpers ─── */

const MAX_AUTO_SPLIT_PAGES = 5;

/** Strip the outer `<div style="max-width: 40rem;">…</div>` wrapper, if present. */
function unwrapFormWrapper(html: string): string {
  const trimmed = html.trim();
  const re = /^<div\s[^>]*style\s*=\s*"[^"]*max-width:\s*40\s*rem[^"]*"[^>]*>([\s\S]*)<\/div>$/i;
  const m = trimmed.match(re);
  return m ? m[1].trim() : trimmed;
}

/** Extract inner text from an HTML string (strips tags). */
function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/** Build a `<usa-step-indicator>` element string for a given set of page names and current index. */
function buildStepIndicator(pageNames: string[], currentIndex: number): string {
  const attrs = [`step-count="${pageNames.length}"`, 'show-labels'];
  for (let i = 0; i < pageNames.length; i++) {
    const status = i < currentIndex ? 'complete' : i === currentIndex ? 'current' : 'incomplete';
    attrs.push(`step${i + 1}-label="${pageNames[i]}" step${i + 1}-status="${status}"`);
  }
  return `<usa-step-indicator ${attrs.join(' ')}></usa-step-indicator>`;
}

/** Build Back / Continue navigation buttons with page-link attributes. */
function buildNavButtons(pageNames: string[], currentIndex: number): string {
  const buttons: string[] = [];
  if (currentIndex > 0) {
    buttons.push(`<usa-button text="Back" variant="outline" page-link="${pageNames[currentIndex - 1]}"></usa-button>`);
  }
  if (currentIndex < pageNames.length - 1) {
    buttons.push(`<usa-button text="Continue" page-link="${pageNames[currentIndex + 1]}"></usa-button>`);
  } else {
    buttons.push('<usa-button text="Submit"></usa-button>');
  }
  return `<div class="margin-top-4">\n  ${buttons.join('\n  ')}\n</div>`;
}

/**
 * Client-side fallback: split monolithic form HTML into pages.
 *
 * Called when the AI returns a single HTML block without `<!-- PAGE: -->` delimiters.
 * Splits on `<h1>` headings (primary) or `<fieldset>` with `<legend>` (fallback),
 * then enriches each page with a step indicator + Back/Continue navigation.
 *
 * Returns `PageDefinition[]` or `null` if splitting is not possible.
 */
export function autoSplitFormHtml(html: string): PageDefinition[] | null {
  const unwrapped = unwrapFormWrapper(html);

  // Try splitting on <h1> headings first
  let pages = splitOnH1(unwrapped);

  // Fallback: split on <fieldset> with <legend>
  if (!pages || pages.length < 2) {
    pages = splitOnFieldset(unwrapped);
  }

  if (!pages || pages.length < 2) return null;

  // Cap at MAX_AUTO_SPLIT_PAGES — merge overflow into last page
  if (pages.length > MAX_AUTO_SPLIT_PAGES) {
    const overflow = pages.slice(MAX_AUTO_SPLIT_PAGES - 1);
    const mergedHtml = overflow.map((p) => `<h1>${p.name}</h1>\n${p.html}`).join('\n\n');
    pages = [
      ...pages.slice(0, MAX_AUTO_SPLIT_PAGES - 1),
      { name: overflow[0].name, html: mergedHtml },
    ];
  }

  // Enrich each page with step indicator + nav buttons + wrapper
  const pageNames = pages.map((p) => p.name);
  return pages.map((page, i) => {
    const step = buildStepIndicator(pageNames, i);
    const nav = buildNavButtons(pageNames, i);
    const enrichedHtml = `<div style="max-width: 40rem;">\n${step}\n<h1>${page.name}</h1>\n${page.html}\n${nav}\n</div>`;
    return { name: page.name, html: enrichedHtml };
  });
}

/** Split HTML on `<h1>` headings. Returns raw pages (name + content after heading). */
function splitOnH1(html: string): PageDefinition[] | null {
  // Match <h1...>...</h1> tags — capture the full tag and inner content
  const h1Regex = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  const matches = [...html.matchAll(h1Regex)];

  if (matches.length < 2) return null;

  const pages: PageDefinition[] = [];
  const preamble = html.slice(0, matches[0].index!).trim();

  for (let i = 0; i < matches.length; i++) {
    const name = stripTags(matches[i][1]);
    if (!name) continue;

    // Content starts after the closing </h1> tag
    const contentStart = matches[i].index! + matches[i][0].length;
    const contentEnd = i + 1 < matches.length ? matches[i + 1].index! : html.length;
    let content = html.slice(contentStart, contentEnd).trim();

    // Prepend preamble content to first page
    if (i === 0 && preamble) {
      content = preamble + '\n' + content;
    }

    pages.push({ name, html: content });
  }

  return pages.length >= 2 ? pages : null;
}

/** Split HTML on `<fieldset>` elements that contain a `<legend>`. */
function splitOnFieldset(html: string): PageDefinition[] | null {
  // Match <fieldset...>...<legend...>...</legend>...
  const fieldsetRegex = /<fieldset[^>]*>\s*<legend[^>]*>([\s\S]*?)<\/legend>([\s\S]*?)<\/fieldset>/gi;
  const matches = [...html.matchAll(fieldsetRegex)];

  if (matches.length < 2) return null;

  const pages: PageDefinition[] = [];
  for (const match of matches) {
    const name = stripTags(match[1]);
    if (!name) continue;
    const content = match[2].trim();
    pages.push({ name, html: content });
  }

  return pages.length >= 2 ? pages : null;
}

/**
 * Send a message to the AI via the server-side proxy.
 */
export async function sendAIMessage(
  systemPrompt: string,
  messages: AIMessage[],
  abortSignal?: AbortSignal,
): Promise<AIResponse> {
  const response = await authFetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system: systemPrompt, messages }),
    signal: abortSignal,
  });

  if (!response.ok) {
    const err = await parseJsonSafely(response);
    throw new Error((err.message as string) || `AI request failed (${response.status})`);
  }

  const data = await response.json();
  return parseAIResponse(data.text);
}
