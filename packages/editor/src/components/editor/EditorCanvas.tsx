/**
 * EditorCanvas Component
 *
 * Wraps the GrapesJS core editor via @grapesjs/react with a custom layout:
 * - Left sidebar (Pages + Layers)
 * - Center canvas
 * - Right sidebar (Components/Blocks + Properties/Traits)
 *
 * When GjsEditor has children, the default GrapesJS panel UI is NOT rendered.
 * Instead, Provider Containers portal the default panel rendering into our
 * custom sidebar locations.
 */

import { memo } from 'react';
import grapesjs from 'grapesjs';
import GjsEditor, { Canvas } from '@grapesjs/react';
import 'grapesjs/dist/css/grapes.min.css';
import { uswdsComponentsPlugin } from '../../lib/grapesjs/plugins';
import { EditorErrorBoundary } from '../EditorErrorBoundary';
import { CDN_URLS } from '@uswds-pt/adapter';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { CanvasToolbar } from './CanvasToolbar';
import '../../styles/grapesjs-overrides.css';
import '../../styles/editor-layout.css';

import type { EditorInstance } from '../../types/grapesjs';
import type { GrapesProjectData } from '@uswds-pt/shared';

export interface EditorCanvasProps {
  /** Unique key to force remount */
  editorKey: string;
  /** Initial HTML content for the canvas */
  initialContent: string;
  /** Pre-loaded project data (grapesData) */
  projectData?: GrapesProjectData | null;
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
  /** Editor mode — controls which sidebar tabs are shown */
  mode?: 'prototype' | 'symbol';
}

export const EditorCanvas = memo(function EditorCanvas({
  editorKey,
  initialContent,
  projectData,
  blocks,
  onReady,
  onRetry,
  onGoHome,
  mode = 'prototype',
}: EditorCanvasProps) {
  return (
    <EditorErrorBoundary onRetry={onRetry} onGoHome={onGoHome}>
      <GjsEditor
        key={editorKey}
        grapesjs={grapesjs}
        onReady={onReady}
        options={{
          height: '100%',
          width: '100%',
          storageManager: false,
          canvas: {
            styles: [CDN_URLS.uswdsCss, CDN_URLS.uswdsWcCss],
          },
          plugins: [uswdsComponentsPlugin],
          projectData: projectData || {
            pages: [{
              name: 'Prototype',
              component: initialContent,
            }],
          },
          blockManager: {
            blocks: blocks as any,
          },
        }}
      >
        <div className="editor-workspace">
          <LeftSidebar mode={mode} />
          <div className="editor-canvas-column">
            <CanvasToolbar />
            <Canvas className="editor-canvas" />
          </div>
          <RightSidebar mode={mode} />
        </div>
      </GjsEditor>
    </EditorErrorBoundary>
  );
});
