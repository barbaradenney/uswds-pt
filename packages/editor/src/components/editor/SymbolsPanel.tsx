/**
 * Symbols Panel
 *
 * Browse, insert, rename, update, delete, and promote reusable symbols.
 * Grouped by scope (prototype, team, organization) with
 * filter bar, inline actions, and permission gating.
 *
 * SymbolsContext is co-located here for simplicity — it
 * provides the useGlobalSymbols return value without
 * prop-drilling through the memo'd RightSidebar.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type { GlobalSymbol, SymbolScope, Role } from '@uswds-pt/shared';
import type { UseGlobalSymbolsReturn } from '../../hooks/useGlobalSymbols';
import { useEditorMaybe } from '@grapesjs/react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useOrganizationContext } from '../../contexts/OrganizationContext';
import { isNativeSymbolData, findMainByGrapesId, serializeMainSymbol } from '../../lib/grapesjs/symbol-utils';
import '../../styles/symbols-panel.css';

// ============================================================================
// SymbolsContext
// ============================================================================

export const SymbolsContext = createContext<UseGlobalSymbolsReturn | null>(null);

function useSymbolsContext(): UseGlobalSymbolsReturn {
  const ctx = useContext(SymbolsContext);
  if (!ctx) {
    throw new Error('useSymbolsContext must be used within SymbolsContext.Provider');
  }
  return ctx;
}

// ============================================================================
// Permission helpers
// ============================================================================

function canEdit(symbol: GlobalSymbol, userId: string | undefined, role: Role | undefined): boolean {
  if (!userId) return false;
  const isCreator = symbol.createdBy === userId;
  if (symbol.scope === 'organization') {
    return isCreator || role === 'org_admin';
  }
  return isCreator || role === 'team_admin' || role === 'org_admin';
}

function canPromoteToTeam(symbol: GlobalSymbol): boolean {
  return symbol.scope === 'prototype';
}

function canPromoteToOrg(
  symbol: GlobalSymbol,
  role: Role | undefined,
  hasOrg: boolean,
): boolean {
  return (
    (symbol.scope === 'prototype' || symbol.scope === 'team') &&
    role === 'org_admin' &&
    hasOrg
  );
}

// ============================================================================
// SymbolsPanel (main panel)
// ============================================================================

const SCOPE_ORDER: SymbolScope[] = ['prototype', 'team', 'organization'];
const SCOPE_LABELS: Record<SymbolScope, string> = {
  prototype: 'Prototype',
  team: 'Team',
  organization: 'Organization',
};

export const SymbolsPanel = memo(function SymbolsPanel() {
  const { symbols, isLoading, error, refresh, update, remove, promote } = useSymbolsContext();
  const { user } = useAuthContext();
  const { organization, currentTeam } = useOrganizationContext();
  const editor = useEditorMaybe();

  const userId = user?.id;
  const role = currentTeam?.role as Role | undefined;
  const hasOrg = !!organization;

  const handleDragStart = useCallback((symbol: GlobalSymbol, e: React.MouseEvent) => {
    if (!editor || e.button !== 0) return;

    const symbolData = symbol.symbolData;
    if (!symbolData) return;

    // Native symbol: check if the main exists in the editor
    if (isNativeSymbolData(symbolData)) {
      const scopedId = symbolData.id;
      const main = findMainByGrapesId(editor, scopedId);
      if (main) {
        // Drag a new instance by adding the symbol content which includes the
        // __symbol reference. GrapesJS will auto-create linked instances on drop.
        const mainJson = main.toJSON();
        const tempId = `__symbol-drag-${symbol.id}`;
        editor.Blocks.add(tempId, {
          label: symbol.name,
          content: mainJson,
          category: '__symbol-drag__',
        });
        const block = editor.Blocks.get(tempId);
        if (block) {
          editor.Blocks.startDrag(block, e.nativeEvent);
          editor.once('block:drag:stop', () => {
            editor.Blocks.remove(tempId);
          });
        }
        return;
      }
    }

    // Legacy fallback: paste raw component JSON
    const components = symbolData?.components;
    if (!components || components.length === 0) return;

    const tempId = `__symbol-drag-${symbol.id}`;
    editor.Blocks.add(tempId, {
      label: symbol.name,
      content: components as any,
      category: '__symbol-drag__',
    });
    const block = editor.Blocks.get(tempId);
    if (!block) return;

    editor.Blocks.startDrag(block, e.nativeEvent);
    editor.once('block:drag:stop', () => {
      editor.Blocks.remove(tempId);
    });
  }, [editor]);

  const handleInsert = useCallback((symbol: GlobalSymbol) => {
    if (!editor) return;

    const symbolData = symbol.symbolData;
    if (!symbolData) return;

    const um = (editor as any).UndoManager;
    um?.start?.();

    try {
      const selected = (editor as any).getSelected?.();
      const wrapper = (editor as any).DomComponents?.getWrapper();

      // Determine insertion target and position
      let target: any;
      let atIndex: number | undefined;

      if (selected) {
        const parent = selected.parent?.();
        if (parent) {
          target = parent;
          const children = parent.components();
          const models = children.models || [];
          for (let i = 0; i < models.length; i++) {
            if (models[i] === selected) {
              atIndex = i + 1;
              break;
            }
          }
          if (atIndex === undefined) atIndex = models.length;
        } else {
          target = wrapper;
        }
      } else {
        const mainComps = wrapper?.find?.('main') || [];
        target = mainComps[0] || wrapper;
      }

      if (!target) return;

      // Native symbol: find the main and create a linked instance
      if (isNativeSymbolData(symbolData)) {
        const scopedId = symbolData.id;
        const main = findMainByGrapesId(editor, scopedId);
        if (main) {
          // addSymbol on an existing main creates a new linked instance
          const instance = editor.Components.addSymbol(main);
          if (instance) {
            // Move instance to the desired position
            instance.move(target, { at: atIndex });
          }
          return;
        }
      }

      // Legacy fallback: raw paste (no linking)
      const components = symbolData?.components;
      if (!components || components.length === 0) return;

      if (atIndex !== undefined) {
        target.components().add(components, { at: atIndex });
      } else {
        target.append?.(components);
      }
    } finally {
      um?.stop?.();
    }
  }, [editor]);

  const [scopeFilter, setScopeFilter] = useState<SymbolScope | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Group and filter symbols
  const groupedSymbols = useMemo(() => {
    let filtered = symbols;

    // Scope filter
    if (scopeFilter !== 'all') {
      filtered = filtered.filter((s) => s.scope === scopeFilter);
    }

    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((s) => s.name.toLowerCase().includes(term));
    }

    // Group by scope
    const groups = new Map<SymbolScope, GlobalSymbol[]>();
    for (const scope of SCOPE_ORDER) {
      const items = filtered.filter((s) => s.scope === scope);
      if (items.length > 0) {
        groups.set(scope, items);
      }
    }
    return groups;
  }, [symbols, scopeFilter, searchTerm]);

  if (isLoading) {
    return (
      <div className="symbols-panel">
        <div className="symbols-loading">
          <div className="loading-spinner" />
          <span>Loading symbols...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="symbols-panel">
        <div className="symbols-error">
          <span>{error}</span>
          <button className="symbols-error-retry" onClick={refresh}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (symbols.length === 0) {
    return (
      <div className="symbols-panel">
        <div className="symbols-empty">
          No symbols yet. Select a component and click the symbol icon to create one.
        </div>
      </div>
    );
  }

  return (
    <div className="symbols-panel">
      {/* Filter bar */}
      <div className="symbols-filter">
        <select
          className="symbols-filter-scope"
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value as SymbolScope | 'all')}
          aria-label="Filter by scope"
        >
          <option value="all">All</option>
          <option value="prototype">Prototype</option>
          <option value="team">Team</option>
          <option value="organization">Org</option>
        </select>
        <input
          type="text"
          className="symbols-filter-search"
          placeholder="Search symbols..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search symbols"
        />
      </div>

      {/* Scope groups */}
      <div>
        {groupedSymbols.size === 0 && searchTerm && (
          <div className="symbols-empty">
            No symbols match &ldquo;{searchTerm}&rdquo;
          </div>
        )}
        {SCOPE_ORDER.map((scope) => {
          const items = groupedSymbols.get(scope);
          if (!items) return null;
          return (
            <SymbolScopeGroup
              key={scope}
              scope={scope}
              symbols={items}
              userId={userId}
              role={role}
              hasOrg={hasOrg}
              update={update}
              remove={remove}
              promote={promote}
              onInsert={handleInsert}
              onDragStart={handleDragStart}
              editor={editor}
            />
          );
        })}
      </div>
    </div>
  );
});

// ============================================================================
// SymbolScopeGroup (collapsible)
// ============================================================================

interface SymbolScopeGroupProps {
  scope: SymbolScope;
  symbols: GlobalSymbol[];
  userId: string | undefined;
  role: Role | undefined;
  hasOrg: boolean;
  update: UseGlobalSymbolsReturn['update'];
  remove: UseGlobalSymbolsReturn['remove'];
  promote: UseGlobalSymbolsReturn['promote'];
  onInsert: (symbol: GlobalSymbol) => void;
  onDragStart: (symbol: GlobalSymbol, e: React.MouseEvent) => void;
  editor: any;
}

function SymbolScopeGroup({
  scope,
  symbols,
  userId,
  role,
  hasOrg,
  update,
  remove,
  promote,
  onInsert,
  onDragStart,
  editor,
}: SymbolScopeGroupProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="symbols-scope-group">
      <button
        className="symbols-scope-group-title"
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
      >
        <span className="symbols-scope-group-caret">
          {collapsed ? '\u25B8' : '\u25BE'}
        </span>
        <span className="symbols-scope-group-name">
          {SCOPE_LABELS[scope]}
        </span>
        <span className="symbols-scope-group-count">{symbols.length}</span>
      </button>
      {!collapsed && (
        <div className="symbols-scope-group-items">
          {symbols.map((symbol) => (
            <SymbolListItem
              key={symbol.id}
              symbol={symbol}
              userId={userId}
              role={role}
              hasOrg={hasOrg}
              update={update}
              remove={remove}
              promote={promote}
              onInsert={onInsert}
              onDragStart={onDragStart}
              editor={editor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SymbolListItem
// ============================================================================

type ItemAction = 'none' | 'menu' | 'rename' | 'delete' | 'promote' | 'saveToLibrary';

const SCOPE_BADGE_LETTER: Record<SymbolScope, string> = {
  prototype: 'P',
  team: 'T',
  organization: 'O',
};

interface SymbolListItemProps {
  symbol: GlobalSymbol;
  userId: string | undefined;
  role: Role | undefined;
  hasOrg: boolean;
  update: UseGlobalSymbolsReturn['update'];
  remove: UseGlobalSymbolsReturn['remove'];
  promote: UseGlobalSymbolsReturn['promote'];
  onInsert: (symbol: GlobalSymbol) => void;
  onDragStart: (symbol: GlobalSymbol, e: React.MouseEvent) => void;
  editor: any;
}

function SymbolListItem({ symbol, userId, role, hasOrg, update, remove, promote, onInsert, onDragStart, editor }: SymbolListItemProps) {
  const navigate = useNavigate();
  const [action, setAction] = useState<ItemAction>('none');
  const [renameName, setRenameName] = useState(symbol.name);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const isRenamingRef = useRef(false);

  const editable = canEdit(symbol, userId, role);

  // Auto-clear action errors after 5s
  const showError = useCallback((msg: string) => {
    setActionError(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setActionError(null), 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (action === 'rename') {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [action]);

  const handleRename = useCallback(async () => {
    // Guard against double-fire (Enter triggers blur which also calls handleRename)
    if (isRenamingRef.current) return;

    const trimmed = renameName.trim();
    if (!trimmed || trimmed === symbol.name) {
      setAction('none');
      return;
    }

    isRenamingRef.current = true;
    setIsActing(true);
    const result = await update(symbol.id, { name: trimmed });
    setIsActing(false);
    isRenamingRef.current = false;
    if (result) {
      setAction('none');
    } else {
      showError('Failed to rename symbol');
    }
  }, [renameName, symbol.id, symbol.name, update, showError]);

  const handleDelete = useCallback(async () => {
    setIsActing(true);
    const success = await remove(symbol.id);
    setIsActing(false);
    if (!success) {
      showError('Failed to delete symbol');
      setAction('none');
    }
  }, [symbol.id, remove, showError]);

  const handlePromote = useCallback(
    async (targetScope: 'team' | 'organization') => {
      setIsActing(true);
      const result = await promote(symbol.id, targetScope);
      setIsActing(false);
      if (result) {
        setAction('none');
      } else {
        showError('Failed to promote symbol');
      }
    },
    [symbol.id, promote, showError],
  );

  const handleSaveToLibrary = useCallback(async () => {
    if (!editor) {
      showError('Editor not available');
      return;
    }

    // Find the main symbol in GrapesJS matching this API symbol
    const scopedId = symbol.symbolData?.id;
    const main = scopedId ? findMainByGrapesId(editor, scopedId) : null;

    if (!main) {
      showError('Insert this symbol first to edit it');
      return;
    }

    const serialized = serializeMainSymbol(main);
    if (!serialized) {
      showError('Failed to read symbol data');
      return;
    }

    setIsActing(true);
    const newSymbolData = {
      ...serialized,
      id: scopedId || symbol.id,
      label: symbol.name,
    };

    const result = await update(symbol.id, { symbolData: newSymbolData as any });
    setIsActing(false);
    if (result) {
      setAction('none');
    } else {
      showError('Failed to save symbol to library');
    }
  }, [editor, symbol.id, symbol.symbolData, symbol.name, update, showError]);

  const formattedDate = useMemo(() => {
    try {
      return new Date(symbol.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }, [symbol.createdAt]);

  const isExpanded = action !== 'none';

  return (
    <>
      <div className="symbols-item" onMouseDown={(e) => onDragStart(symbol, e)}>
        {/* Scope badge */}
        <span
          className={`symbols-scope-badge symbols-scope-badge--${symbol.scope}`}
          title={SCOPE_LABELS[symbol.scope]}
          aria-hidden="true"
        >
          {SCOPE_BADGE_LETTER[symbol.scope]}
        </span>

        {/* Name & date */}
        <div className="symbols-item-info">
          <span className="symbols-item-name" title={symbol.name}>
            {symbol.name}
          </span>
          {formattedDate && (
            <span className="symbols-item-date">{formattedDate}</span>
          )}
        </div>

        {/* Insert button */}
        <button
          className="symbols-item-insert-btn"
          onClick={() => onInsert(symbol)}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label={`Insert ${symbol.name}`}
          title="Insert onto canvas"
        >
          +
        </button>

        {/* Overflow menu button */}
        {editable && (
          <div className="symbols-item-actions">
            <button
              className="symbols-item-menu-btn"
              onClick={() =>
                setAction((prev) => (prev === 'menu' ? 'none' : 'menu'))
              }
              onMouseDown={(e) => e.stopPropagation()}
              aria-label={`Actions for ${symbol.name}`}
              aria-expanded={isExpanded}
              aria-haspopup="true"
              title="Actions"
            >
              &#x22EF;
            </button>
          </div>
        )}
      </div>

      {/* Inline action rows */}
      {action === 'menu' && (
        <div className="symbols-item-action-row" role="group" aria-label="Symbol actions">
          <button
            className="symbols-item-action-btn"
            onClick={() => navigate(`/symbols/${symbol.id}/edit`)}
            aria-label={`Edit ${symbol.name}`}
          >
            Edit
          </button>
          <button
            className="symbols-item-action-btn"
            onClick={() => {
              setRenameName(symbol.name);
              setAction('rename');
            }}
          >
            Rename
          </button>
          <button
            className="symbols-item-action-btn"
            onClick={() => setAction('saveToLibrary')}
          >
            Save to Library
          </button>
          <button
            className="symbols-item-action-btn symbols-item-action-btn--danger"
            onClick={() => setAction('delete')}
          >
            Delete
          </button>
          {(canPromoteToTeam(symbol) || canPromoteToOrg(symbol, role, hasOrg)) && (
            <button
              className="symbols-item-action-btn"
              onClick={() => setAction('promote')}
            >
              Promote
            </button>
          )}
        </div>
      )}

      {action === 'rename' && (
        <input
          ref={renameInputRef}
          className="symbols-rename-input"
          value={renameName}
          onChange={(e) => setRenameName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename();
            if (e.key === 'Escape') setAction('none');
          }}
          onBlur={handleRename}
          disabled={isActing}
          aria-label="Rename symbol"
        />
      )}

      {action === 'delete' && (
        <div className="symbols-confirm-delete" role="alert">
          <span className="symbols-confirm-delete-label">Delete?</span>
          <button
            className="symbols-item-action-btn"
            onClick={() => setAction('none')}
            disabled={isActing}
          >
            Cancel
          </button>
          <button
            className="symbols-item-action-btn symbols-item-action-btn--danger"
            onClick={handleDelete}
            disabled={isActing}
          >
            Delete
          </button>
        </div>
      )}

      {action === 'saveToLibrary' && (
        <div className="symbols-confirm-update" role="alert">
          <span className="symbols-confirm-update-label">Save current symbol state to the library? Other prototypes will get this version on next load.</span>
          <button
            className="symbols-item-action-btn"
            onClick={() => setAction('none')}
            disabled={isActing}
          >
            Cancel
          </button>
          <button
            className="symbols-item-action-btn symbols-item-action-btn--primary"
            onClick={handleSaveToLibrary}
            disabled={isActing}
          >
            Save
          </button>
        </div>
      )}

      {action === 'promote' && (
        <div className="symbols-promote-options" role="group" aria-label="Promote options">
          {canPromoteToTeam(symbol) && (
            <button
              className="symbols-item-action-btn"
              onClick={() => handlePromote('team')}
              disabled={isActing}
            >
              To Team
            </button>
          )}
          {canPromoteToOrg(symbol, role, hasOrg) && (
            <button
              className="symbols-item-action-btn"
              onClick={() => handlePromote('organization')}
              disabled={isActing}
            >
              To Org
            </button>
          )}
          <button
            className="symbols-item-action-btn"
            onClick={() => setAction('none')}
            disabled={isActing}
          >
            Cancel
          </button>
        </div>
      )}

      {actionError && (
        <div className="symbols-action-error" role="alert">{actionError}</div>
      )}
    </>
  );
}
