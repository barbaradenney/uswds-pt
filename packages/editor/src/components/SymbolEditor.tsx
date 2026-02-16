/**
 * Symbol Editor Component
 *
 * Isolated editor for editing a single symbol. Opens via /symbols/:symbolId/edit.
 * Reuses EditorCanvas with mode='symbol' for a stripped-down editing experience:
 * no pages, no symbol creation, no version history, no GitHub push, no crash recovery.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { GlobalSymbol, SymbolScope } from '@uswds-pt/shared';
import { createDebugLogger } from '@uswds-pt/shared';
import { useOrganizationContext } from '../contexts/OrganizationContext';
import { fetchGlobalSymbol, updateGlobalSymbol } from '../lib/api';
import { SymbolEditorHeader, type SymbolSaveStatus } from './editor/SymbolEditorHeader';
import { EditorCanvas } from './editor/EditorCanvas';
import { GJS_EVENTS } from '../lib/contracts';
import { loadUSWDSResources } from '../lib/grapesjs/resource-loader';
import { setupSpacingTrait, setupConditionalShowHideTrait } from '../lib/grapesjs/setup';
import { generateBlocks } from '../lib/blocks';
import type { EditorInstance } from '../types/grapesjs';

const debug = createDebugLogger('SymbolEditor');

export function SymbolEditor() {
  const { symbolId } = useParams<{ symbolId: string }>();
  const navigate = useNavigate();
  const editorRef = useRef<EditorInstance | null>(null);

  const { currentTeam } = useOrganizationContext();
  const teamId = currentTeam?.id || null;

  // Symbol state
  const [symbol, setSymbol] = useState<GlobalSymbol | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SymbolSaveStatus>('clean');

  // Refs for stable closures (prevents stale state in event handlers and effects)
  const isDirtyRef = useRef(false);
  isDirtyRef.current = isDirty;

  const symbolRef = useRef<GlobalSymbol | null>(null);
  symbolRef.current = symbol;

  const saveStatusRef = useRef<SymbolSaveStatus>('clean');
  saveStatusRef.current = saveStatus;

  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch symbol data
  useEffect(() => {
    if (!teamId || !symbolId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchGlobalSymbol(teamId, symbolId).then((result) => {
      if (cancelled) return;
      if (result.success && result.data) {
        setSymbol(result.data);
      } else {
        setError(result.error || 'Failed to load symbol');
      }
      setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [teamId, symbolId]);

  // Retry handler for load failures
  const handleRetryLoad = useCallback(() => {
    if (!teamId || !symbolId) return;

    setIsLoading(true);
    setError(null);

    fetchGlobalSymbol(teamId, symbolId).then((result) => {
      if (result.success && result.data) {
        setSymbol(result.data);
      } else {
        setError(result.error || 'Failed to load symbol');
      }
      setIsLoading(false);
    });
  }, [teamId, symbolId]);

  // Convert symbol data to GrapesJS project data
  const projectData = useMemo(() => {
    if (!symbol?.symbolData) return null;
    return {
      pages: [{ name: 'Symbol', frames: [{ component: symbol.symbolData }] }],
      symbols: [],
    };
  }, [symbol]);

  // Generate blocks from shared utility
  const blocks = useMemo(() => generateBlocks(), []);

  // Editor ready handler — lightweight setup (no pages, no symbols, no crash recovery)
  const onReady = useCallback((editor: EditorInstance) => {
    debug('Symbol editor ready');
    editorRef.current = editor;

    // Load USWDS resources into canvas
    loadUSWDSResources(editor);

    // Set up traits
    const registerListener = (ed: EditorInstance, event: string, handler: (...args: unknown[]) => void) => {
      ed.on(event, handler);
    };
    setupSpacingTrait(editor, registerListener);
    setupConditionalShowHideTrait(editor, registerListener);

    // Track changes for dirty state
    const markDirty = () => {
      setIsDirty(true);
      setSaveStatus('dirty');
    };

    editor.on(GJS_EVENTS.COMPONENT_UPDATE, markDirty);
    editor.on(GJS_EVENTS.COMPONENT_ADD, markDirty);
    editor.on(GJS_EVENTS.COMPONENT_REMOVE, markDirty);
  }, []);

  // Save handler — uses refs to avoid stale closures and dependency churn
  const handleSave = useCallback(async () => {
    const editor = editorRef.current;
    const currentSymbol = symbolRef.current;
    if (!editor || !teamId || !symbolId || !currentSymbol) return;

    // Concurrent save guard
    if (saveStatusRef.current === 'saving') return;

    setSaveStatus('saving');

    try {
      const wrapper = editor.DomComponents.getWrapper();
      if (!wrapper) {
        setSaveStatus('error');
        setError('Editor not ready');
        return;
      }

      const children = wrapper.components().models;

      // Serialize: single root → use it directly; multiple roots → wrap in div
      const serialized = children.length === 1
        ? children[0].toJSON()
        : { tagName: 'div', components: children.map((c: any) => c.toJSON()) };

      // Preserve original symbol ID and label
      const updatedSymbolData = {
        ...serialized,
        id: currentSymbol.symbolData.id,
        label: currentSymbol.name,
      };

      const result = await updateGlobalSymbol(teamId, symbolId, {
        symbolData: updatedSymbolData,
      });

      if (result.success && result.data) {
        debug('Symbol saved successfully');
        setSymbol(result.data);
        setIsDirty(false);
        setSaveStatus('saved');
        setError(null);

        // Clear any previous reset timer
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

        // Reset to clean after 2s
        saveTimerRef.current = setTimeout(() => {
          setSaveStatus((prev) => prev === 'saved' ? 'clean' : prev);
        }, 2000);
      } else {
        setSaveStatus('error');
        setError(result.error || 'Failed to save symbol');
      }
    } catch (err) {
      debug('Save failed:', err);
      setSaveStatus('error');
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }, [teamId, symbolId]);

  // Keyboard shortcut: Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Unsaved changes warning on tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Cleanup on unmount: destroy editor + clear save timer
  useEffect(() => {
    return () => {
      editorRef.current?.destroy();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Navigate back with unsaved changes confirmation
  const handleBack = useCallback(() => {
    if (isDirtyRef.current) {
      const confirmed = window.confirm('You have unsaved changes. Discard?');
      if (!confirmed) return;
    }
    navigate(-1);
  }, [navigate]);

  // Stable callback refs for EditorCanvas memo (prevents re-renders on state changes)
  const stableOnRetry = useCallback(() => {
    navigate(0);
  }, [navigate]);

  const stableOnGoHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Loading state
  if (isLoading || !teamId) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading symbol editor...</p>
      </div>
    );
  }

  // Error state (no symbol loaded)
  if (error && !symbol) {
    return (
      <div className="loading-screen">
        <p style={{ color: 'var(--color-error)' }}>{error}</p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            className="btn btn-primary"
            onClick={handleRetryLoad}
          >
            Retry
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!symbol) return null;

  const editorKey = `symbol-${symbolId}`;

  return (
    <div className="editor-container">
      <SymbolEditorHeader
        name={symbol.name}
        scope={(symbol.scope || 'team') as SymbolScope}
        saveStatus={saveStatus}
        onBack={handleBack}
        onSave={handleSave}
        isSaveDisabled={saveStatus === 'saving' || saveStatus === 'clean'}
        error={error}
      />

      <div className="editor-main" style={{ flex: 1, position: 'relative' }}>
        <EditorCanvas
          editorKey={editorKey}
          initialContent=""
          projectData={projectData}
          blocks={blocks}
          onReady={onReady}
          onRetry={stableOnRetry}
          onGoHome={stableOnGoHome}
          mode="symbol"
        />

        {/* Saving overlay */}
        {saveStatus === 'saving' && (
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
              <span style={{ fontSize: '14px', color: '#1b1b1b' }}>Saving symbol...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
