/**
 * LeftSidebar Component
 *
 * Tabbed sidebar with Pages and Layers panels.
 * - Pages tab: custom React PagesPanel component
 * - Layers tab: GrapesJS LayersProvider portal Container
 */

import { useState } from 'react';
import { LayersProvider } from '@grapesjs/react';
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
              {({ Container }) => <Container>{null}</Container>}
            </LayersProvider>
          </div>
        )}
      </div>
    </div>
  );
}
