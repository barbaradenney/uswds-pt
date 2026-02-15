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
import type { GlobalSymbol, SymbolScope, Role } from '@uswds-pt/shared';
import type { UseGlobalSymbolsReturn } from '../../hooks/useGlobalSymbols';
import { useEditorMaybe } from '@grapesjs/react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useOrganizationContext } from '../../contexts/OrganizationContext';
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

    const components = symbol.symbolData?.components;
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

    const components = symbol.symbolData?.components;
    if (!components || components.length === 0) return;

    const um = (editor as any).UndoManager;
    um?.start?.();

    try {
      const selected = (editor as any).getSelected?.();
      const wrapper = (editor as any).DomComponents?.getWrapper();

      if (selected) {
        const parent = selected.parent?.();
        if (parent) {
          const children = parent.components();
          const models = children.models || [];
          let index = models.length;
          for (let i = 0; i < models.length; i++) {
            if (models[i] === selected) {
              index = i + 1;
              break;
            }
          }
          children.add(components, { at: index });
        } else {
          // Selected is the wrapper itself — append inside it
          wrapper?.append?.(components);
        }
      } else {
        // Nothing selected — append into <main> content area, or wrapper as fallback
        const mainComps = wrapper?.find?.('main') || [];
        const target = mainComps[0] || wrapper;
        target?.append?.(components);
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

type ItemAction = 'none' | 'menu' | 'rename' | 'delete' | 'promote' | 'update';

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

  const handleUpdate = useCallback(async () => {
    if (!editor) {
      showError('Editor not available');
      return;
    }

    const selected = editor.getSelected?.();
    if (!selected) {
      showError('Select a component on the canvas first');
      return;
    }

    setIsActing(true);
    const json = selected.toJSON?.() || {};
    const newSymbolData = {
      id: symbol.symbolData.id || symbol.id,
      label: symbol.symbolData.label || symbol.name,
      icon: json.icon,
      components: [json],
    };

    const result = await update(symbol.id, { symbolData: newSymbolData });
    setIsActing(false);
    if (result) {
      setAction('none');
    } else {
      showError('Failed to update symbol');
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
            onClick={() => {
              setRenameName(symbol.name);
              setAction('rename');
            }}
          >
            Rename
          </button>
          <button
            className="symbols-item-action-btn"
            onClick={() => setAction('update')}
          >
            Update
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

      {action === 'update' && (
        <div className="symbols-confirm-update" role="alert">
          <span className="symbols-confirm-update-label">Replace symbol content with selected component?</span>
          <button
            className="symbols-item-action-btn"
            onClick={() => setAction('none')}
            disabled={isActing}
          >
            Cancel
          </button>
          <button
            className="symbols-item-action-btn symbols-item-action-btn--primary"
            onClick={handleUpdate}
            disabled={isActing}
          >
            Update
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
