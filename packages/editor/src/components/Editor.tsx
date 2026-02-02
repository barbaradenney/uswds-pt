/**
 * Editor Component
 *
 * Main visual editor for USWDS prototypes using GrapesJS Studio SDK.
 * Refactored to use composable hooks for state management, persistence, and setup.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Prototype } from '@uswds-pt/shared';
import { useOrganization } from '../hooks/useOrganization';
import { useVersionHistory } from '../hooks/useVersionHistory';
import { useEditorStateMachine } from '../hooks/useEditorStateMachine';
import { useEditorPersistence } from '../hooks/useEditorPersistence';
import { useEditorAutosave } from '../hooks/useEditorAutosave';
import { useGrapesJSSetup } from '../hooks/useGrapesJSSetup';
import { ExportModal } from './ExportModal';
import { EmbedModal } from './EmbedModal';
import { VersionHistoryPanel } from './VersionHistoryPanel';
import { EditorErrorBoundary } from './EditorErrorBoundary';
import { EditorHeader } from './editor/EditorHeader';
import { openPreviewInNewTab, openMultiPagePreviewInNewTab, type PageData } from '../lib/export';
import { type LocalPrototype } from '../lib/localStorage';
import { clearGrapesJSStorage } from '../lib/grapesjs/resource-loader';
import {
  DEFAULT_CONTENT,
  COMPONENT_ICONS,
} from '@uswds-pt/adapter';
import { uswdsComponentsPlugin, uswdsTablePlugin } from '../lib/grapesjs/plugins';
import StudioEditor from '@grapesjs/studio-sdk/react';
import '@grapesjs/studio-sdk/style';
import { tableComponent } from '@grapesjs/studio-sdk-plugins';

// License key from environment variable
const LICENSE_KEY = import.meta.env.VITE_GRAPESJS_LICENSE_KEY || '';

// GrapesJS editor type
type EditorInstance = any;

// Debug logging
const DEBUG =
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).get('debug') === 'true' ||
    localStorage.getItem('uswds_pt_debug') === 'true');

function debug(...args: unknown[]): void {
  if (DEBUG) {
    console.log('[Editor]', ...args);
  }
}

export function Editor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const editorRef = useRef<EditorInstance | null>(null);

  // Check if we're in demo mode (no API URL configured)
  const isDemoMode = !import.meta.env.VITE_API_URL;

  // Organization context
  const { currentTeam, isLoading: isLoadingTeam } = useOrganization();

  // Editor state machine
  const stateMachine = useEditorStateMachine();

  // Local state for UI
  const [name, setName] = useState('Untitled Prototype');
  const [htmlContent, setHtmlContent] = useState('');
  const [localPrototype, setLocalPrototype] = useState<LocalPrototype | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [editorKey, setEditorKey] = useState(() => slug || `new-${Date.now()}`);

  // Pending prototype ref for race condition fix
  const pendingPrototypeRef = useRef<Prototype | null>(null);

  // Persistence hook
  const persistence = useEditorPersistence({
    stateMachine,
    editorRef,
    isDemoMode,
    slug,
    name,
    htmlContent,
    setHtmlContent,
    setLocalPrototype,
    localPrototype,
    onNameChange: setName,
    onSaveComplete: () => {
      autosave.markSaved();
      fetchVersions();
    },
  });

  // Autosave hook - enabled when we have a prototype (new or existing)
  const autosave = useEditorAutosave({
    enabled: !isDemoMode && !!stateMachine.state.prototype,
    stateMachine,
    onSave: () => persistence.save('autosave'),
    debounceMs: 5000,
    maxWaitMs: 30000,
  });

  // Version history hook
  const {
    versions,
    isLoading: versionsLoading,
    isRestoring,
    error: versionError,
    fetchVersions,
    restoreVersion,
  } = useVersionHistory(!isDemoMode && slug ? slug : null);

  // Generate blocks
  const blocks = useMemo(() => {
    const uswdsBlocks = Object.entries(DEFAULT_CONTENT).map(([tagName, content]) => {
      const isFullHtml = content.startsWith('__FULL_HTML__');
      const blockContent = isFullHtml
        ? content.replace('__FULL_HTML__', '')
        : `<${tagName}>${content}</${tagName}>`;

      const labelMap: Record<string, string> = {
        'heading': 'Heading',
        'text': 'Text',
        'grid-2-col': '2 Columns',
        'grid-3-col': '3 Columns',
        'grid-4-col': '4 Columns',
        'grid-sidebar-left': 'Sidebar Left',
        'grid-sidebar-right': 'Sidebar Right',
        'grid-container': 'Container',
        'grid-row': 'Row',
      };

      const label = labelMap[tagName] || tagName.replace('usa-', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      return {
        id: tagName,
        label,
        content: blockContent,
        media: COMPONENT_ICONS[tagName] || COMPONENT_ICONS['default'],
        category: getCategoryForComponent(tagName),
      };
    });

    const tableBlock = {
      id: 'table',
      label: 'Table',
      content: { type: 'table', classes: ['usa-table'] },
      media: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v18H3V3zm16 4H5v2h14V7zm0 4H5v2h14v-2zm0 4H5v2h14v-2z"/></svg>`,
      category: 'Data Display',
    };

    return [...uswdsBlocks, tableBlock];
  }, []);

  // GrapesJS setup hook
  const grapesSetup = useGrapesJSSetup({
    stateMachine,
    editorRef,
    isDemoMode,
    slug,
    pendingPrototype: pendingPrototypeRef.current,
    localPrototype,
    prototype: stateMachine.state.prototype,
    onContentChange: autosave.triggerChange,
    blocks,
  });

  // Handle back navigation - save before leaving if there are unsaved changes
  const handleBack = useCallback(async () => {
    // If there are unsaved changes, try to save first
    if (stateMachine.state.dirty && stateMachine.canSave) {
      debug('Saving before navigation...');
      await persistence.save('autosave');
    }
    navigate('/');
  }, [navigate, stateMachine.state.dirty, stateMachine.canSave, persistence]);

  // Handle save
  const handleSave = useCallback(async () => {
    await persistence.save('manual');
  }, [persistence]);

  // Handle editor error retry - forces remount of the editor
  const handleEditorRetry = useCallback(() => {
    debug('Retrying editor after error...');
    // Change the key to force a complete remount
    setEditorKey(`retry-${Date.now()}`);
    // Reset state machine to allow fresh initialization
    stateMachine.reset();
  }, [stateMachine]);

  // Handle export
  const handleExport = useCallback(() => {
    const editor = editorRef.current;
    if (editor) {
      const html = editor.getHtml();
      debug('Export HTML length:', html?.length);
      debug('Export HTML first 1000 chars:', html?.substring(0, 1000));

      // Check for multiple main elements
      const mainMatches = html?.match(/<main[^>]*>/g) || [];
      debug('Number of <main> elements found:', mainMatches.length);
      mainMatches.forEach((match: string, i: number) => {
        debug(`  main ${i}:`, match);
      });

      // Store for comparison with preview
      if (DEBUG) {
        (window as any).__lastExportHtml = html;
        debug('HTML stored in window.__lastExportHtml for inspection');
      }

      setHtmlContent(html);
    }
    setShowExport(true);
  }, []);

  // Handle preview
  const handlePreview = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const pages = editor.Pages?.getAll?.() || [];
    const currentPage = editor.Pages?.getSelected?.();

    if (pages.length <= 1) {
      const html = editor.getHtml();
      debug('Preview HTML length:', html?.length);
      debug('Preview HTML first 1000 chars:', html?.substring(0, 1000));

      // Check for multiple main elements
      const mainMatches = html?.match(/<main[^>]*>/g) || [];
      debug('Number of <main> elements found:', mainMatches.length);
      mainMatches.forEach((match: string, i: number) => {
        debug(`  main ${i}:`, match);
      });

      // Log the wrapper component tree
      const wrapper = editor.DomComponents?.getWrapper();
      if (wrapper) {
        const components = wrapper.components();
        debug('Wrapper has', components?.length || 0, 'top-level components');
        const logComponent = (c: any, depth: number) => {
          const indent = '  '.repeat(depth);
          const tagName = c.get?.('tagName') || c.get?.('type') || 'unknown';
          const id = c.get?.('attributes')?.id || c.getId?.() || '';
          const childCount = c.components?.()?.length || 0;
          debug(`${indent}${tagName}${id ? '#' + id : ''} (${childCount} children)`);
          if (depth < 3) {
            c.components?.()?.forEach?.((child: any) => logComponent(child, depth + 1));
          }
        };
        components?.forEach?.((c: any) => logComponent(c, 1));
      }

      // Store a copy in window for debugging
      if (DEBUG) {
        (window as any).__lastPreviewHtml = html;
        debug('HTML stored in window.__lastPreviewHtml for inspection');
      }

      openPreviewInNewTab(html, name || 'Prototype Preview');
      return;
    }

    // Multi-page preview
    const pageDataList: PageData[] = [];
    const originalPage = currentPage;

    for (const page of pages) {
      editor.Pages?.select?.(page);
      const pageId = page.getId?.() || page.id;
      const pageName = page.get?.('name') || page.getName?.() || `Page ${pageId}`;
      const html = editor.getHtml();
      pageDataList.push({ id: pageId, name: pageName, html });
    }

    if (originalPage) {
      editor.Pages?.select?.(originalPage);
    }

    openMultiPagePreviewInNewTab(pageDataList, name || 'Prototype Preview');
  }, [name]);

  // Handle version restore
  const handleVersionRestore = useCallback(
    async (versionNumber: number): Promise<boolean> => {
      autosave.pause();

      try {
        const success = await restoreVersion(versionNumber);

        if (success && slug) {
          // Reload the prototype via persistence
          await persistence.load(slug);

          // Reload editor content
          const editor = editorRef.current;
          const proto = stateMachine.state.prototype;
          if (editor && proto?.grapesData) {
            editor.loadProjectData(proto.grapesData as any);
          }

          await fetchVersions();
          autosave.markSaved();
        }

        return success;
      } finally {
        autosave.resume();
      }
    },
    [restoreVersion, slug, persistence, stateMachine.state.prototype, fetchVersions, autosave]
  );

  // Warn users before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (stateMachine.state.dirty) {
        e.preventDefault();
        // Modern browsers require returnValue to be set
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [stateMachine.state.dirty]);

  // Load prototype on mount or slug change
  useEffect(() => {
    clearGrapesJSStorage();

    if (slug) {
      // Load existing prototype
      pendingPrototypeRef.current = null;
      setEditorKey(slug);

      if (isDemoMode) {
        persistence.load(slug);
      } else {
        // Load data before triggering editor remount
        loadPrototypeAndRemount(slug);
      }
    } else if (!isDemoMode && currentTeam) {
      // Create new prototype in authenticated mode
      persistence.createNew();
    } else if (isDemoMode) {
      // Demo mode: start fresh
      setLocalPrototype(null);
      setName('Untitled Prototype');
      setHtmlContent('');
      setEditorKey(`new-${Date.now()}`);
    }
  }, [slug, isDemoMode, currentTeam]);

  // Helper to load prototype and then trigger editor remount
  async function loadPrototypeAndRemount(prototypeSlug: string) {
    const loaded = await persistence.load(prototypeSlug);
    if (loaded) {
      pendingPrototypeRef.current = stateMachine.state.prototype;
      setEditorKey(prototypeSlug);
      debug('Prototype loaded, triggering editor remount');
    }
  }

  // Derive loading state from state machine
  const isLoading = stateMachine.isLoading || (isDemoMode === false && !slug && isLoadingTeam);

  // Loading screen
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading editor...</p>
      </div>
    );
  }

  // License key required screen
  if (!LICENSE_KEY) {
    return (
      <div className="editor-container">
        <header className="editor-header">
          <div className="editor-header-left">
            <button className="btn btn-secondary" onClick={handleBack} style={{ padding: '6px 12px' }}>
              ← Back
            </button>
          </div>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
          <div className="card" style={{ maxWidth: '500px', textAlign: 'center' }}>
            <h2>License Key Required</h2>
            <p style={{ color: 'var(--color-base-light)', marginTop: '12px' }}>
              The GrapesJS Studio SDK license key is not configured.
              Please add the <code>VITE_GRAPESJS_LICENSE_KEY</code> environment variable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <EditorHeader
        name={name}
        onNameChange={setName}
        onBack={handleBack}
        onPreview={handlePreview}
        onExport={handleExport}
        onEmbed={() => setShowEmbed(true)}
        onSave={handleSave}
        onToggleHistory={() => setShowVersionHistory(!showVersionHistory)}
        showVersionHistory={showVersionHistory}
        showEmbedButton={!!(slug || localPrototype)}
        showHistoryButton={!isDemoMode && !!slug}
        showAutosaveIndicator={!isDemoMode && !!stateMachine.state.prototype}
        autosaveStatus={autosave.status}
        isSaving={persistence.isSaving}
        isSaveDisabled={persistence.isSaving || (!stateMachine.state.prototype && isLoadingTeam)}
        error={stateMachine.state.error}
      />

      {/* Main Editor */}
      <div className="editor-main" style={{ flex: 1, position: 'relative' }}>
        <EditorErrorBoundary onRetry={handleEditorRetry} onGoHome={handleBack}>
          <StudioEditor
            key={editorKey}
            options={{
              licenseKey: LICENSE_KEY,
              plugins: [
                (editor: any) => tableComponent(editor, {
                  block: {
                    label: 'Table',
                    category: 'Data Display',
                    media: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v18H3V3zm16 4H5v12h14V7zm-8 4h6v2h-6v-2zm0 4h6v2h-6v-2zm-6-4h4v6H5v-6z"/></svg>`,
                  },
                }),
                uswdsTablePlugin,
                uswdsComponentsPlugin,
              ],
              project: {
                type: 'web',
                default: {
                  pages: [{
                    name: 'Prototype',
                    component: (isDemoMode ? localPrototype?.htmlContent : (pendingPrototypeRef.current?.htmlContent || stateMachine.state.prototype?.htmlContent)) || '',
                  }],
                },
              },
              blocks: {
                default: blocks,
              },
            }}
            onReady={grapesSetup.onReady}
          />
        </EditorErrorBoundary>

        {/* Version History Sidebar */}
        {showVersionHistory && !isDemoMode && slug && (
          <VersionHistoryPanel
            versions={versions}
            isLoading={versionsLoading}
            isRestoring={isRestoring}
            error={versionError}
            onRestore={handleVersionRestore}
            onRefresh={fetchVersions}
            onClose={() => setShowVersionHistory(false)}
          />
        )}
      </div>

      {/* Modals */}
      {showExport && (
        <ExportModal
          htmlContent={htmlContent}
          onClose={() => setShowExport(false)}
        />
      )}

      {showEmbed && (slug || localPrototype?.id) && (
        <EmbedModal
          prototypeId={slug || localPrototype?.id || ''}
          onClose={() => setShowEmbed(false)}
        />
      )}
    </div>
  );
}

// Helper function for component categories
function getCategoryForComponent(tagName: string): string {
  const categoryMap: Record<string, string[]> = {
    'Basics': ['heading', 'text'],
    'Actions': ['usa-button', 'usa-button-group', 'usa-link', 'usa-search'],
    'Form Controls': ['usa-text-input', 'usa-textarea', 'usa-select', 'usa-checkbox', 'checkbox-group', 'usa-radio', 'radio-group', 'usa-date-picker', 'usa-time-picker', 'usa-file-input', 'usa-combo-box', 'usa-range-slider'],
    'Navigation': ['usa-breadcrumb', 'usa-pagination', 'usa-side-navigation', 'usa-header', 'usa-footer', 'usa-skip-link'],
    'Data Display': ['usa-card', 'usa-table', 'usa-tag', 'usa-list', 'usa-icon', 'usa-collection', 'usa-summary-box'],
    'Feedback': ['usa-alert', 'usa-banner', 'usa-site-alert', 'usa-modal', 'usa-tooltip'],
    'Page Layouts': ['grid-2-col', 'grid-3-col', 'grid-4-col', 'grid-sidebar-left', 'grid-sidebar-right'],
    'Layout': ['usa-accordion', 'usa-step-indicator', 'usa-process-list', 'usa-identifier', 'usa-prose'],
    'Patterns': ['usa-name-pattern', 'usa-address-pattern', 'usa-phone-number-pattern', 'usa-email-address-pattern', 'usa-date-of-birth-pattern', 'usa-ssn-pattern'],
    'Templates': ['blank-template', 'landing-template', 'form-template', 'sign-in-template', 'error-template'],
  };

  for (const [category, components] of Object.entries(categoryMap)) {
    if (components.includes(tagName)) {
      return category;
    }
  }
  return 'Components';
}
