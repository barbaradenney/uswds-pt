/**
 * EditorCanvas Component
 *
 * Wraps the GrapesJS StudioEditor with all required configuration,
 * plugins, and error boundary.
 */

import { memo } from 'react';
import StudioEditor from '@grapesjs/studio-sdk/react';
import '@grapesjs/studio-sdk/style';
import { tableComponent } from '@grapesjs/studio-sdk-plugins';
import { uswdsComponentsPlugin, uswdsTablePlugin } from '../../lib/grapesjs/plugins';
import { EditorErrorBoundary } from '../EditorErrorBoundary';

// License key from environment variable
const LICENSE_KEY = import.meta.env.VITE_GRAPESJS_LICENSE_KEY || '';

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

export const EditorCanvas = memo(function EditorCanvas({
  editorKey,
  initialContent,
  blocks,
  onReady,
  onRetry,
  onGoHome,
}: EditorCanvasProps) {
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
