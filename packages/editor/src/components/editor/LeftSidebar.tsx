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

import { useState, useEffect, useCallback } from 'react';
import { LayersProvider, useEditorMaybe } from '@grapesjs/react';
import { SidebarTabs } from './SidebarTabs';
import { PagesPanel } from './PagesPanel';
import { StatesPanel } from './StatesPanel';

const TABS = [
  { id: 'pages', label: 'Pages' },
  { id: 'layers', label: 'Layers' },
  { id: 'states', label: 'States' },
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
        {activeTab === 'states' && (
          <div
            id="sidebar-panel-states"
            role="tabpanel"
            aria-labelledby="sidebar-tab-states"
          >
            <StatesPanel />
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
        />
      ))}
    </div>
  );
}

function LayerItem({
  component,
  level,
  selected,
  onSelect,
}: {
  component: any;
  level: number;
  selected: any;
  onSelect: (comp: any) => void;
}) {
  const [expanded, setExpanded] = useState(level < 2);
  const children = component.components?.() || [];
  const hasChildren = children.length > 0;
  const isSelected = selected === component;
  const name =
    component.getName?.() || component.get?.('tagName') || 'Component';

  return (
    <div className="layer-node">
      <div
        className={`layer-item ${isSelected ? 'layer-item--selected' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
