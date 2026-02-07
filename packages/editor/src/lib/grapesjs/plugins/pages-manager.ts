/**
 * GrapesJS Pages Manager Plugin
 *
 * Adds a "Pages" button to the views panel (right sidebar) that opens
 * a panel for adding, selecting, renaming, and deleting pages.
 */

import { createDebugLogger } from '@uswds-pt/shared';
import type { EditorInstance } from '../../../types/grapesjs';

const debug = createDebugLogger('PagesManager');
const COMMAND_ID = 'open-pages';
const PANEL_ID = 'pages-manager';
const PFX = 'gjs-';

export function pagesManagerPlugin(editor: EditorInstance): void {
  // Create the pages panel container
  const panelEl = document.createElement('div');
  panelEl.className = `${PFX}pages`;

  // Register the command immediately (safe during plugin init)
  editor.Commands.add(COMMAND_ID, {
    run() {
      const container = document.querySelector(`.${PFX}pn-views-container`) as HTMLElement;
      if (container) {
        renderPages();
        container.appendChild(panelEl);
      }
    },
    stop() {
      panelEl.remove();
    },
  });

  // Defer panel button addition until editor is fully loaded
  editor.on('load', () => {
    try {
      editor.Panels.addButton('views', {
        id: PANEL_ID,
        className: 'fa fa-file-o',
        command: COMMAND_ID,
        togglable: true,
        attributes: { title: 'Pages' },
        label: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
          <path d="M9 13h6v2H9zm0-3h6v2H9z"/>
        </svg>`,
      });
      debug('Pages manager button added to views panel');
    } catch (e) {
      debug('Failed to add pages manager button:', e);
    }
  });

  // Re-render when pages change (if panel is visible)
  editor.on('page:add page:remove page:select', () => {
    if (panelEl.parentElement) {
      renderPages();
    }
  });

  function renderPages(): void {
    const pages = editor.Pages.getAll();
    const selected = editor.Pages.getSelected();

    panelEl.innerHTML = '';

    // Header with Add button
    const header = document.createElement('div');
    header.className = `${PFX}pages-header`;
    header.innerHTML = `
      <span class="${PFX}pages-title">Pages</span>
      <button class="${PFX}pages-add-btn" title="Add new page">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        Add
      </button>
    `;
    panelEl.appendChild(header);

    // Page list
    const list = document.createElement('div');
    list.className = `${PFX}pages-list`;

    pages.forEach((page: any) => {
      const pageId = page.getId();
      const pageName = page.getName?.() || page.get?.('name') || pageId;
      const isSelected = page === selected;

      const item = document.createElement('div');
      item.className = `${PFX}pages-item${isSelected ? ` ${PFX}pages-item--selected` : ''}`;
      item.dataset.pageId = pageId;

      const nameSpan = document.createElement('span');
      nameSpan.className = `${PFX}pages-item-name`;
      nameSpan.textContent = pageName;
      nameSpan.title = 'Double-click to rename';
      item.appendChild(nameSpan);

      // Delete button (only if more than 1 page)
      if (pages.length > 1) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = `${PFX}pages-delete-btn`;
        deleteBtn.title = 'Delete page';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Delete "${pageName}"?`)) {
            editor.Pages.remove(pageId);
          }
        });
        item.appendChild(deleteBtn);
      }

      // Click to select
      item.addEventListener('click', () => {
        editor.Pages.select(pageId);
      });

      // Double-click to rename
      nameSpan.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        startRename(nameSpan, page);
      });

      list.appendChild(item);
    });

    panelEl.appendChild(list);

    // Add page handler
    header.querySelector(`.${PFX}pages-add-btn`)?.addEventListener('click', () => {
      const count = pages.length + 1;
      editor.Pages.add({
        id: `page-${Date.now()}`,
        name: `Page ${count}`,
      });
    });
  }

  function startRename(nameSpan: HTMLElement, page: any): void {
    const currentName = nameSpan.textContent || '';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = `${PFX}pages-rename-input`;
    input.value = currentName;

    const finishRename = () => {
      const newName = input.value.trim() || currentName;
      if (page.set) {
        page.set('name', newName);
      }
      renderPages();
    };

    input.addEventListener('blur', finishRename);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      } else if (e.key === 'Escape') {
        input.value = currentName;
        input.blur();
      }
    });

    nameSpan.textContent = '';
    nameSpan.appendChild(input);
    input.focus();
    input.select();
  }
}
