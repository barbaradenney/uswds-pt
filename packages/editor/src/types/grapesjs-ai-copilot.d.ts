/**
 * Type declarations for @silexlabs/grapesjs-ai-copilot
 */

declare module '@silexlabs/grapesjs-ai-copilot' {
  interface AiCopilotOptions {
    /** AI provider - 'openai' or 'claude' */
    aiProvider: 'openai' | 'claude';
    /** API key for the AI provider */
    apiKey: string;
    /** Model to use (e.g., 'gpt-4o', 'claude-sonnet-4-20250514') */
    model?: string;
    /** Custom prompt template with {{html}} and {{selectedComponent}} placeholders */
    customPrompt?: string;
    /** URL to load prompt from */
    promptUrl?: string;
    /** CSS selector for container placement */
    containerSelector?: string;
    /** Interval between auto-suggestions in ms (default: 20000) */
    updateInterval?: number;
    /** Minimum changes before triggering suggestions (default: 5) */
    minChangesThreshold?: number;
    /** Maximum tokens in response (default: 2000) */
    maxTokens?: number;
  }

  type EditorInstance = any;

  /**
   * GrapesJS AI Copilot Plugin
   * Adds an AI assistant panel to the GrapesJS editor
   */
  function aiCopilotPlugin(editor: EditorInstance, options: AiCopilotOptions): void;

  export default aiCopilotPlugin;
}
