/**
 * GrapesJS Block Search Plugin
 *
 * Adds a text input above the blocks panel to filter blocks by label.
 * Supports case-insensitive matching and clearing with Escape key.
 */

import type { EditorInstance } from '../../../types/grapesjs';

const PFX = 'gjs-';

export function blockSearchPlugin(editor: EditorInstance): void {
  // Defer until editor is fully loaded
  editor.on('load', () => {
    const blocksContainer = document.querySelector(`.${PFX}blocks-cs`) as HTMLElement;
    if (!blocksContainer) return;

    // Create search input
    const wrapper = document.createElement('div');
    wrapper.className = `${PFX}block-search`;
    wrapper.style.cssText = 'padding: 6px 8px; border-bottom: 1px solid rgba(0,0,0,0.15);';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Search components...';
    input.className = `${PFX}block-search__input`;
    input.style.cssText = `
      width: 100%;
      padding: 6px 8px;
      border: 1px solid rgba(0,0,0,0.2);
      border-radius: 3px;
      font-size: 12px;
      background: rgba(255,255,255,0.08);
      color: inherit;
      outline: none;
      box-sizing: border-box;
    `.replace(/\n\s*/g, '');

    wrapper.appendChild(input);

    // Insert before the blocks content
    blocksContainer.parentElement?.insertBefore(wrapper, blocksContainer);

    // Filter function
    const filterBlocks = (query: string) => {
      const normalizedQuery = query.toLowerCase().trim();
      const blocks = editor.Blocks.getAll();

      blocks.forEach((block: any) => {
        const label = (block.get('label') || '').toLowerCase();
        const id = (block.get('id') || '').toLowerCase();
        const category = (block.get('category')?.id || block.get('category') || '').toLowerCase();
        const matches = !normalizedQuery ||
          label.includes(normalizedQuery) ||
          id.includes(normalizedQuery) ||
          category.includes(normalizedQuery);

        // Toggle visibility via the block element in DOM
        const blockEl = blocksContainer.querySelector(`[data-gjs-type="${block.get('id')}"], .${PFX}block[title*="${block.get('label')}"]`) as HTMLElement;
        if (blockEl) {
          blockEl.style.display = matches ? '' : 'none';
        }
      });

      // Also filter by direct DOM query as fallback — GrapesJS block elements have title attributes
      const blockElements = blocksContainer.querySelectorAll(`.${PFX}block`);
      blockElements.forEach((el: Element) => {
        const htmlEl = el as HTMLElement;
        const title = (htmlEl.getAttribute('title') || htmlEl.textContent || '').toLowerCase();
        if (!normalizedQuery) {
          htmlEl.style.display = '';
        } else if (!title.includes(normalizedQuery)) {
          htmlEl.style.display = 'none';
        } else {
          htmlEl.style.display = '';
        }
      });
    };

    // Event listeners
    input.addEventListener('input', () => {
      filterBlocks(input.value);
    });

    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        input.value = '';
        filterBlocks('');
        input.blur();
      }
    });
  });
}
