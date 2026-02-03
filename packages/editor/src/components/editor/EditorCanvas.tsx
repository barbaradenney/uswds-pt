/**
 * EditorCanvas Component
 *
 * Wraps the GrapesJS StudioEditor with all required configuration,
 * plugins, and error boundary.
 */

import { memo, useEffect, useRef } from 'react';
import StudioEditor from '@grapesjs/studio-sdk/react';
import '@grapesjs/studio-sdk/style';
import { tableComponent } from '@grapesjs/studio-sdk-plugins';
import { uswdsComponentsPlugin, uswdsTablePlugin } from '../../lib/grapesjs/plugins';
import { EditorErrorBoundary } from '../EditorErrorBoundary';
import aiCopilotPlugin from '@silexlabs/grapesjs-ai-copilot';
import { generateUSWDSPrompt } from '../../lib/ai/uswds-prompt';
import { initAICopilotPanel, cleanupAICopilotPanel } from '../../lib/ai/ai-copilot-panel';
import '../../styles/ai-copilot.css';

// License key from environment variable
const LICENSE_KEY = import.meta.env.VITE_GRAPESJS_LICENSE_KEY || '';

// AI Copilot configuration
const AI_API_KEY = import.meta.env.VITE_AI_API_KEY || '';
const AI_PROVIDER = (import.meta.env.VITE_AI_PROVIDER || 'claude') as 'claude' | 'openai';
const AI_MODEL = import.meta.env.VITE_AI_MODEL || (AI_PROVIDER === 'claude' ? 'claude-sonnet-4-20250514' : 'gpt-4o');
const AI_SECRET = import.meta.env.VITE_AI_SECRET || '';

// AI is enabled only if:
// 1. API key is configured AND
// 2. Either no secret is set, OR the URL has the correct ?ai=secret parameter
const checkAiEnabled = (): boolean => {
  const hasApiKey = !!AI_API_KEY;
  const hasSecret = !!AI_SECRET;

  // Debug logging (check browser console)
  console.log('[AI Copilot] Checking AI status:', {
    hasApiKey,
    hasSecret,
    search: window.location.search,
    hash: window.location.hash,
  });

  if (!hasApiKey) {
    console.log('[AI Copilot] Disabled: No API key configured');
    return false;
  }

  if (!hasSecret) {
    console.log('[AI Copilot] Enabled: No secret required');
    return true;
  }

  // Check URL parameter (before the hash)
  const urlParams = new URLSearchParams(window.location.search);
  const aiParam = urlParams.get('ai');

  console.log('[AI Copilot] URL ai param:', aiParam, 'Expected:', AI_SECRET);

  // Also check localStorage (so it persists after navigation)
  if (aiParam === AI_SECRET) {
    console.log('[AI Copilot] Enabled: Secret matched, saving to localStorage');
    localStorage.setItem('uswds_pt_ai_enabled', 'true');
    return true;
  }

  const fromStorage = localStorage.getItem('uswds_pt_ai_enabled') === 'true';
  console.log('[AI Copilot] From localStorage:', fromStorage);
  return fromStorage;
};

const AI_ENABLED = checkAiEnabled();
console.log('[AI Copilot] Final AI_ENABLED:', AI_ENABLED);

// GrapesJS editor type
type EditorInstance = any;

export interface EditorCanvasProps {
  /** Unique key to force remount */
  editorKey: string;
  /** Initial HTML content for the canvas */
  initialContent: string;
  /** Block definitions for the editor */
  blocks: Array<{
    id: string;
    label: string;
    content: string | object;
    media: string;
    category: string;
  }>;
  /** Callback when editor is ready */
  onReady: (editor: EditorInstance) => void;
  /** Callback to retry after error */
  onRetry: () => void;
  /** Callback to go home after error */
  onGoHome: () => void;
}

/**
 * Table block configuration for the table plugin
 */
const TABLE_BLOCK_CONFIG = {
  block: {
    label: 'Table',
    category: 'Data Display',
    media: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v18H3V3zm16 4H5v12h14V7zm-8 4h6v2h-6v-2zm0 4h6v2h-6v-2zm-6-4h4v6H5v-6z"/></svg>`,
  },
};

/**
 * AI Copilot plugin configuration
 */
const AI_COPILOT_CONFIG = {
  aiProvider: AI_PROVIDER,
  apiKey: AI_API_KEY,
  model: AI_MODEL,
  customPrompt: generateUSWDSPrompt(),
  // Panel positioning
  containerSelector: '.gjs-pn-views-container',
  // Update suggestions less frequently to reduce API costs
  updateInterval: 30000, // 30 seconds
  minChangesThreshold: 10,
  // Response limits
  maxTokens: 2000,
};

export const EditorCanvas = memo(function EditorCanvas({
  editorKey,
  initialContent,
  blocks,
  onReady,
  onRetry,
  onGoHome,
}: EditorCanvasProps) {
  const aiPanelInitialized = useRef(false);

  // Initialize AI copilot panel after mount, cleanup on unmount
  useEffect(() => {
    if (AI_ENABLED && !aiPanelInitialized.current) {
      // Delay initialization to ensure the panel is created
      const timer = setTimeout(() => {
        initAICopilotPanel();
        aiPanelInitialized.current = true;
      }, 1000);

      return () => {
        clearTimeout(timer);
        cleanupAICopilotPanel();
        aiPanelInitialized.current = false;
      };
    }
  }, [editorKey]); // Re-run when editor key changes (new editor instance)

  return (
    <EditorErrorBoundary onRetry={onRetry} onGoHome={onGoHome}>
      <StudioEditor
        key={editorKey}
        options={{
          licenseKey: LICENSE_KEY,
          plugins: [
            (editor: EditorInstance) => tableComponent(editor, TABLE_BLOCK_CONFIG),
            uswdsTablePlugin,
            uswdsComponentsPlugin,
            // AI Copilot plugin - only add if API key is configured
            ...(AI_ENABLED ? [(editor: EditorInstance) => aiCopilotPlugin(editor, AI_COPILOT_CONFIG)] : []),
          ],
          project: {
            type: 'web',
            default: {
              pages: [{
                name: 'Prototype',
                component: initialContent,
              }],
            },
          },
          blocks: {
            default: blocks as any, // Type cast needed - our blocks match GrapesJS format
          },
        }}
        onReady={onReady}
      />
    </EditorErrorBoundary>
  );
});
