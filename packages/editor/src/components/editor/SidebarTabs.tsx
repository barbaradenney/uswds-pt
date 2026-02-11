/**
 * SidebarTabs Component
 *
 * Reusable tab bar for sidebar panels. Uses proper ARIA roles for
 * accessible tab navigation (tablist / tab / aria-selected).
 */

import { memo } from 'react';

export interface SidebarTab {
  id: string;
  label: string;
}

export interface SidebarTabsProps {
  tabs: SidebarTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const SidebarTabs = memo(function SidebarTabs({
  tabs,
  activeTab,
  onTabChange,
}: SidebarTabsProps) {
  return (
    <div className="sidebar-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`sidebar-tab ${activeTab === tab.id ? 'sidebar-tab--active' : ''}`}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`sidebar-panel-${tab.id}`}
          id={`sidebar-tab-${tab.id}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
});
