/**
 * StatesPanel Component
 *
 * Manages named states AND user personas for component visibility toggling.
 * Two sections in one tab, separated by a divider.
 *
 * States: "Customer view", "Admin view", "Empty State", "Error"
 * Users:  "Admin", "Guest", "Customer"
 *
 * AND logic: component must match BOTH active state AND active user.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStates } from '../../hooks/useEditorStates';
import { useEditorUsers } from '../../hooks/useEditorUsers';

/* ============================================
   Reusable DefinitionListSection
   ============================================ */

interface DefinitionListSectionProps {
  title: string;
  items: Array<{ id: string; name: string }>;
  activeId: string | null;
  onSetActive: (id: string | null) => void;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  allLabel: string;
  placeholder: string;
  deleteConfirmMessage: (name: string) => string;
}

function DefinitionListSection({
  title,
  items,
  activeId,
  onSetActive,
  onAdd,
  onRename,
  onRemove,
  allLabel,
  placeholder,
  deleteConfirmMessage,
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
        {/* "All" option — always present */}
        <div
          className={`states-panel-item ${activeId === null ? 'states-panel-item--selected' : ''}`}
          role="option"
          aria-selected={activeId === null}
          onClick={() => onSetActive(null)}
        >
          <span className="states-panel-item-name">{allLabel}</span>
        </div>

        {/* User-defined items */}
        {items.map((item) => {
          const isSelected = activeId === item.id;
          const isRenaming = renamingId === item.id;

          return (
            <div
              key={item.id}
              className={`states-panel-item ${isSelected ? 'states-panel-item--selected' : ''}`}
              role="option"
              aria-selected={isSelected}
              onClick={() => onSetActive(item.id)}
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

/* ============================================
   Main StatesPanel
   ============================================ */

export function StatesPanel() {
  const { states, activeStateId, addState, renameState, removeState, setActiveState } = useEditorStates();
  const { users, activeUserId, addUser, renameUser, removeUser, setActiveUser } = useEditorUsers();

  return (
    <div className="states-panel">
      <DefinitionListSection
        title="States"
        items={states}
        activeId={activeStateId}
        onSetActive={setActiveState}
        onAdd={addState}
        onRename={renameState}
        onRemove={removeState}
        allLabel="All States"
        placeholder="State name..."
        deleteConfirmMessage={(name) =>
          `Delete state "${name}"? Components tagged with only this state will become visible in all states.`
        }
      />

      <hr className="states-panel-divider" />

      <DefinitionListSection
        title="Users"
        items={users}
        activeId={activeUserId}
        onSetActive={setActiveUser}
        onAdd={addUser}
        onRename={renameUser}
        onRemove={removeUser}
        allLabel="All Users"
        placeholder="User name..."
        deleteConfirmMessage={(name) =>
          `Delete user "${name}"? Components tagged with only this user will become visible for all users.`
        }
      />
    </div>
  );
}
