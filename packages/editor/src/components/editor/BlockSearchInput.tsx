/**
 * BlockSearchInput Component
 *
 * Search input that filters blocks by toggling display:none on .gjs-block
 * elements inside the BlocksProvider Container portal. Same DOM-filtering
 * approach as the old block-search.ts plugin, now as a React component.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export function BlockSearchInput() {
  const [query, setQuery] = useState('');
  const [noResults, setNoResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filterBlocks = useCallback((searchQuery: string) => {
    const container = containerRef.current?.parentElement;
    if (!container) return;

    const normalizedQuery = searchQuery.toLowerCase().trim();
    const blockElements = Array.from(
      container.querySelectorAll('.gjs-block')
    ) as HTMLElement[];

    let visibleCount = 0;
    blockElements.forEach((el) => {
      const title = (el.getAttribute('title') || el.textContent || '').toLowerCase();
      const visible = !normalizedQuery || title.includes(normalizedQuery);
      el.style.display = visible ? '' : 'none';
      if (visible) visibleCount++;
    });

    // Also show/hide category headers that have no visible blocks
    const categories = Array.from(
      container.querySelectorAll('.gjs-block-category')
    ) as HTMLElement[];
    categories.forEach((cat) => {
      const blocks = Array.from(cat.querySelectorAll('.gjs-block')) as HTMLElement[];
      const hasVisible = blocks.some((b) => b.style.display !== 'none');
      cat.style.display = hasVisible || !normalizedQuery ? '' : 'none';
    });

    setNoResults(normalizedQuery.length > 0 && visibleCount === 0);
  }, []);

  // Re-filter when query changes
  useEffect(() => {
    filterBlocks(query);
  }, [query, filterBlocks]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setQuery('');
      (e.target as HTMLElement).blur();
    }
  }, []);

  return (
    <div ref={containerRef} className="block-search">
      <input
        type="text"
        className="block-search-input"
        placeholder="Search components..."
        aria-label="Search components"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {noResults && (
        <div className="block-search-no-results">
          No matching components
        </div>
      )}
    </div>
  );
}
