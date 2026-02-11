/**
 * PagesPanel Component
 *
 * React-based pages panel that replaces the DOM-based pages-manager.ts plugin.
 * Uses PagesProvider from @grapesjs/react for page operations (add/select/rename/delete).
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { PagesProvider } from '@grapesjs/react';

export function PagesPanel() {
  return (
    <PagesProvider>
      {({ pages, selected, select, add, remove }) => (
        <PagesPanelInner
          pages={pages}
          selected={selected}
          select={select}
          add={add}
          remove={remove}
        />
      )}
    </PagesProvider>
  );
}

interface PagesPanelInnerProps {
  pages: any[];
  selected: any;
  select: (page: any) => any;
  add: (props: any) => any;
  remove: (page: any) => any;
}

function PagesPanelInner({ pages, selected, select, add, remove }: PagesPanelInnerProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renamingId]);

  const handleAdd = useCallback(() => {
    const count = pages.length + 1;
    add({
      id: `page-${Date.now()}`,
      name: `Page ${count}`,
    });
  }, [pages.length, add]);

  const handleDelete = useCallback((e: React.MouseEvent, page: any) => {
    e.stopPropagation();
    const pageName = page.getName?.() || page.get?.('name') || 'this page';
    if (confirm(`Delete "${pageName}"?`)) {
      remove(page);
    }
  }, [remove]);

  const startRename = useCallback((e: React.MouseEvent, page: any) => {
    e.stopPropagation();
    const pageId = page.getId?.() || page.id;
    const currentName = page.getName?.() || page.get?.('name') || '';
    setRenamingId(pageId);
    setRenameValue(currentName);
  }, []);

  const finishRename = useCallback((page: any) => {
    const trimmed = renameValue.trim();
    if (trimmed && page.set) {
      page.set('name', trimmed);
    }
    setRenamingId(null);
    setRenameValue('');
  }, [renameValue]);

  const cancelRename = useCallback(() => {
    setRenamingId(null);
    setRenameValue('');
  }, []);

  return (
    <div className="pages-panel">
      <div className="pages-panel-header">
        <span className="pages-panel-title">Pages</span>
        <button
          className="pages-panel-add-btn"
          onClick={handleAdd}
          title="Add new page"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          Add
        </button>
      </div>

      <div className="pages-panel-list" role="listbox" aria-label="Pages">
        {pages.map((page: any) => {
          const pageId = page.getId?.() || page.id;
          const pageName = page.getName?.() || page.get?.('name') || pageId;
          const isSelected = page === selected;
          const isRenaming = renamingId === pageId;

          return (
            <div
              key={pageId}
              className={`pages-panel-item ${isSelected ? 'pages-panel-item--selected' : ''}`}
              role="option"
              aria-selected={isSelected}
              onClick={() => select(page)}
            >
              {isRenaming ? (
                <input
                  ref={inputRef}
                  className="pages-panel-rename-input"
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => finishRename(page)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      finishRename(page);
                    } else if (e.key === 'Escape') {
                      cancelRename();
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span
                    className="pages-panel-item-name"
                    title="Double-click to rename"
                    onDoubleClick={(e) => startRename(e, page)}
                  >
                    {pageName}
                  </span>
                  {pages.length > 1 && (
                    <button
                      className="pages-panel-delete-btn"
                      title="Delete page"
                      onClick={(e) => handleDelete(e, page)}
                    >
                      &times;
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
