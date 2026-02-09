/**
 * Editor Undo/Redo Hook
 *
 * Groups canUndo/canRedo state, handlers, and the change:changesCount
 * listener from Editor.tsx into one hook.
 */

import { useState, useEffect, useCallback, type RefObject } from 'react';
import type { EditorInstance } from '../types/grapesjs';

export interface UseEditorUndoRedoReturn {
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => void;
  handleRedo: () => void;
}

/**
 * Tracks GrapesJS UndoManager state and exposes undo/redo handlers.
 * Listens to the `change:changesCount` event to keep canUndo/canRedo in sync.
 * @param editorRef - Ref to the GrapesJS editor instance
 * @param editorKey - Remount key used as an effect dependency
 * @param isReady - Whether the editor has reached the "ready" state
 * @returns {{ canUndo, canRedo, handleUndo, handleRedo }}
 */
export function useEditorUndoRedo(
  editorRef: RefObject<EditorInstance | null>,
  editorKey: string,
  isReady: boolean,
): UseEditorUndoRedoReturn {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const handleUndo = useCallback(() => {
    editorRef.current?.UndoManager?.undo();
  }, [editorRef]);

  const handleRedo = useCallback(() => {
    editorRef.current?.UndoManager?.redo();
  }, [editorRef]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !isReady) return;

    const updateUndoState = () => {
      setCanUndo(!!editor.UndoManager?.hasUndo());
      setCanRedo(!!editor.UndoManager?.hasRedo());
    };

    updateUndoState();

    editor.on('change:changesCount', updateUndoState);
    return () => {
      editor.off('change:changesCount', updateUndoState);
    };
  }, [editorKey, isReady, editorRef]);

  return { canUndo, canRedo, handleUndo, handleRedo };
}
