/**
 * RightSidebar Component
 *
 * Tabbed sidebar with Components (blocks) and Properties (traits) panels.
 * - Components tab: GrapesJS BlocksProvider with search input
 * - Properties tab: GrapesJS TraitsProvider portal Container
 *
 * Auto-switches to Properties tab when a component is selected.
 */

import { useState, useEffect } from 'react';
import { BlocksProvider, TraitsProvider, useEditorMaybe } from '@grapesjs/react';
import { SidebarTabs } from './SidebarTabs';
import { BlockSearchInput } from './BlockSearchInput';

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

    const handleSelect = () => {
      setActiveTab('properties');
    };

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
              {({ Container }) => (
                <>
                  <BlockSearchInput />
                  <Container>{null}</Container>
                </>
              )}
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
              {({ Container }) => <Container>{null}</Container>}
            </TraitsProvider>
          </div>
        )}
      </div>
    </div>
  );
}
