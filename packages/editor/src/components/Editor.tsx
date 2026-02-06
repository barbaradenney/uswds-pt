/**
 * Editor Component
 *
 * Main visual editor for USWDS prototypes using GrapesJS Studio SDK.
 * Refactored to use composable hooks for state management, persistence, and setup.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Prototype, SymbolScope, GrapesJSSymbol } from '@uswds-pt/shared';
import { createDebugLogger } from '@uswds-pt/shared';
import { authFetch } from '../hooks/useAuth';
import { useOrganization } from '../hooks/useOrganization';
import { useVersionHistory } from '../hooks/useVersionHistory';
import { useEditorStateMachine } from '../hooks/useEditorStateMachine';
import { useEditorPersistence } from '../hooks/useEditorPersistence';
import { useEditorAutosave } from '../hooks/useEditorAutosave';
import { useGrapesJSSetup } from '../hooks/useGrapesJSSetup';
import { useGlobalSymbols, mergeGlobalSymbols } from '../hooks/useGlobalSymbols';
import { ExportModal } from './ExportModal';
import { EmbedModal } from './EmbedModal';
import { VersionHistoryPanel } from './VersionHistoryPanel';
import { EditorHeader } from './editor/EditorHeader';
import { EditorCanvas } from './editor/EditorCanvas';
import { SymbolScopeDialog } from './SymbolScopeDialog';
import { openPreviewInNewTab, openMultiPagePreviewInNewTab, type PageData } from '../lib/export';
import { type LocalPrototype, getPrototypes } from '../lib/localStorage';
import { clearGrapesJSStorage, loadUSWDSResources } from '../lib/grapesjs/resource-loader';
import {
  DEFAULT_CONTENT,
  COMPONENT_ICONS,
} from '@uswds-pt/adapter';
import type { EditorInstance } from '../types/grapesjs';

// License key from environment variable
const LICENSE_KEY = import.meta.env.VITE_GRAPESJS_LICENSE_KEY || '';

const debug = createDebugLogger('Editor');

// Debug mode check for window debug helpers
const DEBUG =
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).get('debug') === 'true' ||
    localStorage.getItem('uswds_pt_debug') === 'true');

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

  // Global symbols hook
  const globalSymbols = useGlobalSymbols({
    teamId: currentTeam?.id || null,
    enabled: !isDemoMode,
  });

  // State for symbol scope dialog
  const [showSymbolDialog, setShowSymbolDialog] = useState(false);
  const [pendingSymbolData, setPendingSymbolData] = useState<GrapesJSSymbol | null>(null);
  const pendingSymbolComponentRef = useRef<any>(null);

  // Local state for UI
  const [name, setName] = useState('Untitled Prototype');
  const [htmlContent, setHtmlContent] = useState('');
  const [exportPages, setExportPages] = useState<PageData[]>([]);
  const [localPrototype, setLocalPrototype] = useState<LocalPrototype | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [editorKey, setEditorKey] = useState(() => slug || `new-${Date.now()}`);

  // Pending prototype ref for race condition fix
  const pendingPrototypeRef = useRef<Prototype | null>(null);

  // Guard: set before navigate on first save, prevents load useEffect from remounting
  const justSavedSlugRef = useRef<string | null>(null);

  // Ref for stable onSaveComplete callback (avoids circular dependency with autosave)
  const onSaveCompleteRef = useRef<() => void>(() => {});

  // Persistence hook - uses ref for stable callback
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
    onSaveComplete: () => onSaveCompleteRef.current(),
    justSavedSlugRef,
  });

  // Refs for all save call sites: handleBack, handleSave, handlePreview,
  // autosave onSave, visibilitychange, and unmount cleanup.
  // Updated every render so closures/timeouts always read the latest values.
  const saveDirtyRef = useRef(false);
  const saveCanSaveRef = useRef(false);
  const saveCallRef = useRef(persistence.save);
  saveDirtyRef.current = stateMachine.state.dirty;
  saveCanSaveRef.current = stateMachine.canSave;
  saveCallRef.current = persistence.save;

  // Stable callback for autosave — avoids recreating performSave every render
  const stableAutosaveOnSave = useCallback(() => saveCallRef.current('autosave'), []);

  // Autosave hook - enabled when we have a prototype (new or existing)
  const autosave = useEditorAutosave({
    enabled: !isDemoMode && !!stateMachine.state.prototype,
    stateMachine,
    onSave: stableAutosaveOnSave,
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

  // Update the stable callback ref after autosave is defined
  onSaveCompleteRef.current = () => {
    autosave.markSaved();
    fetchVersions();
  };

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
        'form-container': 'Form',
        'section-container': 'Section',
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

  // Stable initialContent: only recompute when editorKey changes (editor will remount).
  // Between key changes, return the same string to prevent memo() from detecting changes.
  const initialContentCacheRef = useRef({ key: '', content: '' });
  if (initialContentCacheRef.current.key !== editorKey) {
    initialContentCacheRef.current = {
      key: editorKey,
      content: (isDemoMode
        ? localPrototype?.htmlContent
        : (pendingPrototypeRef.current?.htmlContent || stateMachine.state.prototype?.htmlContent)
      ) || '',
    };
  }

  // Stable projectData: only recompute when editorKey changes (editor will remount).
  // Passed to EditorCanvas → SDK's storage.project so the SDK loads it during init,
  // avoiding manual loadProjectData() calls and timing races in onReady.
  // Also passed to useGrapesJSSetup for safety-net loadProjectData in onReady.
  const projectDataCacheRef = useRef<{ key: string; data: Record<string, any> | null }>({ key: '', data: null });
  if (projectDataCacheRef.current.key !== editorKey) {
    let grapesData: Record<string, any> | null = null;

    if (isDemoMode) {
      if (localPrototype?.gjsData) {
        try {
          grapesData = JSON.parse(localPrototype.gjsData);
        } catch {
          // Invalid JSON, fall through to null
        }
      }
    } else {
      const protoData = pendingPrototypeRef.current || stateMachine.state.prototype;
      if (protoData?.grapesData) {
        grapesData = protoData.grapesData as Record<string, any>;
      }
    }

    // Only use grapesData if it has actual content
    if (grapesData) {
      const firstPageComponents = (grapesData as any).pages?.[0]?.frames?.[0]?.component?.components;
      const hasActualContent = Array.isArray(firstPageComponents) && firstPageComponents.length > 0;
      if (!hasActualContent) {
        grapesData = null;
      }
    }

    // Merge global symbols if we have project data
    if (grapesData) {
      const symbols = globalSymbols.getGrapesJSSymbols();
      if (symbols.length > 0) {
        grapesData = mergeGlobalSymbols(grapesData, symbols);
      }
    }

    projectDataCacheRef.current = { key: editorKey, data: grapesData };
  }

  // Callback for when a symbol is being created in GrapesJS
  // Dialog-first: receives serialized data and the selected component ref
  const handleSymbolCreate = useCallback(
    (symbolData: GrapesJSSymbol, selectedComponent: any) => {
      debug('Symbol creation requested:', symbolData);
      setPendingSymbolData(symbolData);
      pendingSymbolComponentRef.current = selectedComponent;
      setShowSymbolDialog(true);
    },
    []
  );

  // GrapesJS setup hook
  const grapesSetup = useGrapesJSSetup({
    stateMachine,
    editorRef,
    isDemoMode,
    slug,
    pendingPrototype: pendingPrototypeRef.current,
    localPrototype,
    prototype: stateMachine.state.prototype,
    projectData: projectDataCacheRef.current.data,
    onContentChange: autosave.triggerChange,
    blocks,
    globalSymbols: globalSymbols.getGrapesJSSymbols(),
    onSymbolCreate: handleSymbolCreate,
  });

  // Handle back navigation - save before leaving if there are unsaved changes.
  // Uses refs (saveDirtyRef, saveCanSaveRef, saveCallRef) so we always read the
  // latest dirty/canSave values — same pattern as the working unmount handler.
  const handleBack = useCallback(async () => {
    if (saveDirtyRef.current && saveCanSaveRef.current) {
      debug('Saving before navigation...');
      await saveCallRef.current('autosave');
    }
    navigate('/');
  }, [navigate]);

  // Handle save — uses ref so it always calls the latest persistence.save
  const handleSave = useCallback(async () => {
    await saveCallRef.current('manual');
  }, []);

  // Handle editor error retry - forces remount of the editor
  const handleEditorRetry = useCallback(() => {
    debug('Retrying editor after error...');
    // Change the key to force a complete remount
    setEditorKey(`retry-${Date.now()}`);
    // Reset state machine to allow fresh initialization
    stateMachine.reset();
  }, [stateMachine]);

  // === Stable prop wrappers for EditorCanvas ===
  // EditorCanvas is memo()'d. If ANY prop changes reference, it re-renders and
  // creates a new inline `options` object, which causes the StudioEditor SDK to
  // reinitialize with initialContent, wiping the user's work (see pitfall #1).
  // These ref-based wrappers ensure stable function references across re-renders
  // so memo() prevents EditorCanvas from re-rendering after saves, state changes, etc.
  const stableOnReadyRef = useRef<(editor: EditorInstance) => void>(() => {});
  const stableOnRetryRef = useRef<() => void>(() => {});
  const stableOnGoHomeRef = useRef<() => void>(() => {});

  // Keep refs up-to-date with latest callback implementations
  stableOnReadyRef.current = grapesSetup.onReady;
  stableOnRetryRef.current = handleEditorRetry;
  stableOnGoHomeRef.current = handleBack;

  // Stable callbacks that never change reference — always delegate to latest via ref
  const stableOnReady = useCallback((editor: EditorInstance) => stableOnReadyRef.current(editor), []);
  const stableOnRetry = useCallback(() => stableOnRetryRef.current(), []);
  const stableOnGoHome = useCallback(() => stableOnGoHomeRef.current(), []);

  // Handle symbol scope selection from dialog
  const handleSymbolScopeConfirm = useCallback(
    async (scope: SymbolScope, name: string) => {
      if (!pendingSymbolData) return;

      const selectedComponent = pendingSymbolComponentRef.current;
      const editor = editorRef.current;

      // Guard: only local symbols need the live component reference
      if (scope === 'local' && !selectedComponent?.getEl?.()) {
        debug('Selected component no longer exists, aborting local symbol creation');
        setPendingSymbolData(null);
        pendingSymbolComponentRef.current = null;
        return;
      }

      if (scope === 'local') {
        // Create local symbol via GrapesJS
        debug('Creating local symbol:', name);
        try {
          if (editor?.Components?.addSymbol) {
            const symbol = editor.Components.addSymbol(selectedComponent);
            // Update label if the user changed it
            if (symbol?.set && name !== pendingSymbolData.label) {
              symbol.set('label', name);
            }
          }
        } catch (e) {
          console.warn('Failed to create local symbol:', e);
        }
      } else {
        // Create as global symbol via API (no local symbol needed)
        debug('Creating global symbol:', name);
        const created = await globalSymbols.create(name, {
          ...pendingSymbolData,
          label: name,
        });
        if (created) {
          debug('Global symbol created:', created.id);
        }
      }

      // Reset pending state
      setPendingSymbolData(null);
      pendingSymbolComponentRef.current = null;
    },
    [pendingSymbolData, globalSymbols, editorRef]
  );

  // Handle export
  const handleExport = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      setShowExport(true);
      return;
    }

    const pages = editor.Pages?.getAll?.() || [];
    const currentPage = editor.Pages?.getSelected?.();

    if (pages.length <= 1) {
      // Single page export
      const html = editor.getHtml();
      debug('Export: HTML length =', html?.length);

      if (DEBUG) {
        (window as any).__lastExportHtml = html;
      }

      setHtmlContent(html);
      setExportPages([]);
    } else {
      // Multi-page export - collect all pages
      const pageDataList: PageData[] = [];
      const originalPage = currentPage;

      for (const page of pages) {
        editor.Pages?.select?.(page);
        const pageId = page.getId?.() || page.id;
        const pageName = page.get?.('name') || page.getName?.() || `Page ${pageId}`;
        const html = editor.getHtml();
        pageDataList.push({ id: pageId, name: pageName, html });
      }

      // Restore original page selection
      if (originalPage) {
        editor.Pages?.select?.(originalPage);
      }

      debug('Export: collected', pageDataList.length, 'pages');
      setExportPages(pageDataList);
      setHtmlContent(pageDataList[0]?.html || '');
    }

    setShowExport(true);
  }, []);

  // Handle preview - saves first then opens preview route (survives refresh)
  const handlePreview = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;

    // Get current prototype ID as fallback
    let prototypeId = slug || localPrototype?.id;
    debug('Preview: starting, current ID:', prototypeId);

    // Save current state to ensure preview shows latest content
    const savedPrototype = await saveCallRef.current('manual');
    debug('Preview: save result:', savedPrototype);

    if (savedPrototype) {
      // Use the returned prototype directly (avoids React state race condition)
      prototypeId = savedPrototype.slug;
      debug('Preview: using saved prototype slug:', prototypeId);
    }

    if (prototypeId) {
      // Open preview route in new tab - this survives refresh
      // Use hash-based URL for HashRouter compatibility (GitHub Pages)
      const basePath = import.meta.env.BASE_URL || '/';
      const previewUrl = `${window.location.origin}${basePath}#/preview/${prototypeId}`;
      debug('Preview: opening URL:', previewUrl);
      window.open(previewUrl, '_blank');
      return;
    }

    // Fallback to blob URL for unsaved prototypes (won't survive refresh)
    debug('Preview: using blob URL fallback (no ID available)');
    const pages = editor.Pages?.getAll?.() || [];
    const currentPage = editor.Pages?.getSelected?.();

    if (pages.length <= 1) {
      const html = editor.getHtml();
      debug('Preview: HTML length =', html?.length);

      // Store for debugging (accessible via window.__lastPreviewHtml)
      if (DEBUG) {
        (window as any).__lastPreviewHtml = html;
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
  }, [name, slug, localPrototype?.id]);

  // Handle version restore — uses Path 2 (in-place reload)
  // Uses RESTORE_VERSION_START → RESTORE_VERSION_COMPLETE state machine flow
  // instead of persistence.load() which would use LOAD_PROTOTYPE → PROTOTYPE_LOADED
  // and get stuck in initializing_editor (onReady never fires without remount).
  const handleVersionRestore = useCallback(
    async (versionNumber: number): Promise<boolean> => {
      autosave.pause();
      try {
        // 1. Transition state machine: ready → restoring_version
        stateMachine.restoreVersionStart(versionNumber);

        // 2. Call API to restore version
        const success = await restoreVersion(versionNumber);
        if (!success || !slug) {
          stateMachine.restoreVersionFailed('Failed to restore version');
          return false;
        }

        // 3. Fetch the restored prototype directly (NOT persistence.load)
        const response = await authFetch(`/api/prototypes/${slug}`);
        if (!response.ok) {
          stateMachine.restoreVersionFailed('Failed to load restored prototype');
          return false;
        }
        const proto: Prototype = await response.json();

        // 4. In-place reload into editor
        const editor = editorRef.current;
        if (editor && proto.grapesData) {
          editor.loadProjectData(proto.grapesData as any);
          await loadUSWDSResources(editor);
          editor.refresh();
        }

        // 5. Transition state machine back: restoring_version → ready
        stateMachine.restoreVersionComplete(proto);

        // 6. Refresh UI
        await fetchVersions();
        autosave.markSaved();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Restore failed';
        stateMachine.restoreVersionFailed(message);
        return false;
      } finally {
        autosave.resume();
      }
    },
    [restoreVersion, slug, stateMachine, fetchVersions, autosave, editorRef]
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

  // Save when the tab becomes hidden (browser back, tab switch, minimize).
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && saveDirtyRef.current && saveCanSaveRef.current) {
        debug('Tab hidden with unsaved changes — saving');
        saveCallRef.current('autosave').catch((err) => {
          debug('Tab visibility save failed:', err instanceof Error ? err.message : String(err));
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Save on component unmount (catches React Router in-app navigation).
  // Fire-and-forget: the fetch continues even after unmount.
  useEffect(() => {
    return () => {
      if (saveDirtyRef.current && saveCanSaveRef.current) {
        debug('Component unmounting with unsaved changes — saving');
        saveCallRef.current('autosave').catch((err) => {
          debug('Unmount save failed:', err instanceof Error ? err.message : String(err));
        });
      }
    };
  }, []);

  // Load prototype on mount or slug change
  useEffect(() => {
    clearGrapesJSStorage();

    if (slug) {
      // Skip if we just saved and got this slug (prevents remount after first save)
      if (justSavedSlugRef.current === slug) {
        justSavedSlugRef.current = null;
        return;
      }
      // Skip reload if we already have this prototype loaded.
      // This prevents dependency changes (e.g., currentTeam loading async)
      // from re-firing the effect and wiping unsaved editor content.
      if (stateMachine.state.prototype?.slug === slug) {
        return;
      }
      pendingPrototypeRef.current = null;
      loadPrototypeAndRemount(slug);
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
    const loadedPrototype = await persistence.load(prototypeSlug);
    if (loadedPrototype) {
      // Use the returned prototype directly instead of relying on state
      // (React state update is async and won't be available yet)
      pendingPrototypeRef.current = loadedPrototype;
      // Use a unique key to force remount — on refresh, editorKey is already
      // slug from useState init, so setEditorKey(slug) would be a no-op.
      setEditorKey(`${prototypeSlug}-${Date.now()}`);
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
        showConnectionStatus={!isDemoMode}
      />

      {/* Main Editor */}
      <div className="editor-main" style={{ flex: 1, position: 'relative' }}>
        <EditorCanvas
          editorKey={editorKey}
          initialContent={initialContentCacheRef.current.content}
          projectData={projectDataCacheRef.current.data}
          blocks={blocks}
          onReady={stableOnReady}
          onRetry={stableOnRetry}
          onGoHome={stableOnGoHome}
        />

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
          pages={exportPages.length > 0 ? exportPages : undefined}
          onClose={() => setShowExport(false)}
        />
      )}

      {showEmbed && (slug || localPrototype?.id) && (
        <EmbedModal
          prototypeId={slug || localPrototype?.id || ''}
          onClose={() => setShowEmbed(false)}
        />
      )}

      {/* Symbol Scope Dialog */}
      <SymbolScopeDialog
        isOpen={showSymbolDialog}
        onClose={() => {
          setShowSymbolDialog(false);
          setPendingSymbolData(null);
          pendingSymbolComponentRef.current = null;
        }}
        onConfirm={handleSymbolScopeConfirm}
        pendingSymbol={pendingSymbolData}
        isDemoMode={isDemoMode}
        hasTeam={!!currentTeam}
      />
    </div>
  );
}

// Helper function for component categories
function getCategoryForComponent(tagName: string): string {
  const categoryMap: Record<string, string[]> = {
    'Basics': ['heading', 'text'],
    'Containers': ['form-container', 'section-container', 'fieldset'],
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
