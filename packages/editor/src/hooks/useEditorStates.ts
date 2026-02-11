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
 * Read states from the editor instance property.
 * Falls back to an empty array if not yet initialized.
 */
function readStates(editor: any): StateDefinition[] {
  const states = (editor as any).__projectStates;
  return Array.isArray(states) ? states : [];
}

/**
 * Write states to the editor instance property.
 * This avoids calling loadProjectData() which would reset the entire editor.
 * States are merged into the project data snapshot at save time.
 */
function writeStates(editor: any, states: StateDefinition[]): void {
  (editor as any).__projectStates = states;
}

export function useEditorStates(): UseEditorStatesReturn {
  const editor = useEditorMaybe();
  const [states, setStates] = useState<StateDefinition[]>([]);
  const [activeStateId, setActiveStateIdLocal] = useState<string | null>(null);

  // Initialize __projectStates from project data on mount, and re-seed on 'load'
  // (covers crash recovery / version restore which call loadProjectData).
  useEffect(() => {
    if (!editor) return;

    const seedFromProjectData = () => {
      try {
        const data = editor.getProjectData?.();
        const stored = Array.isArray(data?.states) ? data.states : [];
        (editor as any).__projectStates = stored;
        setStates(stored);
      } catch {
        (editor as any).__projectStates = [];
        setStates([]);
      }
    };

    seedFromProjectData();

    // Re-seed when project data is fully reloaded (e.g. crash recovery, version restore)
    editor.on('load', seedFromProjectData);
    return () => { editor.off('load', seedFromProjectData); };
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
    editor.trigger('states:update');
  }, [editor]);

  const renameState = useCallback((id: string, name: string) => {
    if (!editor) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    const current = readStates(editor);
    const updated = current.map(s => s.id === id ? { ...s, name: trimmed } : s);
    writeStates(editor, updated);
    setStates(updated);
    editor.trigger('states:update');
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

    editor.trigger('states:update');

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
