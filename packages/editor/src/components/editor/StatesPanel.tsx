/**
 * StatesPanel Component
 *
 * Manages named states for component visibility toggling.
 * Users can create states like "Customer", "Admin", "Empty State"
 * and tag components with which states they appear in.
 *
 * Follows PagesPanel.tsx pattern for UI structure.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStates } from '../../hooks/useEditorStates';

export function StatesPanel() {
  const { states, activeStateId, addState, renameState, removeState, setActiveState } = useEditorStates();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addValue, setAddValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  useEffect(() => {
    if (isAdding && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isAdding]);

  const handleAdd = useCallback(() => {
    setIsAdding(true);
    setAddValue('');
  }, []);

  const finishAdd = useCallback(() => {
    const trimmed = addValue.trim();
    if (trimmed) {
      addState(trimmed);
    }
    setIsAdding(false);
    setAddValue('');
  }, [addValue, addState]);

  const cancelAdd = useCallback(() => {
    setIsAdding(false);
    setAddValue('');
  }, []);

  const handleDelete = useCallback((e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`Delete state "${name}"? Components tagged with only this state will become visible in all states.`)) {
      removeState(id);
    }
  }, [removeState]);

  const startRename = useCallback((e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setRenamingId(id);
    setRenameValue(name);
  }, []);

  const finishRename = useCallback((id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      renameState(id, trimmed);
    }
    setRenamingId(null);
    setRenameValue('');
  }, [renameValue, renameState]);

  const cancelRename = useCallback(() => {
    setRenamingId(null);
    setRenameValue('');
  }, []);

  return (
    <div className="states-panel">
      <div className="states-panel-header">
        <span className="states-panel-title">States</span>
        <button
          className="states-panel-add-btn"
          onClick={handleAdd}
          title="Add new state"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          Add
        </button>
      </div>

      <div className="states-panel-list" role="listbox" aria-label="States">
        {/* "All States" option — always present */}
        <div
          className={`states-panel-item ${activeStateId === null ? 'states-panel-item--selected' : ''}`}
          role="option"
          aria-selected={activeStateId === null}
          onClick={() => setActiveState(null)}
        >
          <span className="states-panel-item-name">All States</span>
        </div>

        {/* User-defined states */}
        {states.map((state) => {
          const isSelected = activeStateId === state.id;
          const isRenaming = renamingId === state.id;

          return (
            <div
              key={state.id}
              className={`states-panel-item ${isSelected ? 'states-panel-item--selected' : ''}`}
              role="option"
              aria-selected={isSelected}
              onClick={() => setActiveState(state.id)}
            >
              {isRenaming ? (
                <input
                  ref={renameInputRef}
                  className="states-panel-rename-input"
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => finishRename(state.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      finishRename(state.id);
                    } else if (e.key === 'Escape') {
                      cancelRename();
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span
                    className="states-panel-item-name"
                    title="Double-click to rename"
                    onDoubleClick={(e) => startRename(e, state.id, state.name)}
                  >
                    {state.name}
                  </span>
                  <button
                    className="states-panel-delete-btn"
                    title="Delete state"
                    onClick={(e) => handleDelete(e, state.id, state.name)}
                  >
                    &times;
                  </button>
                </>
              )}
            </div>
          );
        })}

        {/* Inline add input */}
        {isAdding && (
          <div className="states-panel-item">
            <input
              ref={addInputRef}
              className="states-panel-rename-input"
              type="text"
              placeholder="State name..."
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              onBlur={finishAdd}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  finishAdd();
                } else if (e.key === 'Escape') {
                  cancelAdd();
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
