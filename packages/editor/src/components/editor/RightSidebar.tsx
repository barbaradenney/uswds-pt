/**
 * RightSidebar Component
 *
 * Tabbed sidebar with Components (blocks), Properties (traits),
 * and Symbols panels.
 * - Components tab: Custom block grid using BlocksProvider data
 * - Properties tab: Custom trait forms using TraitsProvider data
 * - Symbols tab: Browse, rename, delete, promote reusable symbols (API mode only)
 *
 * Auto-switches to Properties tab when a component is selected,
 * unless the Symbols tab is currently active.
 *
 * Note: Provider components set `custom: true` on their GrapesJS managers,
 * which prevents default UI rendering. We render our own React UI using the
 * data they provide (blocks, dragStart/dragStop, traits) instead of using
 * the Container portal (which renders into a detached element).
 */

import { useState, useEffect, useMemo, useRef, memo, lazy, Suspense } from 'react';
import { BlocksProvider, TraitsProvider, useEditorMaybe } from '@grapesjs/react';
import { GJS_EVENTS } from '../../lib/contracts';
import { DOMPurify } from '../../lib/sanitize';
import { SidebarTabs } from './SidebarTabs';
import { isDemoMode } from '../../lib/api';

/**
 * Module-level cache for DOMPurify.sanitize results on block media (SVG icons).
 * Block icons are static strings that never change at runtime, so caching them
 * avoids repeated sanitisation on every render, category collapse/expand, and
 * BlockCategory re-mount.
 */
const sanitizedMediaCache = new Map<string, string>();

function cachedSanitize(html: string): string {
  const cached = sanitizedMediaCache.get(html);
  if (cached !== undefined) return cached;
  const clean = DOMPurify.sanitize(html);
  sanitizedMediaCache.set(html, clean);
  return clean;
}

// Lazy-load the Symbols panel (only used in API mode, not demo mode)
const LazySymbolsPanel = lazy(() =>
  import('./SymbolsPanel').then((mod) => ({ default: mod.SymbolsPanel }))
);

const BASE_TABS = [
  { id: 'components', label: 'Components' },
  { id: 'properties', label: 'Properties' },
];

function buildTabs() {
  const tabs = [...BASE_TABS];
  if (!isDemoMode) {
    tabs.push({ id: 'symbols', label: 'Symbols' });
  }
  return tabs;
}

const TABS = buildTabs();

export const RightSidebar = memo(function RightSidebar() {
  const [activeTab, setActiveTab] = useState('components');
  const editor = useEditorMaybe();

  // Auto-switch to Properties tab when a component is selected,
  // but don't switch away from the AI or Symbols tabs
  useEffect(() => {
    if (!editor) return;
    const handleSelect = () => {
      setActiveTab((current) =>
        current === 'symbols' ? current : 'properties'
      );
    };
    editor.on(GJS_EVENTS.COMPONENT_SELECTED, handleSelect);
    return () => {
      editor.off(GJS_EVENTS.COMPONENT_SELECTED, handleSelect);
    };
  }, [editor]);

  return (
    <div className="editor-sidebar editor-sidebar--right">
      <SidebarTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="sidebar-panel-content">
        {activeTab === 'components' && (
          <div
            id="sidebar-panel-components"
            role="tabpanel"
            aria-labelledby="sidebar-tab-components"
          >
            <BlocksProvider>
              {(props) => <BlocksPanel {...props} />}
            </BlocksProvider>
          </div>
        )}
        {activeTab === 'properties' && (
          <div
            id="sidebar-panel-properties"
            role="tabpanel"
            aria-labelledby="sidebar-tab-properties"
          >
            <TraitsProvider>
              {(props) => <TraitsPanel traits={props.traits} />}
            </TraitsProvider>
          </div>
        )}
        {activeTab === 'symbols' && !isDemoMode && (
          <div
            id="sidebar-panel-symbols"
            role="tabpanel"
            aria-labelledby="sidebar-tab-symbols"
          >
            <Suspense fallback={<div className="symbols-loading"><div className="loading-spinner" /><span>Loading symbols...</span></div>}>
              <LazySymbolsPanel />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
});

/* ============================================
   Blocks Panel
   ============================================ */

function BlocksPanel({
  mapCategoryBlocks,
  dragStart,
  dragStop,
}: {
  blocks: any[];
  mapCategoryBlocks: Map<string, any[]>;
  dragStart: (block: any, e: Event) => void;
  dragStop: (block: any, e?: Event) => void;
  Container: any;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCategories = useMemo(() => {
    if (!mapCategoryBlocks) return [];
    const result: [string, any[]][] = [];
    for (const [category, catBlocks] of mapCategoryBlocks) {
      const filtered = searchTerm
        ? catBlocks.filter((b: any) =>
            b.getLabel().toLowerCase().includes(searchTerm.toLowerCase())
          )
        : catBlocks;
      if (filtered.length > 0) {
        result.push([category, filtered]);
      }
    }
    return result;
  }, [mapCategoryBlocks, searchTerm]);

  return (
    <>
      <div className="block-search">
        <input
          type="text"
          placeholder="Search components..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block-search-input"
        />
        {searchTerm && (
          <button
            className="block-search-clear"
            onClick={() => setSearchTerm('')}
            aria-label="Clear search"
          >
            &times;
          </button>
        )}
      </div>
      <div className="blocks-container">
        {filteredCategories.length === 0 && searchTerm && (
          <div className="blocks-empty">No components match &ldquo;{searchTerm}&rdquo;</div>
        )}
        {filteredCategories.map(([category, catBlocks]) => (
          <BlockCategory
            key={category}
            category={category}
            blocks={catBlocks}
            dragStart={dragStart}
            dragStop={dragStop}
          />
        ))}
      </div>
    </>
  );
}

function BlockCategory({
  category,
  blocks,
  dragStart,
}: {
  category: string;
  blocks: any[];
  dragStart: (block: any, e: Event) => void;
  dragStop: (block: any, e?: Event) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  // Build a per-render lookup from block ID → sanitized media HTML.
  // The actual sanitisation is backed by the module-level cachedSanitize() so
  // identical SVG strings are only processed once across all categories.
  const sanitizedMedia = useMemo(
    () => new Map(blocks.map((b) => [b.getId(), cachedSanitize(b.getMedia())])),
    [blocks],
  );

  return (
    <div className="block-category">
      <button
        className="block-category-title"
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
      >
        <span className="block-category-caret">{collapsed ? '\u25B8' : '\u25BE'}</span>
        <span className="block-category-name">{category || 'Uncategorized'}</span>
        <span className="block-category-count">{blocks.length}</span>
      </button>
      {!collapsed && (
        <div className="block-category-items">
          {blocks.map((block: any) => (
            <div
              key={block.getId()}
              className="custom-block-item"
              title={block.getLabel()}
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                dragStart(block, e.nativeEvent);
              }}
            >
              <div
                className="custom-block-media"
                dangerouslySetInnerHTML={{ __html: sanitizedMedia.get(block.getId()) ?? '' }}
              />
              <div className="custom-block-label">{block.getLabel()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================
   Traits Panel
   ============================================ */

function TraitsPanel({ traits }: { traits: any[] }) {
  if (!traits || traits.length === 0) {
    return (
      <div className="traits-empty">
        Select a component to edit its properties.
      </div>
    );
  }

  return (
    <div className="traits-list">
      {traits.map((trait: any) => (
        <TraitField key={trait.getId()} trait={trait} />
      ))}
    </div>
  );
}

function CheckboxGroupField({ trait }: { trait: any }) {
  const options: Array<{ id: string; label: string }> = trait.get?.('options') || [];
  const label = trait.getLabel() || trait.getName();
  const component = trait.target;
  const dataAttr = trait.get?.('dataAttribute') || 'data-states';

  // Use a tick counter to force re-render after attribute changes.
  // No separate checkedIds state — always derive from the component attribute
  // to avoid any React state ↔ GrapesJS attribute desynchronization.
  const [, setTick] = useState(0);

  // Read checked IDs directly from component attribute on every render
  const dataValue = component?.getAttributes?.()[dataAttr] || '';
  const checkedIds = dataValue ? dataValue.split(',').map((s: string) => s.trim()) : [];

  // No attribute = "visible in all" = all options checked
  const effectiveChecked = dataValue === ''
    ? options.map((o) => o.id)
    : checkedIds;

  const handleToggle = (optId: string, checked: boolean) => {
    if (!component) return;

    // Start from effective state (all if no attribute, otherwise current IDs)
    const current = dataValue === ''
      ? options.map((o) => o.id)
      : checkedIds;
    const next = checked
      ? [...current, optId]
      : current.filter((id: string) => id !== optId);

    const isAllOrNone = next.length === 0 || next.length === options.length;
    if (isAllOrNone) {
      component.removeAttributes([dataAttr]);
    } else {
      component.addAttributes({ [dataAttr]: next.join(',') });
    }

    // Force re-render so checkbox UI reflects the new attribute value
    setTick(t => t + 1);
  };

  if (options.length === 0) return null;

  return (
    <div className="trait-field">
      <label className="trait-label">{label}</label>
      <div className="trait-checkbox-group">
        {options.map((opt) => (
          <label key={opt.id} className="trait-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', padding: '2px 0', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={effectiveChecked.includes(opt.id)}
              onChange={(e) => handleToggle(opt.id, e.target.checked)}
              style={{ width: '14px', height: '14px', accentColor: 'var(--color-primary)' }}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

const TraitField = memo(function TraitField({ trait }: { trait: any }) {
  const type = trait.getType();
  const label = trait.getLabel() || trait.getName();
  const [localValue, setLocalValue] = useState(trait.getValue());
  const isFocusedRef = useRef(false);

  // Sync local state when trait object changes (different component selected).
  // Skip sync when an input is focused — React re-rendering a controlled <select>
  // writes to the DOM, which causes browsers to close the native dropdown.
  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(trait.getValue());
    }
  }, [trait]);

  const handleChange = (newValue: any) => {
    setLocalValue(newValue);
    // Use the public GrapesJS API (setValue) which calls setTargetValue →
    // syncs to component attributes → fires trait:value event.
    // The low-level Backbone setter (set('value',...)) doesn't trigger the
    // full pipeline when using custom trait UI (TraitsProvider custom:true).
    if (trait.setValue) {
      trait.setValue(newValue);
    } else {
      trait.set('value', newValue);
    }
  };

  const handleFocus = () => { isFocusedRef.current = true; };
  const handleBlur = () => {
    isFocusedRef.current = false;
    // Sync value on blur in case it changed externally while focused
    setLocalValue(trait.getValue());
  };

  if (type === 'checkbox-group') {
    return <CheckboxGroupField trait={trait} />;
  }

  if (type === 'checkbox') {
    return (
      <div className="trait-field trait-field--checkbox">
        <label className="trait-checkbox-label">
          <input
            type="checkbox"
            checked={!!localValue}
            onChange={(e) => handleChange(e.target.checked)}
          />
          <span>{label}</span>
        </label>
      </div>
    );
  }

  if (type === 'select') {
    const options = trait.getOptions?.() || trait.get?.('options') || [];
    return (
      <div className="trait-field">
        <label className="trait-label">{label}</label>
        <select
          className="trait-input trait-select"
          value={localValue ?? ''}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          {options.map((opt: any) => {
            const optValue = opt.id ?? opt.value ?? '';
            const optLabel = opt.name || opt.label || opt.value || opt.id || '';
            return (
              <option key={optValue} value={optValue}>
                {optLabel}
              </option>
            );
          })}
        </select>
      </div>
    );
  }

  if (type === 'number') {
    const min = trait.get?.('min');
    const max = trait.get?.('max');
    const step = trait.get?.('step');
    return (
      <div className="trait-field">
        <label className="trait-label">{label}</label>
        <input
          type="number"
          className="trait-input"
          value={localValue ?? ''}
          min={min}
          max={max}
          step={step}
          onChange={(e) =>
            handleChange(e.target.value ? Number(e.target.value) : '')
          }
        />
      </div>
    );
  }

  if (type === 'color') {
    return (
      <div className="trait-field">
        <label className="trait-label">{label}</label>
        <div className="trait-color-wrapper">
          <input
            type="color"
            className="trait-color-input"
            value={localValue || '#000000'}
            onChange={(e) => handleChange(e.target.value)}
          />
          <input
            type="text"
            className="trait-input trait-color-text"
            value={localValue || ''}
            onChange={(e) => handleChange(e.target.value)}
          />
        </div>
      </div>
    );
  }

  // Default: text input
  return (
    <div className="trait-field">
      <label className="trait-label">{label}</label>
      <input
        type="text"
        className="trait-input"
        value={localValue ?? ''}
        placeholder={trait.get?.('placeholder') || ''}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  );
});
