/**
 * DefinitionListSection Component
 *
 * Reusable list component for managing named definitions (states, user personas, etc.).
 * Supports add, rename, delete, and optional active selection.
 * Used in both OrgSettings (CRUD only) and editor sidebar (CRUD + selection).
 */

import { useState, useRef, useEffect, useCallback } from 'react';

export interface DefinitionListSectionProps {
  title: string;
  items: Array<{ id: string; name: string }>;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  /** Optional: active selection (only needed in editor context) */
  activeId?: string | null;
  onSelect?: (id: string | null) => void;
  allLabel?: string;
  placeholder?: string;
  deleteConfirmMessage?: (name: string) => string;
}

export function DefinitionListSection({
  title,
  items,
  onAdd,
  onRename,
  onRemove,
  activeId,
  onSelect,
  allLabel = `All ${title}`,
  placeholder = `${title.replace(/s$/, '')} name...`,
  deleteConfirmMessage = (name) =>
    `Delete "${name}"? Components tagged with only this ${title.toLowerCase().replace(/s$/, '')} will become visible in all ${title.toLowerCase()}.`,
}: DefinitionListSectionProps) {
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
      onAdd(trimmed);
    }
    setIsAdding(false);
    setAddValue('');
  }, [addValue, onAdd]);

  const cancelAdd = useCallback(() => {
    setIsAdding(false);
    setAddValue('');
  }, []);

  const handleDelete = useCallback((e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(deleteConfirmMessage(name))) {
      onRemove(id);
    }
  }, [onRemove, deleteConfirmMessage]);

  const startRename = useCallback((e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setRenamingId(id);
    setRenameValue(name);
  }, []);

  const finishRename = useCallback((id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      onRename(id, trimmed);
    }
    setRenamingId(null);
    setRenameValue('');
  }, [renameValue, onRename]);

  const cancelRename = useCallback(() => {
    setRenamingId(null);
    setRenameValue('');
  }, []);

  return (
    <div className="states-panel-section">
      <div className="states-panel-header">
        <span className="states-panel-title">{title}</span>
        <button
          className="states-panel-add-btn"
          onClick={handleAdd}
          title={`Add new ${title.toLowerCase().replace(/s$/, '')}`}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          Add
        </button>
      </div>

      <div className="states-panel-list" role="listbox" aria-label={title}>
        {/* "All" option — only shown when selection is enabled */}
        {onSelect && (
          <div
            className={`states-panel-item ${activeId === null ? 'states-panel-item--selected' : ''}`}
            role="option"
            aria-selected={activeId === null}
            onClick={() => onSelect(null)}
          >
            <span className="states-panel-item-name">{allLabel}</span>
          </div>
        )}

        {/* User-defined items */}
        {items.map((item) => {
          const isSelected = onSelect ? activeId === item.id : false;
          const isRenaming = renamingId === item.id;

          return (
            <div
              key={item.id}
              className={`states-panel-item ${isSelected ? 'states-panel-item--selected' : ''}`}
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelect?.(item.id)}
            >
              {isRenaming ? (
                <input
                  ref={renameInputRef}
                  className="states-panel-rename-input"
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => finishRename(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      finishRename(item.id);
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
                    onDoubleClick={(e) => startRename(e, item.id, item.name)}
                  >
                    {item.name}
                  </span>
                  <button
                    className="states-panel-delete-btn"
                    title={`Delete ${title.toLowerCase().replace(/s$/, '')}`}
                    onClick={(e) => handleDelete(e, item.id, item.name)}
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
              placeholder={placeholder}
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
