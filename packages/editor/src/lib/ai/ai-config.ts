/**
 * AI Copilot Configuration
 *
 * Shared access-control logic for the AI assistant feature.
 * Imported by EditorCanvas (to skip plugin) and RightSidebar (to show AI tab).
 */

import { createDebugLogger } from '@uswds-pt/shared';

const debug = createDebugLogger('AI Copilot');

/** API key for the configured AI provider */
export const AI_API_KEY = import.meta.env.VITE_AI_API_KEY || '';

/** AI provider: 'claude' or 'openai' */
export const AI_PROVIDER = (import.meta.env.VITE_AI_PROVIDER || 'claude') as 'claude' | 'openai';

/** Model name (defaults per provider) */
export const AI_MODEL = import.meta.env.VITE_AI_MODEL ||
  (AI_PROVIDER === 'claude' ? 'claude-sonnet-4-20250514' : 'gpt-4o');

/** Optional secret for URL-parameter gating */
export const AI_SECRET = import.meta.env.VITE_AI_SECRET || '';

/**
 * Check if AI is enabled based on API key + optional URL secret gating.
 *
 * Rules:
 * 1. No API key → disabled
 * 2. No secret configured → enabled (key is enough)
 * 3. Secret configured → needs ?ai=<secret> in URL or prior sessionStorage match
 * 4. ?ai=off → explicitly disabled
 */
export function checkAiEnabled(): boolean {
  const hasApiKey = !!AI_API_KEY;
  const hasSecret = !!AI_SECRET;

  const urlParams = new URLSearchParams(window.location.search);
  const aiParam = urlParams.get('ai');

  debug('Checking AI status:', { hasApiKey, hasSecret, aiParam });

  if (aiParam === 'off' || aiParam === 'disable') {
    debug('Disabled: Explicit ?ai=off parameter');
    sessionStorage.removeItem('uswds_pt_ai_enabled');
    return false;
  }

  if (!hasApiKey) {
    debug('Disabled: No API key configured');
    return false;
  }

  if (!hasSecret) {
    debug('Enabled: No secret required');
    return true;
  }

  if (aiParam === AI_SECRET) {
    debug('Enabled: Secret matched, saving to session');
    sessionStorage.setItem('uswds_pt_ai_enabled', 'true');
    return true;
  }

  const fromSession = sessionStorage.getItem('uswds_pt_ai_enabled') === 'true';
  debug('From session:', fromSession);
  return fromSession;
}

/** Whether the AI assistant feature is currently enabled */
export const AI_ENABLED = checkAiEnabled();
debug('Final AI_ENABLED:', AI_ENABLED);
