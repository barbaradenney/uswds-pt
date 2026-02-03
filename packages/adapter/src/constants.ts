/**
 * Constants for the adapter
 */

/**
 * Block categories matching USWDS-WC package structure
 */
export const BLOCK_CATEGORIES = [
  {
    id: 'actions',
    label: 'Actions',
    order: 1,
    open: true,
  },
  {
    id: 'forms',
    label: 'Form Controls',
    order: 2,
    open: false,
  },
  {
    id: 'navigation',
    label: 'Navigation',
    order: 3,
    open: false,
  },
  {
    id: 'data-display',
    label: 'Data Display',
    order: 4,
    open: false,
  },
  {
    id: 'feedback',
    label: 'Feedback',
    order: 5,
    open: false,
  },
  {
    id: 'layout',
    label: 'Layout',
    order: 6,
    open: false,
  },
  {
    id: 'structure',
    label: 'Structure',
    order: 7,
    open: false,
  },
  {
    id: 'patterns',
    label: 'Form Patterns',
    order: 8,
    open: false,
  },
  {
    id: 'templates',
    label: 'Page Templates',
    order: 9,
    open: false,
  },
] as const;

/**
 * SVG icons for components in the block palette
 */
export const COMPONENT_ICONS: Record<string, string> = {
  // Actions
  'usa-button': `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="7" width="18" height="10" rx="2"/></svg>`,
  'usa-button-group': `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="8" width="8" height="8" rx="1"/><rect x="14" y="8" width="8" height="8" rx="1"/></svg>`,
  'usa-link': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>`,
  'usa-search': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`,

  // Forms
  'usa-text-input': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 12h2v5H7zm4-3h2v8h-2zm4-3h2v11h-2z"/></svg>`,
  'usa-textarea': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 7h10v2H7zm0 4h10v2H7zm0 4h7v2H7z"/></svg>`,
  'usa-select': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/></svg>`,
  'usa-checkbox': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M10 17l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8z"/></svg>`,
  'checkbox-group': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 10l2 2 4-4-1-1-3 3-1-1z"/><path d="M7 15l2 2 4-4-1-1-3 3-1-1z"/></svg>`,
  'usa-radio': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/><circle cx="12" cy="12" r="5"/></svg>`,
  'radio-group': `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="9" r="3"/><circle cx="9" cy="17" r="4" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
  'usa-date-picker': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>`,
  'usa-time-picker': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/><path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>`,
  'usa-combo-box': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 10l5 5 5-5z"/><path d="M7 7h10v2H7z"/></svg>`,

  // Navigation
  'usa-header': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v4H3z"/><path d="M3 9h18v12H3z" opacity="0.3"/></svg>`,
  'usa-footer': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v12H3z" opacity="0.3"/><path d="M3 17h18v4H3z"/></svg>`,
  'usa-breadcrumb': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`,
  'usa-pagination': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" transform="translate(6,0)"/></svg>`,
  'usa-side-navigation': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3zm0 6h12v2H3zm0 6h18v2H3z"/></svg>`,

  // Data Display
  'usa-card': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 7h10v3H7z"/></svg>`,
  'card-container': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M8 8h8v8H8z" fill="none" stroke="currentColor" stroke-dasharray="2,2" opacity="0.5"/></svg>`,
  'usa-table': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v18H3V3zm16 4H5v2h14V7zm0 4H5v2h14v-2zm0 4H5v2h14v-2z"/></svg>`,
  'usa-tag': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>`,
  'usa-list': `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="4" cy="6" r="2"/><path d="M8 5h14v2H8z"/><circle cx="4" cy="12" r="2"/><path d="M8 11h14v2H8z"/><circle cx="4" cy="18" r="2"/><path d="M8 17h14v2H8z"/></svg>`,
  'usa-collection': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v4H4zm0 6h16v4H4zm0 6h16v4H4z"/></svg>`,
  'usa-summary-box': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 7h10v2H7zm0 4h10v2H7zm0 4h7v2H7z"/></svg>`,
  'usa-icon': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`,

  // Feedback
  'usa-alert': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`,
  'usa-banner': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3z"/><path d="M3 9h18v10H3z" opacity="0.5"/></svg>`,
  'usa-site-alert': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
  'usa-modal': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v14H3V5zm2 2v10h14V7H5z"/><path d="M7 9h10v2H7zm0 4h6v2H7z" opacity="0.7"/></svg>`,
  'usa-tooltip': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/><path d="M20 2l2 2-3 3-2-2 3-3z" opacity="0.5"/></svg>`,

  // Layout
  'usa-accordion': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v3H3zm0 5h18v3H3zm0 5h18v3H3z"/></svg>`,
  'usa-step-indicator': `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="3"/><circle cx="12" cy="12" r="3"/><circle cx="18" cy="12" r="3" opacity="0.3"/></svg>`,
  'usa-process-list': `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="5" r="3"/><path d="M10 4h12v2H10z"/><circle cx="6" cy="12" r="3"/><path d="M10 11h12v2H10z"/><circle cx="6" cy="19" r="3"/><path d="M10 18h12v2H10z"/></svg>`,
  'usa-prose': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3zm0 4h14v2H3zm0 4h18v2H3zm0 4h10v2H3z"/></svg>`,
  'usa-identifier': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6.9 3.45L12 11.09 5.1 7.63 12 4.18zM4 16.54V9.09l7 3.5v7.45l-7-3.5zm9 3.5v-7.45l7-3.5v7.45l-7 3.5z"/></svg>`,

  // Templates
  'blank-template': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v2H3V3zm0 16h18v2H3v-2z"/><rect x="5" y="7" width="14" height="10" fill="none" stroke="currentColor" stroke-dasharray="2,2" opacity="0.5"/></svg>`,
  'landing-template': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v2H3V3zm0 4h18v10H3V7zm0 12h18v2H3v-2z"/><path d="M5 9h14v2H5V9zm0 4h10v2H5v-2z" opacity="0.5"/></svg>`,
  'form-template': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v2H3V3zm0 16h18v2H3v-2z"/><path d="M5 7h14v2H5V7zm0 4h14v2H5v-2zm0 4h8v2H5v-2z" opacity="0.5"/></svg>`,
  'sign-in-template': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v18H3V3zm16 16V5H5v14h14z"/><path d="M8 10h8v2H8v-2zm0 4h8v2H8v-2z" opacity="0.5"/><circle cx="12" cy="7" r="2" opacity="0.5"/></svg>`,
  'error-template': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v2H3V3zm0 16h18v2H3v-2z"/><path d="M12 7l-5 9h10l-5-9zm0 3v3m0 1v1" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.7"/></svg>`,

  // Form Patterns
  'usa-name-pattern': `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="7" r="4"/><path d="M4 21v-2c0-2.2 3.6-4 8-4s8 1.8 8 4v2H4z"/></svg>`,
  'usa-address-pattern': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4 7v13h16V7l-8-5zm0 2.5L18 8v10H6V8l6-3.5zM8 11h8v2H8v-2zm0 3h6v2H8v-2z"/></svg>`,
  'usa-phone-number-pattern': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>`,
  'usa-email-address-pattern': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>`,
  'usa-date-of-birth-pattern': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2m0 10c2.7 0 5.8 1.29 6 2H6c.23-.72 3.31-2 6-2m0-12C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" opacity="0.3"/></svg>`,
  'usa-ssn-pattern': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/></svg>`,
  'conditional-checkbox': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 10l2 2 4-4-1-1-3 3-1-1z"/><path d="M7 15h10v2H7z" opacity="0.5"/></svg>`,
  'conditional-radio': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/><circle cx="12" cy="12" r="5"/><path d="M7 20h10v2H7z" opacity="0.5"/></svg>`,

  // Grid Layout
  'grid-container': `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
  'grid-row': `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="8" width="18" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
  'grid-2-col': `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="5" width="8" height="14" rx="1"/><rect x="13" y="5" width="8" height="14" rx="1"/></svg>`,
  'grid-3-col': `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="5" width="5.5" height="14" rx="1"/><rect x="9.25" y="5" width="5.5" height="14" rx="1"/><rect x="16.5" y="5" width="5.5" height="14" rx="1"/></svg>`,
  'grid-4-col': `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="6" width="4" height="12" rx="1"/><rect x="7.33" y="6" width="4" height="12" rx="1"/><rect x="12.66" y="6" width="4" height="12" rx="1"/><rect x="18" y="6" width="4" height="12" rx="1"/></svg>`,
  'grid-sidebar-left': `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="5" width="5" height="14" rx="1"/><rect x="10" y="5" width="11" height="14" rx="1"/></svg>`,
  'grid-sidebar-right': `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="5" width="11" height="14" rx="1"/><rect x="16" y="5" width="5" height="14" rx="1"/></svg>`,

  // Basic Elements
  'heading': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 4v3h5.5v12h3V7H19V4H5z"/></svg>`,
  'text': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3V5zm0 4h18v2H3V9zm0 4h14v2H3v-2zm0 4h18v2H3v-2z"/></svg>`,

  // Default icon
  default: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>`,
};

/**
 * Default content templates for drag-and-drop
 */
export const DEFAULT_CONTENT: Record<string, string> = {
  // Basic Elements
  'heading': '__FULL_HTML__<h2>Heading</h2>',
  'text': '__FULL_HTML__<p>This is a paragraph of text. Click to edit.</p>',

  // Actions
  'usa-button': 'Click me',
  'usa-button-group': '__FULL_HTML__<usa-button-group btn-count="2" btn1-text="Button 1" btn1-variant="default" btn2-text="Button 2" btn2-variant="outline"></usa-button-group>',
  'usa-link': '__FULL_HTML__<usa-link text="Link" href="#"></usa-link>',
  'usa-search': '__FULL_HTML__<usa-search placeholder="Search" size="medium"></usa-search>',

  // Navigation
  'usa-header': '__FULL_HTML__<usa-header logo-text="Site Name" logo-href="/" nav-count="4" nav1-label="Home" nav1-href="#" nav1-current nav2-label="About" nav2-href="#" nav3-label="Services" nav3-href="#" nav4-label="Contact" nav4-href="#"></usa-header>',
  'usa-footer': '__FULL_HTML__<usa-footer variant="medium" agency-name="Agency Name" agency-url="#"></usa-footer>',
  'usa-breadcrumb': '__FULL_HTML__<usa-breadcrumb count="3" item1-label="Home" item1-href="#" item2-label="Section" item2-href="#" item3-label="Current Page"></usa-breadcrumb>',
  'usa-pagination': '__FULL_HTML__<usa-pagination current-page="1" total-pages="5"></usa-pagination>',
  'usa-side-navigation': '__FULL_HTML__<usa-side-navigation count="4" item1-label="Home" item1-href="#" item2-label="About" item2-href="#" item3-label="Services" item3-href="#" item3-current="true" item4-label="Contact" item4-href="#"></usa-side-navigation>',

  // Forms
  'usa-text-input': '__FULL_HTML__<usa-text-input label="Text Input" name="text-field"></usa-text-input>',
  'usa-textarea': '__FULL_HTML__<usa-textarea label="Textarea" name="textarea-field"></usa-textarea>',
  'usa-select': '__FULL_HTML__<usa-select label="Select" name="select-field"></usa-select>',
  'usa-checkbox': '__FULL_HTML__<usa-checkbox label="Checkbox option" name="checkbox-group" value="option1"></usa-checkbox>',
  'checkbox-group': `__FULL_HTML__<fieldset class="usa-fieldset">
  <legend class="usa-legend">Select your options</legend>
  <usa-checkbox label="Option 1" name="checkbox-group" value="option1"></usa-checkbox>
  <usa-checkbox label="Option 2" name="checkbox-group" value="option2"></usa-checkbox>
  <usa-checkbox label="Option 3" name="checkbox-group" value="option3"></usa-checkbox>
</fieldset>`,
  'usa-radio': '__FULL_HTML__<usa-radio label="Radio option" name="radio-group" value="option1"></usa-radio>',
  'radio-group': `__FULL_HTML__<fieldset class="usa-fieldset">
  <legend class="usa-legend">Select one option</legend>
  <usa-radio label="Option 1" name="radio-group" value="option1"></usa-radio>
  <usa-radio label="Option 2" name="radio-group" value="option2"></usa-radio>
  <usa-radio label="Option 3" name="radio-group" value="option3"></usa-radio>
</fieldset>`,
  'usa-file-input': '__FULL_HTML__<usa-file-input label="File Input" name="file-field"></usa-file-input>',
  'usa-range-slider': '__FULL_HTML__<usa-range-slider label="Range" min="0" max="100" value="50"></usa-range-slider>',
  'usa-date-picker': '__FULL_HTML__<usa-date-picker label="Date" name="date-picker"></usa-date-picker>',
  'usa-time-picker': '__FULL_HTML__<usa-time-picker label="Time" name="time-picker"></usa-time-picker>',
  'usa-combo-box': '__FULL_HTML__<usa-combo-box label="Select an option" name="combo-box" placeholder="Select..." option-count="3" option1-label="Option 1" option1-value="option1" option2-label="Option 2" option2-value="option2" option3-label="Option 3" option3-value="option3"></usa-combo-box>',

  // Data Display
  'usa-card': '__FULL_HTML__<usa-card heading="Card Title" text="Card content goes here."></usa-card>',
  'card-container': `__FULL_HTML__<div class="usa-card uswds-card-container">
  <div class="usa-card__container">
    <div class="usa-card__body">
      <p style="color: #71767a; text-align: center;">Drop content here</p>
    </div>
  </div>
</div>`,
  'usa-tag': '__FULL_HTML__<usa-tag text="Tag"></usa-tag>',
  'usa-list': '__FULL_HTML__<usa-list count="3" item1="First item" item2="Second item" item3="Third item"></usa-list>',
  'usa-collection': '__FULL_HTML__<usa-collection count="3" item1-title="First Article" item1-description="A brief description of the first article." item2-title="Second Article" item2-description="A brief description of the second article." item3-title="Third Article" item3-description="A brief description of the third article."></usa-collection>',
  'usa-summary-box': '__FULL_HTML__<usa-summary-box heading="Key Information" content="This is important information that you should know."></usa-summary-box>',
  'usa-icon': '__FULL_HTML__<usa-icon name="info" size="5"></usa-icon>',

  // Feedback
  'usa-alert': '__FULL_HTML__<usa-alert variant="info" heading="Alert heading" text="This is an alert message."></usa-alert>',
  'usa-banner': '__FULL_HTML__<usa-banner></usa-banner>',
  'usa-site-alert': '__FULL_HTML__<usa-site-alert type="info" heading="Site Alert" content="This is a site-wide alert message."></usa-site-alert>',
  'usa-modal': '__FULL_HTML__<usa-modal heading="Modal Title" description="Modal content goes here." trigger-text="Open Modal" show-trigger></usa-modal>',
  'usa-tooltip': '__FULL_HTML__<usa-tooltip text="Helpful information" label="Hover me" position="top"></usa-tooltip>',

  // Layout
  'usa-accordion': '__FULL_HTML__<usa-accordion section-count="3" section1-title="Section 1" section1-content="Content for section 1" section1-expanded="true" section2-title="Section 2" section2-content="Content for section 2" section3-title="Section 3" section3-content="Content for section 3"></usa-accordion>',
  'usa-step-indicator': '__FULL_HTML__<usa-step-indicator step-count="4" show-labels step1-label="Step 1" step1-status="complete" step2-label="Step 2" step2-status="current" step3-label="Step 3" step3-status="incomplete" step4-label="Step 4" step4-status="incomplete"></usa-step-indicator>',
  'usa-process-list': '__FULL_HTML__<usa-process-list item-count="3" item1-heading="Step 1" item1-content="Description for step 1" item2-heading="Step 2" item2-content="Description for step 2" item3-heading="Step 3" item3-content="Description for step 3"></usa-process-list>',
  'usa-prose': '__FULL_HTML__<usa-prose>Enter your prose content here. This component applies USWDS typography styles to the text within.</usa-prose>',
  'usa-identifier': '__FULL_HTML__<usa-identifier domain="example.gov" parent-agency="Department of Example" parent-agency-href="#"></usa-identifier>',

  // Templates - Full page layouts
  'blank-template': `__FULL_HTML__<div class="blank-template">
  <usa-banner></usa-banner>
  <usa-header logo-text="Agency Name" logo-href="/" nav-count="4" nav1-label="Home" nav1-href="#" nav1-current nav2-label="About" nav2-href="#" nav3-label="Services" nav3-href="#" nav4-label="Contact" nav4-href="#" show-skip-link="true"></usa-header>
  <main id="main-content" class="grid-container" style="padding: 2rem 0; min-height: 400px;">
    <div class="grid-row">
      <div class="grid-col-12"></div>
    </div>
  </main>
  <usa-footer variant="medium" agency-name="Agency Name" agency-url="#"></usa-footer>
  <usa-identifier domain="agency.gov" parent-agency="Department of Example" parent-agency-href="#"></usa-identifier>
</div>`,

  'landing-template': `__FULL_HTML__<div class="landing-template">
  <usa-banner></usa-banner>
  <usa-header logo-text="Agency Name" logo-href="/" nav-count="4" nav1-label="Home" nav1-href="#" nav1-current nav2-label="About" nav2-href="#about" nav3-label="Services" nav3-href="#services" nav4-label="Contact" nav4-href="#contact" show-skip-link="true"></usa-header>
  <main id="main-content">
    <section class="usa-hero" style="background-color: #112f4e; padding: 2rem 0;">
      <div class="grid-container">
        <div class="usa-hero__callout" style="background-color: #1a4480; padding: 2rem; max-width: 30rem;">
          <h1 class="usa-hero__heading" style="color: white; font-size: 2.5rem; margin: 0 0 1rem;">Welcome to Our Agency</h1>
          <p style="color: white; margin: 0 0 1.5rem;">We are committed to serving you with excellence. Discover our services and how we can help you today.</p>
          <usa-button text="Learn More" variant="outline-inverse"></usa-button>
        </div>
      </div>
    </section>
    <section class="usa-section" style="padding: 3rem 0;">
      <div class="grid-container">
        <h2 style="margin-bottom: 2rem;">Our Services</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
          <usa-card heading="Service One" text="Description of the first service we offer to help citizens."></usa-card>
          <usa-card heading="Service Two" text="Description of the second service available to the public."></usa-card>
          <usa-card heading="Service Three" text="Description of another important service we provide."></usa-card>
        </div>
      </div>
    </section>
    <section class="usa-section usa-section--light" style="padding: 3rem 0; background-color: #f0f0f0;">
      <div class="grid-container">
        <h2 style="margin-bottom: 1rem;">Latest Updates</h2>
        <usa-collection count="2" item1-title="Important Announcement" item1-description="Stay informed about the latest news and updates from our agency." item2-title="New Program Available" item2-description="Learn about our newest program designed to serve you better."></usa-collection>
      </div>
    </section>
  </main>
  <usa-footer variant="medium" agency-name="Agency Name" agency-url="#"></usa-footer>
  <usa-identifier domain="agency.gov" parent-agency="Department of Example" parent-agency-href="#"></usa-identifier>
</div>`,

  'form-template': `__FULL_HTML__<div class="form-template">
  <usa-banner></usa-banner>
  <usa-header logo-text="Agency Name" logo-href="/" nav-count="3" nav1-label="Home" nav1-href="#" nav2-label="Forms" nav2-href="#" nav2-current nav3-label="Help" nav3-href="#" show-skip-link="true"></usa-header>
  <main id="main-content" class="grid-container" style="padding: 2rem 0;">
    <div style="max-width: 40rem;">
      <h1>Application Form</h1>
      <p class="usa-intro">Please complete all required fields below. Fields marked with (*) are required.</p>
      <usa-alert variant="info" heading="Before you begin" text="Make sure you have all required documents ready before starting this application."></usa-alert>
      <form style="margin-top: 2rem;">
        <fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 0 0 2rem;">
          <legend class="usa-legend usa-legend--large">Personal Information</legend>
          <usa-text-input label="First Name" name="first-name" required></usa-text-input>
          <usa-text-input label="Last Name" name="last-name" required></usa-text-input>
          <usa-text-input label="Email Address" name="email" type="email" required></usa-text-input>
          <usa-text-input label="Phone Number" name="phone" type="tel"></usa-text-input>
        </fieldset>
        <fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 0 0 2rem;">
          <legend class="usa-legend usa-legend--large">Additional Details</legend>
          <usa-select label="Reason for Contact" name="reason"></usa-select>
          <usa-textarea label="Message" name="message" required></usa-textarea>
          <usa-checkbox label="I agree to the terms and conditions" name="terms" required></usa-checkbox>
        </fieldset>
        <usa-button text="Submit Application" variant="default"></usa-button>
      </form>
    </div>
  </main>
  <usa-footer variant="slim" agency-name="Agency Name" agency-url="#"></usa-footer>
  <usa-identifier domain="agency.gov" parent-agency="Department of Example" parent-agency-href="#"></usa-identifier>
</div>`,

  'sign-in-template': `__FULL_HTML__<div class="sign-in-template">
  <usa-banner></usa-banner>
  <usa-header logo-text="Agency Name" logo-href="/" nav-count="2" nav1-label="Home" nav1-href="#" nav2-label="Help" nav2-href="#" show-skip-link="true"></usa-header>
  <main id="main-content" class="grid-container" style="padding: 3rem 0;">
    <div style="max-width: 24rem; margin: 0 auto;">
      <h1>Sign In</h1>
      <p>Access your account to manage your information and services.</p>
      <form style="margin-top: 2rem;">
        <usa-text-input label="Email Address" name="email" type="email" required></usa-text-input>
        <usa-text-input label="Password" name="password" type="password" required></usa-text-input>
        <div style="display: flex; justify-content: space-between; align-items: center; margin: 1rem 0;">
          <usa-checkbox label="Remember me" name="remember"></usa-checkbox>
          <usa-link text="Forgot password?" href="#"></usa-link>
        </div>
        <usa-button text="Sign In" variant="default" style="width: 100%;"></usa-button>
      </form>
      <hr style="margin: 2rem 0; border: none; border-top: 1px solid #dfe1e2;">
      <p style="text-align: center;">Don't have an account? <usa-link text="Create one" href="#"></usa-link></p>
    </div>
  </main>
  <usa-footer variant="slim" agency-name="Agency Name" agency-url="#"></usa-footer>
  <usa-identifier domain="agency.gov" parent-agency="Department of Example" parent-agency-href="#"></usa-identifier>
</div>`,

  'error-template': `__FULL_HTML__<div class="error-template">
  <usa-banner></usa-banner>
  <usa-header logo-text="Agency Name" logo-href="/" nav-count="3" nav1-label="Home" nav1-href="#" nav2-label="About" nav2-href="#" nav3-label="Contact" nav3-href="#" show-skip-link="true"></usa-header>
  <main id="main-content" class="grid-container" style="padding: 4rem 0; text-align: center;">
    <div style="max-width: 40rem; margin: 0 auto;">
      <h1 style="font-size: 4rem; color: #d63e04; margin-bottom: 1rem;">404</h1>
      <h2>Page Not Found</h2>
      <p class="usa-intro">We're sorry, we can't find the page you're looking for. It might have been removed, changed its name, or is otherwise unavailable.</p>
      <usa-alert variant="warning" heading="What you can do:" text="Check the URL for typos, use the navigation menu above, or return to the homepage."></usa-alert>
      <div style="margin-top: 2rem;">
        <usa-button text="Return to Homepage" variant="default"></usa-button>
        <usa-button text="Contact Support" variant="outline"></usa-button>
      </div>
      <div style="margin-top: 3rem;">
        <h3>Popular Pages</h3>
        <ul class="usa-list" style="text-align: left; display: inline-block;">
          <li><usa-link text="About Us" href="#"></usa-link></li>
          <li><usa-link text="Services" href="#"></usa-link></li>
          <li><usa-link text="Contact" href="#"></usa-link></li>
          <li><usa-link text="Help Center" href="#"></usa-link></li>
        </ul>
      </div>
    </div>
  </main>
  <usa-footer variant="slim" agency-name="Agency Name" agency-url="#"></usa-footer>
  <usa-identifier domain="agency.gov" parent-agency="Department of Example" parent-agency-href="#"></usa-identifier>
</div>`,

  // Form Patterns - Pre-built form field combinations following USWDS guidelines
  'usa-name-pattern': `__FULL_HTML__<fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 0;">
  <legend class="usa-legend usa-legend--large">Full Name</legend>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
    <usa-text-input label="First Name" name="first-name" required></usa-text-input>
    <usa-text-input label="Middle Name" name="middle-name"></usa-text-input>
    <usa-text-input label="Last Name" name="last-name" required></usa-text-input>
  </div>
  <usa-text-input label="Suffix" name="suffix" hint="e.g., Jr., Sr., III" width="sm" style="max-width: 8rem;"></usa-text-input>
</fieldset>`,

  'usa-address-pattern': `__FULL_HTML__<fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 0;">
  <legend class="usa-legend usa-legend--large">Mailing Address</legend>
  <usa-text-input label="Street Address" name="street-address-1" required></usa-text-input>
  <usa-text-input label="Street Address Line 2" name="street-address-2" hint="Apartment, suite, unit, building, floor, etc."></usa-text-input>
  <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1rem;">
    <usa-text-input label="City" name="city" required></usa-text-input>
    <usa-select label="State" name="state" required option-count="56" option1-label="Alabama" option1-value="AL" option2-label="Alaska" option2-value="AK" option3-label="Arizona" option3-value="AZ" option4-label="Arkansas" option4-value="AR" option5-label="California" option5-value="CA" option6-label="Colorado" option6-value="CO" option7-label="Connecticut" option7-value="CT" option8-label="Delaware" option8-value="DE" option9-label="District of Columbia" option9-value="DC" option10-label="Florida" option10-value="FL" option11-label="Georgia" option11-value="GA" option12-label="Hawaii" option12-value="HI" option13-label="Idaho" option13-value="ID" option14-label="Illinois" option14-value="IL" option15-label="Indiana" option15-value="IN" option16-label="Iowa" option16-value="IA" option17-label="Kansas" option17-value="KS" option18-label="Kentucky" option18-value="KY" option19-label="Louisiana" option19-value="LA" option20-label="Maine" option20-value="ME" option21-label="Maryland" option21-value="MD" option22-label="Massachusetts" option22-value="MA" option23-label="Michigan" option23-value="MI" option24-label="Minnesota" option24-value="MN" option25-label="Mississippi" option25-value="MS" option26-label="Missouri" option26-value="MO" option27-label="Montana" option27-value="MT" option28-label="Nebraska" option28-value="NE" option29-label="Nevada" option29-value="NV" option30-label="New Hampshire" option30-value="NH" option31-label="New Jersey" option31-value="NJ" option32-label="New Mexico" option32-value="NM" option33-label="New York" option33-value="NY" option34-label="North Carolina" option34-value="NC" option35-label="North Dakota" option35-value="ND" option36-label="Ohio" option36-value="OH" option37-label="Oklahoma" option37-value="OK" option38-label="Oregon" option38-value="OR" option39-label="Pennsylvania" option39-value="PA" option40-label="Rhode Island" option40-value="RI" option41-label="South Carolina" option41-value="SC" option42-label="South Dakota" option42-value="SD" option43-label="Tennessee" option43-value="TN" option44-label="Texas" option44-value="TX" option45-label="Utah" option45-value="UT" option46-label="Vermont" option46-value="VT" option47-label="Virginia" option47-value="VA" option48-label="Washington" option48-value="WA" option49-label="West Virginia" option49-value="WV" option50-label="Wisconsin" option50-value="WI" option51-label="Wyoming" option51-value="WY" option52-label="American Samoa" option52-value="AS" option53-label="Guam" option53-value="GU" option54-label="Northern Mariana Islands" option54-value="MP" option55-label="Puerto Rico" option55-value="PR" option56-label="U.S. Virgin Islands" option56-value="VI"></usa-select>
    <usa-text-input label="ZIP Code" name="zip-code" inputmode="numeric" pattern="[\\d]{5}(-[\\d]{4})?" required></usa-text-input>
  </div>
</fieldset>`,

  'usa-phone-number-pattern': `__FULL_HTML__<fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 0;">
  <legend class="usa-legend usa-legend--large">Phone Number</legend>
  <usa-text-input label="Phone Number" name="phone" type="tel" hint="10-digit phone number, e.g., 202-555-0123" inputmode="tel" required></usa-text-input>
  <fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 1rem 0 0;">
    <legend class="usa-legend">Phone type</legend>
    <usa-radio label="Mobile" name="phone-type" value="mobile"></usa-radio>
    <usa-radio label="Home" name="phone-type" value="home"></usa-radio>
    <usa-radio label="Work" name="phone-type" value="work"></usa-radio>
  </fieldset>
</fieldset>`,

  'usa-email-address-pattern': `__FULL_HTML__<fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 0;">
  <legend class="usa-legend usa-legend--large">Email Address</legend>
  <usa-text-input label="Email Address" name="email" type="email" hint="Enter your email address" required></usa-text-input>
  <usa-text-input label="Confirm Email Address" name="email-confirm" type="email" hint="Re-enter your email address" required></usa-text-input>
</fieldset>`,

  'usa-date-of-birth-pattern': `__FULL_HTML__<fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 0;">
  <legend class="usa-legend usa-legend--large">Date of Birth</legend>
  <p class="usa-hint" style="margin: 0 0 0.5rem;">For example: January 19, 2000</p>
  <div style="display: flex; gap: 1rem;">
    <usa-select label="Month" name="dob-month" required option-count="12" option1-label="January" option1-value="01" option2-label="February" option2-value="02" option3-label="March" option3-value="03" option4-label="April" option4-value="04" option5-label="May" option5-value="05" option6-label="June" option6-value="06" option7-label="July" option7-value="07" option8-label="August" option8-value="08" option9-label="September" option9-value="09" option10-label="October" option10-value="10" option11-label="November" option11-value="11" option12-label="December" option12-value="12" style="min-width: 10rem;"></usa-select>
    <usa-text-input label="Day" name="dob-day" inputmode="numeric" maxlength="2" pattern="[0-9]*" required style="max-width: 5rem;"></usa-text-input>
    <usa-text-input label="Year" name="dob-year" inputmode="numeric" minlength="4" maxlength="4" pattern="[0-9]{4}" required style="max-width: 6rem;"></usa-text-input>
  </div>
</fieldset>`,

  'usa-ssn-pattern': `__FULL_HTML__<fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 0;">
  <legend class="usa-legend usa-legend--large">Social Security Number</legend>
  <usa-alert variant="info" heading="Why we need this" text="We use your Social Security Number to verify your identity. Your information is protected and encrypted." slim></usa-alert>
  <usa-text-input label="Social Security Number" name="ssn" type="password" hint="Enter the 9 digits of your SSN" inputmode="numeric" pattern="^(?!(000|666|9))\\d{3}-(?!00)\\d{2}-(?!0000)\\d{4}$" maxlength="11" required style="max-width: 12rem; margin-top: 1rem;"></usa-text-input>
  <usa-checkbox label="Show SSN" name="show-ssn" style="margin-top: 0.5rem;"></usa-checkbox>
</fieldset>`,

  'conditional-checkbox': `__FULL_HTML__<div class="usa-form-group">
  <usa-checkbox label="I have a preferred contact method" name="has-preference" value="yes" data-reveals="contact-preference-field"></usa-checkbox>
  <div id="contact-preference-field" class="usa-form-group" hidden aria-hidden="true" style="margin-left: 2rem; margin-top: 0.5rem;">
    <usa-select label="Preferred contact method" name="contact-preference" option-count="3" option1-label="Email" option1-value="email" option2-label="Phone" option2-value="phone" option3-label="Mail" option3-value="mail"></usa-select>
  </div>
</div>
<script>
// Conditional field reveal - shows/hides fields based on radio/checkbox selection
// Only initializes once even if script is included multiple times
if (!window._conditionalFieldsInit) {
  window._conditionalFieldsInit = true;

  function initConditionalFields() {
    document.querySelectorAll('[data-reveals]').forEach(function(trigger) {
      if (trigger._conditionalInit) return;
      trigger._conditionalInit = true;

      var targetId = trigger.getAttribute('data-reveals');
      var target = document.getElementById(targetId);
      if (!target) return;

      var name = trigger.getAttribute('name');
      var isRadio = trigger.tagName.toLowerCase() === 'usa-radio';
      var isCheckbox = trigger.tagName.toLowerCase() === 'usa-checkbox';

      function updateVisibility() {
        var input = trigger.querySelector('input');
        var shouldShow = input && input.checked;

        if (shouldShow) {
          target.removeAttribute('hidden');
          target.setAttribute('aria-hidden', 'false');
        } else {
          target.setAttribute('hidden', '');
          target.setAttribute('aria-hidden', 'true');
        }
      }

      if (isRadio && name) {
        document.querySelectorAll('usa-radio[name="' + name + '"]').forEach(function(radio) {
          if (!radio._conditionalListener) {
            radio._conditionalListener = true;
            radio.addEventListener('change', updateVisibility);
          }
        });
      } else if (isCheckbox) {
        trigger.addEventListener('change', updateVisibility);
      }

      updateVisibility();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(initConditionalFields, 100); });
  } else {
    setTimeout(initConditionalFields, 100);
  }
}
</script>`,

  'conditional-radio': `__FULL_HTML__<fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 0;">
  <legend class="usa-legend">How did you hear about us?</legend>
  <usa-radio label="Search engine" name="referral-source" value="search"></usa-radio>
  <usa-radio label="Social media" name="referral-source" value="social"></usa-radio>
  <usa-radio label="Friend or family" name="referral-source" value="friend"></usa-radio>
  <usa-radio label="Other" name="referral-source" value="other" data-reveals="referral-other-field"></usa-radio>
  <div id="referral-other-field" class="usa-form-group" hidden aria-hidden="true" style="margin-left: 2rem; margin-top: 0.5rem;">
    <usa-text-input label="Please specify" name="referral-other" hint="Tell us how you heard about us"></usa-text-input>
  </div>
</fieldset>
<script>
if (!window._conditionalFieldsInit) {
  window._conditionalFieldsInit = true;

  function initConditionalFields() {
    document.querySelectorAll('[data-reveals]').forEach(function(trigger) {
      if (trigger._conditionalInit) return;
      trigger._conditionalInit = true;

      var targetId = trigger.getAttribute('data-reveals');
      var target = document.getElementById(targetId);
      if (!target) return;

      var name = trigger.getAttribute('name');
      var isRadio = trigger.tagName.toLowerCase() === 'usa-radio';
      var isCheckbox = trigger.tagName.toLowerCase() === 'usa-checkbox';

      function updateVisibility() {
        var input = trigger.querySelector('input');
        var shouldShow = input && input.checked;

        if (shouldShow) {
          target.removeAttribute('hidden');
          target.setAttribute('aria-hidden', 'false');
        } else {
          target.setAttribute('hidden', '');
          target.setAttribute('aria-hidden', 'true');
        }
      }

      if (isRadio && name) {
        document.querySelectorAll('usa-radio[name="' + name + '"]').forEach(function(radio) {
          if (!radio._conditionalListener) {
            radio._conditionalListener = true;
            radio.addEventListener('change', updateVisibility);
          }
        });
      } else if (isCheckbox) {
        trigger.addEventListener('change', updateVisibility);
      }

      updateVisibility();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(initConditionalFields, 100); });
  } else {
    setTimeout(initConditionalFields, 100);
  }
}
</script>`,

  // Grid Layout - USWDS Grid System
  // Responsive 2-column: full width on mobile, 50/50 on tablet+
  'grid-2-col': `__FULL_HTML__<div class="grid-row grid-gap">
  <div class="grid-col-12 tablet:grid-col-6" style="padding: 1rem; background: rgba(0,0,0,0.03); min-height: 80px;"></div>
  <div class="grid-col-12 tablet:grid-col-6" style="padding: 1rem; background: rgba(0,0,0,0.03); min-height: 80px;"></div>
</div>`,

  // Responsive 3-column: full width on mobile, 33/33/33 on tablet+
  'grid-3-col': `__FULL_HTML__<div class="grid-row grid-gap">
  <div class="grid-col-12 tablet:grid-col-4" style="padding: 1rem; background: rgba(0,0,0,0.03); min-height: 80px;"></div>
  <div class="grid-col-12 tablet:grid-col-4" style="padding: 1rem; background: rgba(0,0,0,0.03); min-height: 80px;"></div>
  <div class="grid-col-12 tablet:grid-col-4" style="padding: 1rem; background: rgba(0,0,0,0.03); min-height: 80px;"></div>
</div>`,

  // Responsive 4-column: full width on mobile, 50/50 on tablet, 25/25/25/25 on desktop
  'grid-4-col': `__FULL_HTML__<div class="grid-row grid-gap">
  <div class="grid-col-12 tablet:grid-col-6 desktop:grid-col-3" style="padding: 1rem; background: rgba(0,0,0,0.03); min-height: 80px;"></div>
  <div class="grid-col-12 tablet:grid-col-6 desktop:grid-col-3" style="padding: 1rem; background: rgba(0,0,0,0.03); min-height: 80px;"></div>
  <div class="grid-col-12 tablet:grid-col-6 desktop:grid-col-3" style="padding: 1rem; background: rgba(0,0,0,0.03); min-height: 80px;"></div>
  <div class="grid-col-12 tablet:grid-col-6 desktop:grid-col-3" style="padding: 1rem; background: rgba(0,0,0,0.03); min-height: 80px;"></div>
</div>`,

  // Responsive sidebar left: full width stacked on mobile, sidebar/main on tablet+
  'grid-sidebar-left': `__FULL_HTML__<div class="grid-row grid-gap">
  <div class="grid-col-12 tablet:grid-col-4" style="padding: 1rem; background: rgba(0,0,0,0.03); min-height: 100px;"></div>
  <div class="grid-col-12 tablet:grid-col-8" style="padding: 1rem; background: rgba(0,0,0,0.03); min-height: 100px;"></div>
</div>`,

  // Responsive sidebar right: full width stacked on mobile, main/sidebar on tablet+
  'grid-sidebar-right': `__FULL_HTML__<div class="grid-row grid-gap">
  <div class="grid-col-12 tablet:grid-col-8" style="padding: 1rem; background: rgba(0,0,0,0.03); min-height: 100px;"></div>
  <div class="grid-col-12 tablet:grid-col-4" style="padding: 1rem; background: rgba(0,0,0,0.03); min-height: 100px;"></div>
</div>`,
};

/**
 * Category inference from module path
 */
export const PATH_TO_CATEGORY: Record<string, string> = {
  'uswds-wc-actions': 'actions',
  'uswds-wc-forms': 'forms',
  'uswds-wc-navigation': 'navigation',
  'uswds-wc-data-display': 'data-display',
  'uswds-wc-feedback': 'feedback',
  'uswds-wc-layout': 'layout',
  'uswds-wc-structure': 'structure',
  'uswds-wc-patterns': 'patterns',
  'uswds-wc-templates': 'templates',
};

/**
 * CDN configuration for USWDS-WC components
 * Uses esm.sh with shared Lit dependencies to avoid duplicate custom element registration
 */
export const USWDS_WC_VERSIONS = {
  core: '2.5.4',
  actions: '2.5.5',
  forms: '2.5.4',
  feedback: '2.5.4',
  navigation: '2.5.5',
  'data-display': '2.5.4',
  layout: '2.5.4',
  patterns: '2.5.4',
} as const;
export const LIT_VERSION = '3';
export const USWDS_VERSION = '3.8.1';

/**
 * USWDS-WC Bundle version
 * The bundle package includes all components with Lit bundled in
 */
export const USWDS_WC_BUNDLE_VERSION = '2.5.12';

/**
 * USWDS-WC package names for loading
 */
export const USWDS_WC_PACKAGES = [
  'core',
  'actions',
  'forms',
  'feedback',
  'navigation',
  'data-display',
  'layout',
  'patterns',
] as const;

/**
 * CDN URLs for stylesheets and scripts
 * Using @uswds-wc/bundle which includes all components with Lit bundled
 * @see https://github.com/barbaradenney/uswds-wc
 */
export const CDN_URLS = {
  // USWDS base CSS (required for styling)
  uswdsCss: `https://cdn.jsdelivr.net/npm/@uswds/uswds@${USWDS_VERSION}/dist/css/uswds.min.css`,
  // USWDS-WC bundle - all web components with Lit included (using jsdelivr for better reliability)
  // Note: USWDS JavaScript (uswds.min.js) is NOT included - web components handle their own behavior
  uswdsWcJs: `https://cdn.jsdelivr.net/npm/@uswds-wc/bundle@${USWDS_WC_BUNDLE_VERSION}/uswds-wc.js`,
  uswdsWcCss: `https://cdn.jsdelivr.net/npm/@uswds-wc/bundle@${USWDS_WC_BUNDLE_VERSION}/uswds-wc.css`,
};

// Keep CDN_STYLES for backwards compatibility
export const CDN_STYLES = {
  uswds: CDN_URLS.uswdsCss,
};

/**
 * Generate a script that loads all USWDS-WC components in an iframe
 * This script should be injected after the import map
 */
export function generateComponentLoaderScript(): string {
  const imports = USWDS_WC_PACKAGES.map(pkg => `import '@uswds-wc/${pkg}';`).join('\n');
  return imports;
}
