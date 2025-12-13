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
  'usa-radio': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/><circle cx="12" cy="12" r="5"/></svg>`,
  'usa-date-picker': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>`,

  // Navigation
  'usa-header': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v4H3z"/><path d="M3 9h18v12H3z" opacity="0.3"/></svg>`,
  'usa-footer': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v12H3z" opacity="0.3"/><path d="M3 17h18v4H3z"/></svg>`,
  'usa-breadcrumb': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`,
  'usa-pagination': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" transform="translate(6,0)"/></svg>`,

  // Data Display
  'usa-card': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 7h10v3H7z"/></svg>`,
  'usa-table': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v18H3V3zm16 4H5v2h14V7zm0 4H5v2h14v-2zm0 4H5v2h14v-2z"/></svg>`,
  'usa-tag': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>`,

  // Feedback
  'usa-alert': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`,
  'usa-banner': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3z"/><path d="M3 9h18v10H3z" opacity="0.5"/></svg>`,
  'usa-modal': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 4H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H5V6h14v12z"/><path d="M7 8h10v2H7zm0 4h10v2H7z"/></svg>`,

  // Layout
  'usa-accordion': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v3H3zm0 5h18v3H3zm0 5h18v3H3z"/></svg>`,
  'usa-step-indicator': `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="3"/><circle cx="12" cy="12" r="3"/><circle cx="18" cy="12" r="3" opacity="0.3"/></svg>`,

  // Default icon
  default: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>`,
};

/**
 * Default content templates for drag-and-drop
 */
export const DEFAULT_CONTENT: Record<string, string> = {
  // Actions
  'usa-button': '<usa-button>Click me</usa-button>',
  'usa-button-group': `<usa-button-group>
  <usa-button>Button 1</usa-button>
  <usa-button variant="outline">Button 2</usa-button>
</usa-button-group>`,
  'usa-link': '<usa-link href="#">Link text</usa-link>',
  'usa-search': '<usa-search label="Search" size="small"></usa-search>',

  // Forms
  'usa-text-input': '<usa-text-input label="Label" name="field"></usa-text-input>',
  'usa-textarea': '<usa-textarea label="Label" name="field"></usa-textarea>',
  'usa-select': `<usa-select label="Label" name="field">
  <option value="">Select an option</option>
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</usa-select>`,
  'usa-checkbox': '<usa-checkbox label="Checkbox label" name="field"></usa-checkbox>',
  'usa-radio': '<usa-radio label="Radio label" name="field" value="1"></usa-radio>',
  'usa-date-picker': '<usa-date-picker label="Date" name="date"></usa-date-picker>',
  'usa-time-picker': '<usa-time-picker label="Time" name="time"></usa-time-picker>',
  'usa-file-input': '<usa-file-input label="Upload file" name="file"></usa-file-input>',
  'usa-combo-box': '<usa-combo-box label="Combo box" name="combo"></usa-combo-box>',
  'usa-range-slider': '<usa-range-slider label="Range" name="range" min="0" max="100"></usa-range-slider>',

  // Navigation
  'usa-header': `<usa-header>
  <span slot="title">Site Title</span>
</usa-header>`,
  'usa-footer': '<usa-footer></usa-footer>',
  'usa-breadcrumb': `<usa-breadcrumb>
  <a href="#">Home</a>
  <a href="#">Section</a>
  <span>Current page</span>
</usa-breadcrumb>`,
  'usa-pagination': '<usa-pagination current-page="1" total-pages="5"></usa-pagination>',
  'usa-side-navigation': '<usa-side-navigation></usa-side-navigation>',
  'usa-skip-link': '<usa-skip-link href="#main">Skip to main content</usa-skip-link>',

  // Data Display
  'usa-card': `<usa-card>
  <span slot="header">Card Title</span>
  <p>Card content goes here.</p>
</usa-card>`,
  'usa-table': `<usa-table>
  <thead>
    <tr><th>Column 1</th><th>Column 2</th></tr>
  </thead>
  <tbody>
    <tr><td>Data 1</td><td>Data 2</td></tr>
  </tbody>
</usa-table>`,
  'usa-tag': '<usa-tag>Tag</usa-tag>',
  'usa-list': `<usa-list>
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
</usa-list>`,
  'usa-icon': '<usa-icon icon="check"></usa-icon>',
  'usa-collection': '<usa-collection></usa-collection>',
  'usa-summary-box': `<usa-summary-box heading="Key information">
  <p>Summary content here.</p>
</usa-summary-box>`,

  // Feedback
  'usa-alert': `<usa-alert variant="info">
  <span slot="heading">Alert heading</span>
  Alert message content.
</usa-alert>`,
  'usa-banner': '<usa-banner></usa-banner>',
  'usa-site-alert': `<usa-site-alert variant="info">
  Important site-wide message.
</usa-site-alert>`,
  'usa-modal': `<usa-modal>
  <span slot="heading">Modal Title</span>
  <p>Modal content goes here.</p>
</usa-modal>`,
  'usa-tooltip': '<usa-tooltip content="Tooltip text">Hover me</usa-tooltip>',

  // Layout
  'usa-accordion': `<usa-accordion>
  <usa-accordion-item heading="Section 1">
    <p>Content for section 1</p>
  </usa-accordion-item>
  <usa-accordion-item heading="Section 2">
    <p>Content for section 2</p>
  </usa-accordion-item>
</usa-accordion>`,
  'usa-step-indicator': '<usa-step-indicator current-step="1" total-steps="4"></usa-step-indicator>',
  'usa-process-list': '<usa-process-list></usa-process-list>',
  'usa-identifier': '<usa-identifier></usa-identifier>',
  'usa-prose': '<usa-prose><p>Prose content with proper typography.</p></usa-prose>',

  // Patterns
  'usa-name-pattern': '<usa-name-pattern label="Full Name"></usa-name-pattern>',
  'usa-address-pattern': '<usa-address-pattern label="Mailing Address"></usa-address-pattern>',
  'usa-phone-number-pattern': '<usa-phone-number-pattern label="Phone Number"></usa-phone-number-pattern>',
  'usa-email-address-pattern': '<usa-email-address-pattern label="Email Address"></usa-email-address-pattern>',
  'usa-date-of-birth-pattern': '<usa-date-of-birth-pattern label="Date of Birth"></usa-date-of-birth-pattern>',
  'usa-ssn-pattern': '<usa-ssn-pattern label="Social Security Number"></usa-ssn-pattern>',

  // Templates
  'usa-landing-template': `<usa-landing-template
  hero-heading="Welcome"
  hero-description="Your agency description here."
  hero-cta-text="Learn More">
</usa-landing-template>`,
  'usa-form-template': '<usa-form-template heading="Form Title"></usa-form-template>',
  'usa-sign-in-template': '<usa-sign-in-template></usa-sign-in-template>',
  'usa-error-template': '<usa-error-template error-code="404"></usa-error-template>',
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
 * Import map for sharing Lit dependencies across all USWDS-WC packages
 */
export const CDN_IMPORT_MAP = {
  imports: {
    // Lit core dependencies - shared across all packages
    'lit': `https://esm.sh/lit@${LIT_VERSION}`,
    'lit/': `https://esm.sh/lit@${LIT_VERSION}/`,
    'lit/decorators.js': `https://esm.sh/lit@${LIT_VERSION}/decorators.js`,
    'lit-html': `https://esm.sh/lit-html@${LIT_VERSION}`,
    'lit-html/': `https://esm.sh/lit-html@${LIT_VERSION}/`,
    'lit-element': `https://esm.sh/lit-element@4`,
    'lit-element/': `https://esm.sh/lit-element@4/`,
    '@lit/reactive-element': `https://esm.sh/@lit/reactive-element@2`,
    '@lit/reactive-element/': `https://esm.sh/@lit/reactive-element@2/`,
    // USWDS-WC packages with external Lit (uses import map for resolution)
    // Note: No prefix mappings (e.g., '@uswds-wc/core/') to avoid CSS being loaded as modules
    '@uswds-wc/core': `https://esm.sh/*@uswds-wc/core@${USWDS_WC_VERSIONS.core}`,
    '@uswds-wc/actions': `https://esm.sh/*@uswds-wc/actions@${USWDS_WC_VERSIONS.actions}`,
    '@uswds-wc/forms': `https://esm.sh/*@uswds-wc/forms@${USWDS_WC_VERSIONS.forms}`,
    '@uswds-wc/feedback': `https://esm.sh/*@uswds-wc/feedback@${USWDS_WC_VERSIONS.feedback}`,
    '@uswds-wc/navigation': `https://esm.sh/*@uswds-wc/navigation@${USWDS_WC_VERSIONS.navigation}`,
    '@uswds-wc/data-display': `https://esm.sh/*@uswds-wc/data-display@${USWDS_WC_VERSIONS['data-display']}`,
    '@uswds-wc/layout': `https://esm.sh/*@uswds-wc/layout@${USWDS_WC_VERSIONS.layout}`,
    '@uswds-wc/patterns': `https://esm.sh/*@uswds-wc/patterns@${USWDS_WC_VERSIONS.patterns}`,
  },
};

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
 * CDN URLs for stylesheets
 */
export const CDN_STYLES = {
  uswds: `https://cdn.jsdelivr.net/npm/@uswds/uswds@${USWDS_VERSION}/dist/css/uswds.min.css`,
  uswdsWcCore: `https://unpkg.com/@uswds-wc/core@${USWDS_WC_VERSIONS.core}/src/styles/styles.css`,
};

/**
 * Generate a script that loads all USWDS-WC components in an iframe
 * This script should be injected after the import map
 */
export function generateComponentLoaderScript(): string {
  const imports = USWDS_WC_PACKAGES.map(pkg => `import '@uswds-wc/${pkg}';`).join('\n');
  return imports;
}
