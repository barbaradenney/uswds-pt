/**
 * RightSidebar Component
 *
 * Tabbed sidebar with Components (blocks) and Properties (traits) panels.
 * - Components tab: Custom block grid using BlocksProvider data
 * - Properties tab: Custom trait forms using TraitsProvider data
 *
 * Auto-switches to Properties tab when a component is selected.
 *
 * Note: Provider components set `custom: true` on their GrapesJS managers,
 * which prevents default UI rendering. We render our own React UI using the
 * data they provide (blocks, dragStart/dragStop, traits) instead of using
 * the Container portal (which renders into a detached element).
 */

import { useState, useEffect, useMemo } from 'react';
import { BlocksProvider, TraitsProvider, useEditorMaybe } from '@grapesjs/react';
import { SidebarTabs } from './SidebarTabs';

const TABS = [
  { id: 'components', label: 'Components' },
  { id: 'properties', label: 'Properties' },
];

export function RightSidebar() {
  const [activeTab, setActiveTab] = useState('components');
  const editor = useEditorMaybe();

  // Auto-switch to Properties tab when a component is selected
  useEffect(() => {
    if (!editor) return;
    const handleSelect = () => setActiveTab('properties');
    editor.on('component:selected', handleSelect);
    return () => {
      editor.off('component:selected', handleSelect);
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
      </div>
    </div>
  );
}

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
                dangerouslySetInnerHTML={{ __html: block.getMedia() }}
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

  // Read initial checked state from component's data-states attribute
  const getCheckedIds = (): string[] => {
    const dataStates = component?.getAttributes?.()?.['data-states'] || '';
    return dataStates ? dataStates.split(',').map((s: string) => s.trim()) : [];
  };

  const [checkedIds, setCheckedIds] = useState<string[]>(getCheckedIds);

  // Sync when trait/component changes
  useEffect(() => {
    setCheckedIds(getCheckedIds());
  }, [trait, component]);

  const isAllOrNone = (ids: string[]) =>
    ids.length === 0 || ids.length === options.length;

  const handleToggle = (optId: string, checked: boolean) => {
    const next = checked
      ? [...checkedIds, optId]
      : checkedIds.filter((id) => id !== optId);
    setCheckedIds(next);

    if (!component) return;
    if (isAllOrNone(next)) {
      component.removeAttributes?.(['data-states']);
    } else {
      component.addAttributes?.({ 'data-states': next.join(',') });
    }
  };

  if (options.length === 0) return null;

  // If no data-states attribute, all are considered checked
  const dataStates = component?.getAttributes?.()?.['data-states'] || '';
  const effectiveChecked = dataStates === ''
    ? options.map((o) => o.id)
    : checkedIds;

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

function TraitField({ trait }: { trait: any }) {
  const type = trait.getType();
  const label = trait.getLabel() || trait.getName();
  const [localValue, setLocalValue] = useState(trait.getValue());

  // Sync local state when trait object changes (different component selected)
  useEffect(() => {
    setLocalValue(trait.getValue());
  }, [trait]);

  const handleChange = (newValue: any) => {
    setLocalValue(newValue);
    trait.set('value', newValue);
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
}
