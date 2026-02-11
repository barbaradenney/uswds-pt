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

import { useState, useEffect, useCallback, useRef } from 'react';
import { LayersProvider, useEditorMaybe } from '@grapesjs/react';
import { SidebarTabs } from './SidebarTabs';
import { PagesPanel } from './PagesPanel';

const TABS = [
  { id: 'pages', label: 'Pages' },
  { id: 'layers', label: 'Layers' },
];

export function LeftSidebar() {
  const [activeTab, setActiveTab] = useState('pages');

  return (
    <div className="editor-sidebar editor-sidebar--left">
      <SidebarTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
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
      </div>
    </div>
  );
}

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

    editor.on('component:selected', handleSelect);
    editor.on('component:deselected', handleDeselect);
    editor.on('component:add', handleUpdate);
    editor.on('component:remove', handleUpdate);

    // Set initial selection
    const current = editor.getSelected();
    if (current) setSelected(current);

    return () => {
      editor.off('component:selected', handleSelect);
      editor.off('component:deselected', handleDeselect);
      editor.off('component:add', handleUpdate);
      editor.off('component:remove', handleUpdate);
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

function LayerItem({
  component,
  level,
  selected,
  onSelect,
  dragRef,
}: {
  component: any;
  level: number;
  selected: any;
  onSelect: (comp: any) => void;
  dragRef: React.MutableRefObject<any>;
}) {
  const [expanded, setExpanded] = useState(level < 2);
  const [dropPosition, setDropPosition] = useState<DropPosition>(null);
  const [isDragging, setIsDragging] = useState(false);
  const children = component.components?.() || [];
  const hasChildren = children.length > 0;
  const isSelected = selected === component;
  const name =
    component.getName?.() || component.get?.('tagName') || 'Component';

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    dragRef.current = component;
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', component.getId());
  };

  const handleDragEnd = () => {
    dragRef.current = null;
    setIsDragging(false);
    setDropPosition(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
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
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const dragged = dragRef.current;
    if (!dragged || dragged === component || isDescendantOf(dragged, component)) {
      setDropPosition(null);
      return;
    }

    if (dropPosition === 'inside') {
      dragged.move(component, { at: component.components().length });
      setExpanded(true);
    } else {
      const parent = component.parent?.();
      if (!parent) {
        setDropPosition(null);
        return;
      }
      const index = parent.components().indexOf(component);
      dragged.move(parent, { at: dropPosition === 'before' ? index : index + 1 });
    }

    setDropPosition(null);
    dragRef.current = null;
  };

  const nodeClass = `layer-node${dropPosition ? ` layer-node--drop-${dropPosition}` : ''}`;
  const itemClass = `layer-item${isSelected ? ' layer-item--selected' : ''}${isDragging ? ' layer-item--dragging' : ''}`;

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
        onClick={(e) => {
          e.stopPropagation();
          onSelect(component);
        }}
      >
        {hasChildren ? (
          <button
            className="layer-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '\u25BE' : '\u25B8'}
          </button>
        ) : (
          <span className="layer-toggle-spacer" />
        )}
        <span className="layer-name" title={name}>
          {name}
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
