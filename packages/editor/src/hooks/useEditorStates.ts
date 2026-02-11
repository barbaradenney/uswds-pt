/**
 * useEditorStates Hook
 *
 * Manages named states (views) for component visibility toggling.
 * States are stored in projectData.states (JSONB) — no DB migration needed.
 * Active state is ephemeral (not persisted) and synced via editor events.
 */

import { useState, useCallback, useEffect } from 'react';
import { useEditorMaybe } from '@grapesjs/react';
import type { StateDefinition } from '@uswds-pt/shared';

export interface UseEditorStatesReturn {
  states: StateDefinition[];
  activeStateId: string | null;
  addState: (name: string) => void;
  renameState: (id: string, name: string) => void;
  removeState: (id: string) => void;
  setActiveState: (id: string | null) => void;
}

/**
 * Read states from project data
 */
function readStates(editor: any): StateDefinition[] {
  try {
    const data = editor.getProjectData?.();
    return Array.isArray(data?.states) ? data.states : [];
  } catch {
    return [];
  }
}

/**
 * Write states to project data without triggering a full reload.
 * Mutates the states array in-place on the project data object.
 */
function writeStates(editor: any, states: StateDefinition[]): void {
  try {
    const data = editor.getProjectData?.();
    if (data) {
      data.states = states;
      editor.loadProjectData(data);
    }
  } catch {
    // Silently ignore — editor may not be ready
  }
}

export function useEditorStates(): UseEditorStatesReturn {
  const editor = useEditorMaybe();
  const [states, setStates] = useState<StateDefinition[]>([]);
  const [activeStateId, setActiveStateIdLocal] = useState<string | null>(null);

  // Read states on mount and when editor becomes available
  useEffect(() => {
    if (!editor) return;

    const syncStates = () => setStates(readStates(editor));
    syncStates();

    // Re-sync when project data is loaded (e.g. after save/restore)
    const handler = () => syncStates();
    editor.on('load', handler);
    return () => { editor.off('load', handler); };
  }, [editor]);

  // Listen for state:select events from other components
  useEffect(() => {
    if (!editor) return;

    const handler = (id: string | null) => {
      setActiveStateIdLocal(id);
    };
    editor.on('state:select', handler);
    return () => { editor.off('state:select', handler); };
  }, [editor]);

  const addState = useCallback((name: string) => {
    if (!editor) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    const newState: StateDefinition = {
      id: `state-${Date.now()}`,
      name: trimmed,
    };
    const updated = [...readStates(editor), newState];
    writeStates(editor, updated);
    setStates(updated);
  }, [editor]);

  const renameState = useCallback((id: string, name: string) => {
    if (!editor) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    const current = readStates(editor);
    const updated = current.map(s => s.id === id ? { ...s, name: trimmed } : s);
    writeStates(editor, updated);
    setStates(updated);
  }, [editor]);

  const removeState = useCallback((id: string) => {
    if (!editor) return;

    // Remove state from definitions
    const current = readStates(editor);
    const updated = current.filter(s => s.id !== id);
    writeStates(editor, updated);
    setStates(updated);

    // Clean up data-states attributes that reference the deleted state
    const wrapper = editor.DomComponents?.getWrapper?.();
    if (wrapper) {
      const cleanComponent = (comp: any) => {
        const attrs = comp.getAttributes?.() || {};
        const dataStates = attrs['data-states'];
        if (dataStates) {
          const stateIds = dataStates.split(',').map((s: string) => s.trim()).filter((s: string) => s !== id);
          if (stateIds.length === 0) {
            // No states left — remove attribute (visible in all states)
            comp.removeAttributes?.(['data-states']);
          } else {
            comp.addAttributes?.({ 'data-states': stateIds.join(',') });
          }
        }
        const children = comp.components?.();
        if (children) {
          children.forEach((child: any) => cleanComponent(child));
        }
      };
      cleanComponent(wrapper);
    }

    // If the active state was deleted, clear it
    if (activeStateId === id) {
      setActiveState(null);
    }
  }, [editor, activeStateId]);

  const setActiveState = useCallback((id: string | null) => {
    if (!editor) return;
    (editor as any).__activeStateId = id;
    setActiveStateIdLocal(id);
    editor.trigger('state:select', id);
  }, [editor]);

  return {
    states,
    activeStateId,
    addState,
    renameState,
    removeState,
    setActiveState,
  };
}
