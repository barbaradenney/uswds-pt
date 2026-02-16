/**
 * LeftSidebar Component
 *
 * Tabbed sidebar with Pages and Layers panels.
 * - Pages tab: custom React PagesPanel component
 * - Layers tab: custom React layer tree using LayersProvider data
 *
 * Note: LayersProvider sets `custom: true` on the GrapesJS layer manager,
 * which prevents default UI rendering. We render our own React tree using
 * the `root` component data instead of using the Container portal.
 */

import { useState, useEffect, useCallback, useRef, memo, lazy, Suspense } from 'react';
import { LayersProvider, useEditorMaybe } from '@grapesjs/react';
import { GJS_EVENTS } from '../../lib/contracts';
import { getSymbolInfo } from '../../lib/grapesjs/symbol-utils';
import { SidebarTabs } from './SidebarTabs';
import { PagesPanel } from './PagesPanel';
import { AI_ENABLED } from '../../lib/ai/ai-config';

// Lazy-load the AI copilot panel so it is code-split into its own chunk.
const LazyAICopilotPanel = lazy(() =>
  import('./AICopilotPanel').then((mod) => ({ default: mod.AICopilotPanel }))
);

const BASE_TABS = [
  { id: 'pages', label: 'Pages' },
  { id: 'layers', label: 'Layers' },
];

const TABS = AI_ENABLED
  ? [...BASE_TABS, { id: 'ai', label: 'AI' }]
  : BASE_TABS;

const SYMBOL_TABS = [{ id: 'layers', label: 'Layers' }];

export const LeftSidebar = memo(function LeftSidebar({ mode = 'prototype' }: { mode?: 'prototype' | 'symbol' }) {
  const tabs = mode === 'symbol' ? SYMBOL_TABS : TABS;
  const [activeTab, setActiveTab] = useState(mode === 'symbol' ? 'layers' : 'pages');

  return (
    <div className="editor-sidebar editor-sidebar--left">
      <SidebarTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="sidebar-panel-content">
        {activeTab === 'pages' && (
          <div
            id="sidebar-panel-pages"
            role="tabpanel"
            aria-labelledby="sidebar-tab-pages"
          >
            <PagesPanel />
          </div>
        )}
        {activeTab === 'layers' && (
          <div
            id="sidebar-panel-layers"
            role="tabpanel"
            aria-labelledby="sidebar-tab-layers"
          >
            <LayersProvider>
              {(props) => <LayersPanel root={props.root} />}
            </LayersProvider>
          </div>
        )}
        {activeTab === 'ai' && AI_ENABLED && (
          <div
            id="sidebar-panel-ai"
            role="tabpanel"
            aria-labelledby="sidebar-tab-ai"
          >
            <Suspense fallback={<div className="ai-panel-loading">Loading AI assistant...</div>}>
              <LazyAICopilotPanel />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
});

/* ============================================
   Layers Panel
   ============================================ */

function LayersPanel({ root }: { root: any }) {
  const editor = useEditorMaybe();
  const [selected, setSelected] = useState<any>(null);
  const [, forceUpdate] = useState(0);
  const dragRef = useRef<any>(null);

  useEffect(() => {
    if (!editor) return;

    const handleSelect = (component: any) => setSelected(component);
    const handleDeselect = () => setSelected(null);
    const handleUpdate = () => forceUpdate((n) => n + 1);

    editor.on(GJS_EVENTS.COMPONENT_SELECTED, handleSelect);
    editor.on(GJS_EVENTS.COMPONENT_DESELECTED, handleDeselect);
    editor.on(GJS_EVENTS.COMPONENT_ADD, handleUpdate);
    editor.on(GJS_EVENTS.COMPONENT_REMOVE, handleUpdate);

    // Set initial selection
    const current = editor.getSelected();
    if (current) setSelected(current);

    return () => {
      editor.off(GJS_EVENTS.COMPONENT_SELECTED, handleSelect);
      editor.off(GJS_EVENTS.COMPONENT_DESELECTED, handleDeselect);
      editor.off(GJS_EVENTS.COMPONENT_ADD, handleUpdate);
      editor.off(GJS_EVENTS.COMPONENT_REMOVE, handleUpdate);
    };
  }, [editor]);

  const handleSelectComponent = useCallback(
    (component: any) => {
      editor?.select(component);
    },
    [editor]
  );

  if (!root) {
    return <div className="layers-empty">No layers available</div>;
  }

  const children = root.components?.() || [];
  if (children.length === 0) {
    return <div className="layers-empty">No components on this page</div>;
  }

  return (
    <div className="layers-tree">
      {children.map((child: any) => (
        <LayerItem
          key={child.getId()}
          component={child}
          level={0}
          selected={selected}
          onSelect={handleSelectComponent}
          dragRef={dragRef}
          editor={editor}
        />
      ))}
    </div>
  );
}

type DropPosition = 'before' | 'inside' | 'after' | null;

function isDescendantOf(source: any, target: any): boolean {
  let parent = target.parent?.();
  while (parent) {
    if (parent === source) return true;
    parent = parent.parent?.();
  }
  return false;
}

const LayerItem = memo(function LayerItem({
  component,
  level,
  selected,
  onSelect,
  dragRef,
  editor,
}: {
  component: any;
  level: number;
  selected: any;
  onSelect: (comp: any) => void;
  dragRef: React.MutableRefObject<any>;
  editor: any;
}) {
  const [expanded, setExpanded] = useState(level < 2);
  const [dropPosition, setDropPosition] = useState<DropPosition>(null);
  const [isDragging, setIsDragging] = useState(false);
  const children = component.components?.() || [];
  const hasChildren = children.length > 0;
  const isSelected = selected === component;
  const name =
    component.getName?.() || component.get?.('tagName') || 'Component';

  // Symbol detection for visual indicators
  const symbolInfo = editor ? getSymbolInfo(editor, component) : null;
  const isInstance = !!symbolInfo?.isInstance;
  const isMain = !!symbolInfo?.isMain;

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.stopPropagation();
      dragRef.current = component;
      setIsDragging(true);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', component.getId());
    },
    [component, dragRef]
  );

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
    setDropPosition(null);
  }, [dragRef]);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const dragged = dragRef.current;
      if (!dragged || dragged === component || isDescendantOf(dragged, component)) {
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = (e.clientY - rect.top) / rect.height;

      if (ratio < 0.25) {
        setDropPosition('before');
      } else if (ratio > 0.75) {
        setDropPosition('after');
      } else {
        setDropPosition('inside');
      }

      e.dataTransfer.dropEffect = 'move';
    },
    [component, dragRef]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    setDropPosition(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const dragged = dragRef.current;
      if (!dragged || dragged === component || isDescendantOf(dragged, component)) {
        setDropPosition(null);
        return;
      }

      const currentDropPosition = (() => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientY - rect.top) / rect.height;
        if (ratio < 0.25) return 'before';
        if (ratio > 0.75) return 'after';
        return 'inside';
      })();

      if (currentDropPosition === 'inside') {
        dragged.move(component, { at: component.components().length });
        setExpanded(true);
      } else {
        const parent = component.parent?.();
        if (!parent) {
          setDropPosition(null);
          return;
        }
        const index = parent.components().indexOf(component);
        dragged.move(parent, { at: currentDropPosition === 'before' ? index : index + 1 });
      }

      setDropPosition(null);
      dragRef.current = null;
    },
    [component, dragRef]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(component);
    },
    [component, onSelect]
  );

  const handleToggleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setExpanded((prev) => !prev);
    },
    []
  );

  const nodeClass = `layer-node${dropPosition ? ` layer-node--drop-${dropPosition}` : ''}`;
  const symbolClass = isInstance ? ' layer-item--symbol-instance' : isMain ? ' layer-item--symbol-main' : '';
  const itemClass = `layer-item${isSelected ? ' layer-item--selected' : ''}${isDragging ? ' layer-item--dragging' : ''}${symbolClass}`;

  return (
    <div className={nodeClass}>
      <div
        className={itemClass}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {hasChildren ? (
          <button
            className="layer-toggle"
            onClick={handleToggleClick}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '\u25BE' : '\u25B8'}
          </button>
        ) : (
          <span className="layer-toggle-spacer" />
        )}
        {(isInstance || isMain) && (
          <span className="layer-symbol-badge" aria-hidden="true">
            {isInstance ? '\u25C6' : '\u25C7'}
          </span>
        )}
        <span className="layer-name" title={name}>
          {isInstance ? `${name} (symbol instance)` : isMain ? `${name} (symbol main)` : name}
        </span>
      </div>
      {hasChildren && expanded && (
        <div className="layer-children">
          {children.map((child: any) => (
            <LayerItem
              key={child.getId()}
              component={child}
              level={level + 1}
              selected={selected}
              onSelect={onSelect}
              dragRef={dragRef}
              editor={editor}
            />
          ))}
        </div>
      )}
    </div>
  );
});
