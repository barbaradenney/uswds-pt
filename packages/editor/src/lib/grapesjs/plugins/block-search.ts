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
    const editorEl = editor.getContainer();
    const blocksContainer = (editorEl || document).querySelector(`.${PFX}blocks-cs`) as HTMLElement;
    if (!blocksContainer) return;

    // Create search input
    const wrapper = document.createElement('div');
    wrapper.className = `${PFX}block-search`;
    wrapper.style.cssText = 'padding: 6px 8px; border-bottom: 1px solid rgba(0,0,0,0.15);';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Search components...';
    input.setAttribute('aria-label', 'Search components');
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

    // No-results message (hidden by default)
    const noResults = document.createElement('div');
    noResults.className = `${PFX}block-search__no-results`;
    noResults.textContent = 'No matching components';
    noResults.style.cssText = 'padding: 12px 8px; color: rgba(255,255,255,0.5); font-size: 12px; text-align: center; display: none;';

    wrapper.appendChild(input);

    // Insert before the blocks content
    blocksContainer.parentElement?.insertBefore(wrapper, blocksContainer);
    blocksContainer.parentElement?.insertBefore(noResults, blocksContainer.nextSibling);

    // Cache block elements (invalidated when blocks change)
    let cachedBlockElements: HTMLElement[] | null = null;
    const getBlockElements = (): HTMLElement[] => {
      if (!cachedBlockElements) {
        cachedBlockElements = Array.from(blocksContainer.querySelectorAll(`.${PFX}block`)) as HTMLElement[];
      }
      return cachedBlockElements;
    };
    editor.on('block', () => { cachedBlockElements = null; });

    // Filter function — single DOM-based pass (no selector injection)
    const filterBlocks = (query: string) => {
      const normalizedQuery = query.toLowerCase().trim();
      const blockElements = getBlockElements();
      let visibleCount = 0;

      blockElements.forEach((htmlEl: HTMLElement) => {
        const title = (htmlEl.getAttribute('title') || htmlEl.textContent || '').toLowerCase();
        const visible = !normalizedQuery || title.includes(normalizedQuery);
        htmlEl.style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
      });

      // Show/hide no-results message
      noResults.style.display = (normalizedQuery && visibleCount === 0) ? '' : 'none';
    };

    // Event listeners
    const handleInput = () => filterBlocks(input.value);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        input.value = '';
        filterBlocks('');
        input.blur();
      }
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('keydown', handleKeyDown);

    // Cleanup on editor destroy
    editor.on('destroy', () => {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('keydown', handleKeyDown);
      wrapper.remove();
      noResults.remove();
    });
  });
}
