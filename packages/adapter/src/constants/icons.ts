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
  'usa-text-input': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 12h6"/></svg>`,
  'usa-textarea': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 7h10v2H7zm0 4h10v2H7zm0 4h7v2H7z"/></svg>`,
  'usa-select': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/></svg>`,
  'usa-checkbox': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M10 17l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8z"/></svg>`,
  'checkbox-group': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 10l2 2 4-4-1-1-3 3-1-1z"/><path d="M7 15l2 2 4-4-1-1-3 3-1-1z"/></svg>`,
  'usa-radio': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/><circle cx="12" cy="12" r="5"/></svg>`,
  'radio-group': `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5"><circle cx="5" cy="6" r="3" fill="none"/><circle cx="5" cy="6" r="1.5" stroke="none"/><line x1="11" y1="6" x2="21" y2="6"/><circle cx="5" cy="12" r="3" fill="none"/><line x1="11" y1="12" x2="21" y2="12"/><circle cx="5" cy="18" r="3" fill="none"/><line x1="11" y1="18" x2="21" y2="18"/></svg>`,
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
  'usa-in-page-navigation': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h8v2H3zm0 4h6v2H3zm0 4h8v2H3zm0 4h6v2H3z"/><path d="M14 3h7v18h-7V3zm2 2v14h3V5h-3z" opacity="0.5"/></svg>`,
  'usa-language-selector': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`,
  'usa-character-count': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v10H3V5zm2 2v6h14V7H5z"/><path d="M14 17h7v2h-7z" opacity="0.6"/></svg>`,
  'usa-memorable-date': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/><path d="M7 10h3v2H7zm0 4h3v2H7zm5-4h3v2h-3zm5 0h2v2h-2z" opacity="0.6"/></svg>`,

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

  // Containers
  'form-container': `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" stroke-width="1.5" opacity="0.6"/></svg>`,
  'section-container': `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4,2"/></svg>`,

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
