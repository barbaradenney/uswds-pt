/**
 * AI Copilot Configuration
 *
 * Shared access-control logic for the AI assistant feature.
 * Imported by EditorCanvas (to skip plugin) and RightSidebar (to show AI tab).
 *
 * AI SDK calls are now proxied through the API server — no API keys in the browser.
 * Enablement is controlled by the VITE_AI_ENABLED env var + optional URL secret gating.
 */

import { createDebugLogger } from '@uswds-pt/shared';

const debug = createDebugLogger('AI Copilot');

/** Optional secret for URL-parameter gating */
export const AI_SECRET = import.meta.env.VITE_AI_SECRET || '';

/**
 * Check if AI is enabled.
 *
 * Rules:
 * 1. VITE_AI_ENABLED not 'true' → disabled
 * 2. No secret configured → enabled (server has the key)
 * 3. Secret configured → needs ?ai=<secret> in URL or prior sessionStorage match
 * 4. ?ai=off → explicitly disabled
 */
export function checkAiEnabled(): boolean {
  const envEnabled = import.meta.env.VITE_AI_ENABLED === 'true';
  const hasSecret = !!AI_SECRET;

  const urlParams = new URLSearchParams(window.location.search);
  const aiParam = urlParams.get('ai');

  debug('Checking AI status:', { envEnabled, hasSecret, aiParam });

  if (aiParam === 'off' || aiParam === 'disable') {
    debug('Disabled: Explicit ?ai=off parameter');
    sessionStorage.removeItem('uswds_pt_ai_enabled');
    return false;
  }

  if (!envEnabled) {
    debug('Disabled: VITE_AI_ENABLED is not true');
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
