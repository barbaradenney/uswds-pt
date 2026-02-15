/**
 * Editor Component
 *
 * Main visual editor for USWDS prototypes using GrapesJS core.
 * Uses composable hooks for state management, persistence, and setup.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Prototype, SymbolScope, GrapesJSSymbol, GrapesProjectData } from '@uswds-pt/shared';
import { createDebugLogger, DEBUG_STORAGE_KEY } from '@uswds-pt/shared';
import { useOrganizationContext } from '../contexts/OrganizationContext';
import { useVersionHistory } from '../hooks/useVersionHistory';
import { useEditorStateMachine } from '../hooks/useEditorStateMachine';
import { useEditorPersistence } from '../hooks/useEditorPersistence';
import { useEditorAutosave } from '../hooks/useEditorAutosave';
import { useGrapesJSSetup } from '../hooks/useGrapesJSSetup';
import { useGlobalSymbols, mergeGlobalSymbols } from '../hooks/useGlobalSymbols';
import { useCrashRecovery } from '../hooks/useCrashRecovery';
import { useGitHubPush } from '../hooks/useGitHubPush';
import { ExportModal } from './ExportModal';
import { VersionHistoryPanel } from './VersionHistoryPanel';
import { EditorHeader } from './editor/EditorHeader';
import { EditorCanvas } from './editor/EditorCanvas';
import { RecoveryBanner } from './RecoveryBanner';
import { SymbolScopeDialog } from './SymbolScopeDialog';
import { SymbolsContext } from './editor/SymbolsPanel';
import { TemplateChooser } from './TemplateChooser';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { openPreviewInNewTab, openMultiPagePreviewInNewTab, cleanExport, generateFullDocument, generateMultiPageDocument, type PageData } from '../lib/export';
import { isDemoMode, API_ENDPOINTS, apiGet } from '../lib/api';
import { GJS_EVENTS, EDITOR_EVENTS } from '../lib/contracts';
import { type LocalPrototype } from '../lib/localStorage';
import { clearGrapesJSStorage, loadUSWDSResources } from '../lib/grapesjs/resource-loader';
import {
  DEFAULT_CONTENT,
  COMPONENT_ICONS,
  STARTER_TEMPLATES,
} from '@uswds-pt/adapter';
import type { EditorInstance } from '../types/grapesjs';

const debug = createDebugLogger('Editor');

// Debug mode check for window debug helpers
const DEBUG =
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).get('debug') === 'true' ||
    localStorage.getItem(DEBUG_STORAGE_KEY) === 'true');

export function Editor() {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const editorRef = useRef<EditorInstance | null>(null);

  // After first save, the prototype gets a slug but we don't navigate (to avoid
  // remounting the editor). Derive an effective slug from the route param OR
  // the prototype's slug so downstream hooks see the slug without a route change.
  const [savedSlug, setSavedSlug] = useState<string | undefined>(undefined);
  const slug = routeSlug || savedSlug;

  // Organization context
  const { organization, currentTeam, teams, isLoading: isLoadingTeam } = useOrganizationContext();
  const hasOrgAdmin = teams.some((t) => t.role === 'org_admin');

  // Editor state machine
  const stateMachine = useEditorStateMachine();

  // Global symbols hook
  const globalSymbols = useGlobalSymbols({
    teamId: currentTeam?.id || null,
    enabled: !isDemoMode,
    prototypeId: stateMachine.state.prototype?.id || null,
  });

  // State for symbol scope dialog
  const [showSymbolDialog, setShowSymbolDialog] = useState(false);
  const [pendingSymbolData, setPendingSymbolData] = useState<GrapesJSSymbol | null>(null);
  // Ref to the native GrapesJS main symbol component (for cancel/undo)
  const pendingMainSymbolRef = useRef<any>(null);

  // Local state for UI
  const [name, setName] = useState('Untitled Prototype');
  const [htmlContent, setHtmlContent] = useState('');
  const [exportPages, setExportPages] = useState<PageData[]>([]);
  const [localPrototype, setLocalPrototype] = useState<LocalPrototype | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [editorKey, setEditorKey] = useState(() => slug || `new-${Date.now()}`);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(
    slug ? '__existing__' : null
  );
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Pending prototype ref for race condition fix
  const pendingPrototypeRef = useRef<Prototype | null>(null);

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
    onFirstSaveSlug: setSavedSlug,
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

  /**
   * Stable autosave callback that delegates to the latest persistence.save via ref.
   * Avoids recreating the function on every render, preventing useEditorAutosave
   * from resetting its debounce timer.
   */
  const stableAutosaveOnSave = useCallback(() => saveCallRef.current('autosave'), []);

  // Autosave disabled — save only via Save button or Cmd+S.
  // Crash recovery (IndexedDB) and dirty tracking (beforeunload) still active.
  const autosave = useEditorAutosave({
    enabled: false,
    stateMachine,
    onSave: stableAutosaveOnSave,
    debounceMs: 5000,
    maxWaitMs: 30000,
  });

  // Crash recovery hook
  const crashRecovery = useCrashRecovery({
    editorRef,
    stateMachine,
    slug,
    isDemoMode,
    localPrototype,
    prototypeName: name,
    editorKey,
  });

  // GitHub push hook
  const gitHubPush = useGitHubPush({
    slug,
    teamId: currentTeam?.id,
    enabled: !isDemoMode,
  });

  // Version history hook
  const {
    versions,
    isLoading: versionsLoading,
    isRestoring,
    error: versionError,
    fetchVersions,
    restoreVersion,
    updateLabel,
  } = useVersionHistory(
    !isDemoMode && slug ? slug : null,
  );

  /**
   * Post-save cleanup callback, updated every render so the ref always has the
   * latest closures. Resets the autosave timer, refreshes version history, and
   * clears the IndexedDB crash-recovery snapshot. Called by useEditorPersistence
   * after a successful API save.
   */
  onSaveCompleteRef.current = () => {
    autosave.markSaved();
    crashRecovery.clearRecoveryData();
    if (!isDemoMode) gitHubPush.markSaved();
    fetchVersions().catch((err: unknown) => {
      debug('fetchVersions after save failed (non-critical):', err);
    });
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

    return uswdsBlocks;
  }, []);

  // Stable initialContent: only recompute when editorKey changes (editor will remount).
  // Between key changes, return the same string to prevent memo() from detecting changes.
  const initialContentCacheRef = useRef({ key: '', content: '' });
  if (initialContentCacheRef.current.key !== editorKey) {
    const savedContent = isDemoMode
      ? localPrototype?.htmlContent
      : (pendingPrototypeRef.current?.htmlContent || stateMachine.state.prototype?.htmlContent);

    // For new prototypes, use the selected starter template content.
    // Falls back to the blank-template block for backwards compatibility.
    let templateContent = '';
    if (selectedTemplate && selectedTemplate !== '__existing__') {
      const template = STARTER_TEMPLATES.find(t => t.id === selectedTemplate);
      debug('Template lookup:', selectedTemplate, '→ found:', !!template, 'contentLen:', template?.content?.length || 0);
      templateContent = template?.content
        ? template.content.replace('__FULL_HTML__', '')
        : '';
    } else if (!savedContent) {
      templateContent = DEFAULT_CONTENT['blank-template']?.replace('__FULL_HTML__', '') || '';
    }

    initialContentCacheRef.current = {
      key: editorKey,
      content: savedContent || templateContent,
    };
  }

  // Stable projectData: only recompute when editorKey changes (editor will remount).
  // Passed to EditorCanvas → SDK's storage.project so the SDK loads it during init,
  // avoiding manual loadProjectData() calls and timing races in onReady.
  // Also passed to useGrapesJSSetup for safety-net loadProjectData in onReady.
  const projectDataCacheRef = useRef<{ key: string; data: GrapesProjectData | null }>({ key: '', data: null });
  if (projectDataCacheRef.current.key !== editorKey) {
    let grapesData: GrapesProjectData | null = null;

    // Use pendingPrototypeRef (set synchronously in loadPrototypeAndRemount)
    // as the primary source — it's always current regardless of React state timing.
    // Fall back to localPrototype (demo) or stateMachine prototype (API mode).
    const protoData = pendingPrototypeRef.current || stateMachine.state.prototype;
    if (protoData?.grapesData) {
      grapesData = protoData.grapesData as GrapesProjectData;
    } else if (isDemoMode && localPrototype?.gjsData) {
      try {
        grapesData = JSON.parse(localPrototype.gjsData);
      } catch {
        // Invalid JSON, fall through to null
      }
    }

    // Merge global symbols if we have project data
    if (grapesData) {
      const symbols = globalSymbols.getGrapesJSSymbols;
      if (symbols.length > 0) {
        grapesData = mergeGlobalSymbols(grapesData, symbols);
      }
    }

    projectDataCacheRef.current = { key: editorKey, data: grapesData };
  }

  // Stable combined onContentChange — calls both autosave and crash recovery.
  // Uses a ref so GrapesJS event handlers (registered once in onReady) always
  // call the latest versions without needing to be re-registered.
  const stableCrashRecoveryOnChange = useRef(crashRecovery.onContentChange);
  stableCrashRecoveryOnChange.current = crashRecovery.onContentChange;

  const stableAutosaveTrigger = useRef(autosave.triggerChange);
  stableAutosaveTrigger.current = autosave.triggerChange;

  /**
   * Unified content-change handler passed to GrapesJS via useGrapesJSSetup.
   * Triggers both the autosave debounce timer and the crash-recovery IndexedDB
   * snapshot. Uses refs so the single function registered in onReady always
   * delegates to the latest hook instances without re-registration.
   */
  const combinedOnContentChange = useCallback(() => {
    stableAutosaveTrigger.current();
    stableCrashRecoveryOnChange.current();
  }, []);

  /**
   * Intercepts GrapesJS symbol creation to show a scope-selection dialog first.
   * Stashes the serialized symbol data and the live component reference, then
   * opens SymbolScopeDialog. The actual creation (local or global via API)
   * happens in handleSymbolScopeConfirm after the user chooses a scope.
   */
  const handleSymbolCreate = useCallback(
    (symbolData: GrapesJSSymbol, mainComponent: any) => {
      debug('Symbol creation requested (native):', symbolData);
      // symbolData is the serialized main from main.toJSON()
      // mainComponent is the live GrapesJS main symbol component
      setPendingSymbolData(symbolData as any);
      pendingMainSymbolRef.current = mainComponent;
      setShowSymbolDialog(true);
    },
    []
  );

  // Derive org-level state/user definitions for the editor.
  // Declared here (before useGrapesJSSetup) so they can be passed as options,
  // and also referenced by the sync useEffects further below.
  const orgStates = organization?.stateDefinitions || [];
  const orgUsers = organization?.userDefinitions || [];

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
    onContentChange: combinedOnContentChange,
    blocks,
    globalSymbols: globalSymbols.getGrapesJSSymbols,
    onSymbolCreate: handleSymbolCreate,
    orgStates,
    orgUsers,
  });

  /**
   * Navigates back to the prototype list. Saves first if there are unsaved
   * changes (dirty + canSave). Uses refs instead of state closures so the
   * check always reads the latest dirty/canSave values, matching the
   * pattern used by the unmount and visibility-change handlers.
   */
  const handleBack = useCallback(async () => {
    if (saveDirtyRef.current && saveCanSaveRef.current) {
      debug('Saving before navigation...');
      await saveCallRef.current('autosave');
    }
    navigate('/');
  }, [navigate]);

  /**
   * Triggers a manual save -- extracts HTML + grapesData via persistence.save,
   * sends to API with optimistic concurrency (version/If-Match), and updates
   * the state machine. Called by Cmd+S / Ctrl+S shortcut and the Save button.
   */
  const handleSave = useCallback(async () => {
    await saveCallRef.current('manual');
  }, []);

  /**
   * Forces a complete GrapesJS editor remount after an initialization error.
   * Generates a new editorKey (causing React to unmount/remount EditorCanvas)
   * and resets the state machine so the fresh editor can re-initialize cleanly.
   */
  const handleEditorRetry = useCallback(() => {
    debug('Retrying editor after error...');
    // Change the key to force a complete remount
    setEditorKey(`retry-${Date.now()}`);
    // Reset state machine to allow fresh initialization
    stateMachine.reset();
  }, [stateMachine]);

  /**
   * Called when the user picks a starter template from TemplateChooser.
   * Sets the selected template and name, and generates a new editorKey
   * to force a fresh GrapesJS mount with that template's initial content.
   */
  const handleTemplateSelect = useCallback((templateId: string, prototypeName: string) => {
    setSelectedTemplate(templateId);
    setName(prototypeName);
    setEditorKey(`new-${templateId}-${Date.now()}`);
  }, []);

  // === Stable prop wrappers for EditorCanvas ===
  // EditorCanvas is memo()'d. If ANY prop changes reference, it re-renders and
  // creates a new inline `options` object, which causes GjsEditor to reinitialize
  // with initialContent, wiping the user's work. These ref-based wrappers ensure
  // stable function references across re-renders so memo() prevents EditorCanvas
  // from re-rendering after saves, state changes, etc.
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

  /**
   * Completes symbol creation after the user selects a scope
   * in the SymbolScopeDialog. Creates the symbol via the API
   * with the selected scope. Resets pending symbol state on completion.
   */
  const handleSymbolScopeConfirm = useCallback(
    async (scope: SymbolScope, name: string) => {
      if (!pendingSymbolData) return;

      debug('Creating symbol:', name, 'scope:', scope);

      // For native symbols, pendingSymbolData is the serialized main (from main.toJSON()).
      // Wrap it with id/label for the API, preserving native GrapesJS linking data.
      const mainId = pendingMainSymbolRef.current?.getId?.() || `symbol-${Date.now()}`;
      const symbolDataForApi: GrapesJSSymbol = {
        ...(pendingSymbolData as any),
        id: mainId,
        label: name,
      };

      const created = await globalSymbols.create(
        name,
        symbolDataForApi,
        scope,
      );
      if (created) {
        debug('Symbol created:', created.id, 'scope:', scope);
      }

      // Reset pending state
      setPendingSymbolData(null);
      pendingMainSymbolRef.current = null;
    },
    [pendingSymbolData, globalSymbols]
  );

  /**
   * Extracts HTML from GrapesJS and opens the ExportModal. For single-page
   * prototypes, captures the current page HTML. For multi-page prototypes,
   * iterates all pages (temporarily selecting each to extract its HTML),
   * restores the original page selection, and passes the full PageData array
   * to the modal for download/copy.
   */
  const handleToggleHistory = useCallback(() => setShowVersionHistory(prev => !prev), []);

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

  /**
   * Opens a live preview of the prototype in a new browser tab. Saves the
   * current editor state first to ensure the preview reflects the latest
   * content. Prefers the hash-based preview route (/preview/:slug) which
   * survives tab refresh. Falls back to a blob URL for unsaved prototypes
   * that have no slug yet. Handles both single-page and multi-page previews.
   */
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

  /**
   * Generates clean, production-ready HTML from the current editor state and
   * pushes it to the team's handoff GitHub repository. Single-page prototypes
   * produce a standalone document; multi-page prototypes include page navigation.
   */
  const handlePushHandoff = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const pages = editor.Pages?.getAll?.() || [];
    const currentPage = editor.Pages?.getSelected?.();
    let fullDocument: string;

    if (pages.length <= 1) {
      const html = editor.getHtml();
      const cleaned = cleanExport(html);
      fullDocument = generateFullDocument(cleaned, { title: name });
    } else {
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

      fullDocument = generateMultiPageDocument(pageDataList, { title: name });
    }

    gitHubPush.pushHandoff(fullDocument);
  }, [name, gitHubPush]);

  /**
   * Restores a specific version from history using in-place reload (Path 2).
   * Pauses autosave, calls the restore API, fetches the updated prototype,
   * and loads it directly into the existing GrapesJS editor via loadProjectData
   * (no remount needed). Uses the RESTORE_VERSION state machine flow instead of
   * persistence.load(), which would enter initializing_editor and stall because
   * onReady never fires without a component remount.
   */
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
        const result = await apiGet<Prototype>(
          API_ENDPOINTS.PROTOTYPE(slug),
          'Failed to load restored prototype'
        );
        if (!result.success || !result.data) {
          stateMachine.restoreVersionFailed(result.error || 'Failed to load restored prototype');
          return false;
        }
        const proto: Prototype = result.data;

        // 4. In-place reload into editor
        const editor = editorRef.current;
        if (editor && proto.grapesData) {
          editor.loadProjectData(proto.grapesData as any);
          await loadUSWDSResources(editor);
          editor.refresh();
        }

        // 5. Update name state from restored prototype
        if (proto?.name) {
          setName(proto.name);
        }

        // 6. Transition state machine back: restoring_version → ready
        stateMachine.restoreVersionComplete(proto);

        // 7. Refresh UI
        await fetchVersions();
        autosave.markSaved();
        crashRecovery.clearRecoveryData();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Restore failed';
        stateMachine.restoreVersionFailed(message);
        return false;
      } finally {
        autosave.resume();
      }
    },
    [restoreVersion, slug, stateMachine, fetchVersions, autosave, crashRecovery, editorRef]
  );

  // Undo/redo handlers
  const handleUndo = useCallback(() => {
    editorRef.current?.UndoManager?.undo();
  }, []);

  const handleRedo = useCallback(() => {
    editorRef.current?.UndoManager?.redo();
  }, []);

  /**
   * Subscribes to GrapesJS UndoManager changes to keep the canUndo/canRedo
   * button states in sync. Re-runs only when editorKey changes (new mount)
   * or when the editor transitions to "ready" status, not on every state
   * machine transition. Cleans up the event listener on unmount or re-run.
   */
  const isEditorReady = stateMachine.state.status === 'ready';
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !isEditorReady) return;

    const updateUndoState = () => {
      setCanUndo(!!editor.UndoManager?.hasUndo());
      setCanRedo(!!editor.UndoManager?.hasRedo());
    };

    // Update immediately
    updateUndoState();

    // Listen for undo manager changes
    editor.on(GJS_EVENTS.CHANGES_COUNT, updateUndoState);
    return () => {
      editor.off(GJS_EVENTS.CHANGES_COUNT, updateUndoState);
    };
  }, [editorKey, isEditorReady]);

  // Sync org-level state/user definitions to the editor instance whenever they change.
  // The visibility traits read from these instance properties at component:selected time.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    (editor as any).__projectStates = orgStates;
    editor.trigger?.(EDITOR_EVENTS.STATES_UPDATE);
  }, [orgStates]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    (editor as any).__projectUsers = orgUsers;
    editor.trigger?.(EDITOR_EVENTS.USERS_UPDATE);
  }, [orgUsers]);

  // Sync available symbols to editor instance for AI copilot access
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    (editor as any).__availableSymbols = globalSymbols.symbols;
  }, [globalSymbols.symbols]);

  /**
   * Registers global keyboard shortcuts: Cmd+S / Ctrl+S triggers manual save,
   * and "?" opens the keyboard shortcuts dialog (ignored when focus is in
   * input/textarea/select or contentEditable elements). Cleaned up on unmount.
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveCallRef.current('manual');
      }
      // Show shortcuts dialog on ? key (not in input/textarea)
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        const tagName = target.tagName.toLowerCase();
        if (tagName !== 'input' && tagName !== 'textarea' && tagName !== 'select' && !target.isContentEditable) {
          setShowShortcuts(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /**
   * Shows the browser's native "unsaved changes" confirmation dialog when the
   * user attempts to close/refresh the tab while dirty. Re-subscribes whenever
   * dirty state changes so the handler always reads the current value.
   */
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

  /**
   * Fires an autosave when the tab loses visibility (browser back, tab switch,
   * or minimize). Uses refs for dirty/canSave to avoid stale closures, and
   * fire-and-forget .catch() so the save completes even if the component
   * is about to unmount.
   */
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

  /**
   * Listens for the browser "online" event and automatically retries saving
   * if there are dirty unsaved changes. Covers the case where the user edited
   * while offline and the autosave failed silently.
   */
  useEffect(() => {
    const handleOnline = () => {
      if (saveDirtyRef.current && saveCanSaveRef.current) {
        debug('Network reconnected with unsaved changes — saving');
        saveCallRef.current('autosave').catch((err) => {
          debug('Reconnect save failed:', err instanceof Error ? err.message : String(err));
        });
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  /**
   * Last-resort save on component unmount. Catches in-app navigation via
   * React Router where beforeunload does not fire. The fetch is fire-and-forget
   * so it continues even after the component tree is torn down.
   */
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

  /**
   * Destroys the GrapesJS editor instance on unmount to free event listeners,
   * DOM mutations, and internal state. Runs after the save cleanup above.
   */
  useEffect(() => {
    return () => {
      editorRef.current?.destroy();
    };
  }, []);

  /**
   * Loads the prototype on mount or when the URL slug changes. Clears stale
   * GrapesJS localStorage first. Guards against redundant reloads when the
   * prototype is already loaded (prevents async dependency changes like
   * currentTeam from wiping the editor). For new prototypes, defers creation
   * to the first save. In demo mode, resets state for a fresh canvas.
   * @remarks Intentionally omits stateMachine.state.prototype and localPrototype
   * from the dependency array to avoid re-firing on every save cycle.
   */
  useEffect(() => {
    clearGrapesJSStorage();

    if (slug) {
      // Skip reload if we already have this prototype loaded.
      // This prevents dependency changes (e.g., currentTeam loading async)
      // from re-firing the effect and wiping unsaved editor content.
      if (stateMachine.state.prototype?.slug === slug) {
        return;
      }
      // In demo mode, also guard via localPrototype (covers the window between
      // saveSuccess dispatch and React committing the state update).
      if (isDemoMode && localPrototype?.id === slug) {
        return;
      }
      pendingPrototypeRef.current = null;
      loadPrototypeAndRemount(slug);
    } else if (!isDemoMode && currentTeam && selectedTemplate) {
      // New prototype in authenticated mode — skip createNew(), first save handles creation
      debug('New prototype with template:', selectedTemplate);
    } else if (isDemoMode && selectedTemplate) {
      // Demo mode: start fresh with selected template
      setLocalPrototype(null);
      setName('Untitled Prototype');
      setHtmlContent('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally excludes stateMachine.state.prototype, localPrototype, loadPrototypeAndRemount to prevent re-firing on every save
  }, [slug, isDemoMode, currentTeam, selectedTemplate]);

  /**
   * Fetches a prototype from the API via persistence.load, stashes it in
   * pendingPrototypeRef (synchronously available before React state commits),
   * and generates a new editorKey to force a full GrapesJS remount. The
   * pendingPrototypeRef is read by the initialContent and projectData caches
   * during the next render so the editor initializes with the loaded data.
   */
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

  // Template chooser — show before loading screen when creating a new prototype
  if (!slug && !selectedTemplate) {
    return <TemplateChooser onSelect={handleTemplateSelect} onBack={() => navigate('/')} />;
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

  return (
    <SymbolsContext.Provider value={globalSymbols}>
      <div className="editor-container">
        <EditorHeader
          name={name}
          onBack={handleBack}
          onPreview={handlePreview}
          onExport={handleExport}
          onSave={handleSave}
          onToggleHistory={handleToggleHistory}
          showVersionHistory={showVersionHistory}
          showHistoryButton={!isDemoMode && !!slug}
          showAutosaveIndicator={!isDemoMode && !!stateMachine.state.prototype}
          autosaveStatus={autosave.status}
          lastSavedAt={autosave.lastSavedAt}
          isSaving={persistence.isSaving}
          isSaveDisabled={persistence.isSaving || (!isDemoMode && !stateMachine.state.prototype && isLoadingTeam)}
          error={stateMachine.state.error}
          showConnectionStatus={!isDemoMode}
          lastSnapshotAt={crashRecovery.lastSnapshotAt}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onShowShortcuts={() => setShowShortcuts(true)}
          canPush={gitHubPush.canPush}
          canHandoff={gitHubPush.canHandoff}
          isPushing={gitHubPush.isPushing}
          hasUnpushedChanges={gitHubPush.hasUnpushedChanges}
          onPush={gitHubPush.push}
          onPushHandoff={handlePushHandoff}
          lastPushResult={gitHubPush.lastPushResult}
          onDismissPushResult={gitHubPush.dismissResult}
        />

        {/* Recovery Banner */}
        {crashRecovery.recoveryAvailable && crashRecovery.recoveryTimestamp && (
          <RecoveryBanner
            timestamp={crashRecovery.recoveryTimestamp}
            onRestore={crashRecovery.restoreRecovery}
            onDismiss={crashRecovery.dismissRecovery}
          />
        )}

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

          {/* Saving overlay — manual saves only (autosaves use the non-invasive header indicator) */}
          {persistence.isManualSaving && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              zIndex: 10,
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                padding: '24px 32px',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}>
                <div className="loading-spinner" />
                <span style={{ fontSize: '14px', color: '#1b1b1b' }}>Saving prototype...</span>
              </div>
            </div>
          )}

          {/* Version History Sidebar */}
          {showVersionHistory && !isDemoMode && slug && (
            <VersionHistoryPanel
              slug={slug}
              versions={versions}
              isLoading={versionsLoading}
              isRestoring={isRestoring}
              error={versionError}
              onRestore={handleVersionRestore}
              onUpdateLabel={updateLabel}
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
            prototypeId={slug || localPrototype?.id}
            onClose={() => setShowExport(false)}
          />
        )}

        {/* Symbol Scope Dialog */}
        <SymbolScopeDialog
          isOpen={showSymbolDialog}
          onClose={() => {
            // If user cancels, undo the native symbol creation.
            // Removing the main symbol auto-detaches all instances.
            const main = pendingMainSymbolRef.current;
            if (main) {
              try {
                debug('Cancelling symbol creation — removing main');
                main.remove();
              } catch (err) {
                debug('Failed to remove main on cancel:', err);
              }
            }
            setShowSymbolDialog(false);
            setPendingSymbolData(null);
            pendingMainSymbolRef.current = null;
          }}
          onConfirm={handleSymbolScopeConfirm}
          pendingSymbol={pendingSymbolData}
          isDemoMode={isDemoMode}
          hasTeam={!!currentTeam}
          hasOrganization={!!organization}
          hasOrgAdmin={hasOrgAdmin}
        />

        {/* Keyboard Shortcuts Dialog */}
        <KeyboardShortcutsDialog
          isOpen={showShortcuts}
          onClose={() => setShowShortcuts(false)}
        />
      </div>
    </SymbolsContext.Provider>
  );
}

/**
 * Static mapping from block-panel category name to the component tag names
 * it contains. Hoisted to module scope so it is allocated once (not on every
 * call to getCategoryForComponent).
 */
const CATEGORY_MAP: Record<string, string[]> = {
  'Basics': ['heading', 'text'],
  'Containers': ['form-container', 'section-container', 'fieldset'],
  'Actions': ['usa-button', 'usa-button-group', 'usa-link', 'usa-search'],
  'Form Controls': ['usa-text-input', 'usa-textarea', 'usa-select', 'usa-checkbox', 'checkbox-group', 'usa-radio', 'radio-group', 'usa-date-picker', 'usa-time-picker', 'usa-file-input', 'usa-combo-box', 'usa-range-slider', 'usa-character-count', 'usa-memorable-date'],
  'Navigation': ['usa-breadcrumb', 'usa-pagination', 'usa-side-navigation', 'usa-header', 'usa-footer', 'usa-skip-link', 'usa-in-page-navigation', 'usa-language-selector'],
  'Data Display': ['usa-card', 'usa-table', 'usa-tag', 'usa-list', 'usa-icon', 'usa-collection', 'usa-summary-box'],
  'Feedback': ['usa-alert', 'usa-banner', 'usa-site-alert', 'usa-modal', 'usa-tooltip'],
  'Page Layouts': ['grid-2-col', 'grid-3-col', 'grid-4-col', 'grid-sidebar-left', 'grid-sidebar-right'],
  'Layout': ['usa-accordion', 'usa-step-indicator', 'usa-process-list', 'usa-identifier', 'usa-prose'],
  'Patterns': ['usa-name-pattern', 'usa-address-pattern', 'usa-phone-number-pattern', 'usa-email-address-pattern', 'usa-date-of-birth-pattern', 'usa-ssn-pattern'],
  'Templates': ['blank-template', 'landing-template', 'form-template', 'sign-in-template', 'error-template'],
};

/**
 * Maps a component tag name (e.g., "usa-button") to its block-panel category
 * (e.g., "Actions"). Falls back to "Components" for any unrecognized tag.
 * Used by the blocks useMemo to organize the drag-and-drop panel.
 */
function getCategoryForComponent(tagName: string): string {
  for (const [category, components] of Object.entries(CATEGORY_MAP)) {
    if (components.includes(tagName)) {
      return category;
    }
  }
  return 'Components';
}
