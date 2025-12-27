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
  // Note: usa-modal and usa-tooltip are configured via button/link traits, not as standalone icons

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

  // Default icon
  default: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>`,
};

/**
 * Default content templates for drag-and-drop
 */
export const DEFAULT_CONTENT: Record<string, string> = {
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
  'usa-tag': '__FULL_HTML__<usa-tag text="Tag"></usa-tag>',
  'usa-list': '__FULL_HTML__<usa-list count="3" item1="First item" item2="Second item" item3="Third item"></usa-list>',
  'usa-collection': '__FULL_HTML__<usa-collection count="3" item1-title="First Article" item1-description="A brief description of the first article." item2-title="Second Article" item2-description="A brief description of the second article." item3-title="Third Article" item3-description="A brief description of the third article."></usa-collection>',
  'usa-summary-box': '__FULL_HTML__<usa-summary-box heading="Key Information" content="This is important information that you should know."></usa-summary-box>',
  'usa-icon': '__FULL_HTML__<usa-icon name="info" size="5"></usa-icon>',

  // Feedback
  'usa-alert': '__FULL_HTML__<usa-alert variant="info" heading="Alert heading" text="This is an alert message."></usa-alert>',
  'usa-banner': '__FULL_HTML__<usa-banner></usa-banner>',
  'usa-site-alert': '__FULL_HTML__<usa-site-alert type="info" heading="Site Alert" content="This is a site-wide alert message."></usa-site-alert>',
  // Note: usa-modal and usa-tooltip are configured via button/link traits, not as standalone components

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
    <p style="color: #71767a; text-align: center; padding: 4rem 0;">Drag components here to build your page</p>
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

  // 'usa-date-picker': '<usa-date-picker label="Date" name="date"></usa-date-picker>',
  // 'usa-time-picker': '<usa-time-picker label="Time" name="time"></usa-time-picker>',
  // 'usa-combo-box': '<usa-combo-box label="Combo box" name="combo"></usa-combo-box>',

  // // Navigation
  // 'usa-header': `<usa-header>
  // <span slot="title">Site Title</span>
  // </usa-header>`,
  // 'usa-footer': '<usa-footer></usa-footer>',
  // 'usa-breadcrumb': `<usa-breadcrumb>
  // <a href="#">Home</a>
  // <a href="#">Section</a>
  // <span>Current page</span>
  // </usa-breadcrumb>`,
  // 'usa-pagination': '<usa-pagination current-page="1" total-pages="5"></usa-pagination>',
  // 'usa-side-navigation': '<usa-side-navigation></usa-side-navigation>',
  // 'usa-skip-link': '<usa-skip-link href="#main">Skip to main content</usa-skip-link>',

  // // Data Display
  // 'usa-card': `<usa-card>
  // <span slot="header">Card Title</span>
  // <p>Card content goes here.</p>
  // </usa-card>`,
  // 'usa-table': `<usa-table>
  // <thead>
  //   <tr><th>Column 1</th><th>Column 2</th></tr>
  // </thead>
  // <tbody>
  //   <tr><td>Data 1</td><td>Data 2</td></tr>
  // </tbody>
  // </usa-table>`,
  // 'usa-tag': '<usa-tag>Tag</usa-tag>',
  // 'usa-list': `<usa-list>
  // <li>Item 1</li>
  // <li>Item 2</li>
  // <li>Item 3</li>
  // </usa-list>`,
  // 'usa-icon': '<usa-icon icon="check"></usa-icon>',
  // 'usa-collection': '<usa-collection></usa-collection>',
  // 'usa-summary-box': `<usa-summary-box heading="Key information">
  // <p>Summary content here.</p>
  // </usa-summary-box>`,

  // // Feedback
  // 'usa-alert': `<usa-alert variant="info">
  // <span slot="heading">Alert heading</span>
  // Alert message content.
  // </usa-alert>`,
  // 'usa-banner': '<usa-banner></usa-banner>',
  // 'usa-site-alert': `<usa-site-alert variant="info">
  // Important site-wide message.
  // </usa-site-alert>`,
  // 'usa-modal': `<usa-modal>
  // <span slot="heading">Modal Title</span>
  // <p>Modal content goes here.</p>
  // </usa-modal>`,
  // 'usa-tooltip': '<usa-tooltip content="Tooltip text">Hover me</usa-tooltip>',

  // // Layout
  // 'usa-accordion': `<usa-accordion>
  // <usa-accordion-item heading="Section 1">
  //   <p>Content for section 1</p>
  // </usa-accordion-item>
  // <usa-accordion-item heading="Section 2">
  //   <p>Content for section 2</p>
  // </usa-accordion-item>
  // </usa-accordion>`,
  // 'usa-step-indicator': '<usa-step-indicator current-step="1" total-steps="4"></usa-step-indicator>',
  // 'usa-process-list': '<usa-process-list></usa-process-list>',
  // 'usa-identifier': '<usa-identifier></usa-identifier>',
  // 'usa-prose': '<usa-prose><p>Prose content with proper typography.</p></usa-prose>',

  // // Patterns
  // 'usa-name-pattern': '<usa-name-pattern label="Full Name"></usa-name-pattern>',
  // 'usa-address-pattern': '<usa-address-pattern label="Mailing Address"></usa-address-pattern>',
  // 'usa-phone-number-pattern': '<usa-phone-number-pattern label="Phone Number"></usa-phone-number-pattern>',
  // 'usa-email-address-pattern': '<usa-email-address-pattern label="Email Address"></usa-email-address-pattern>',
  // 'usa-date-of-birth-pattern': '<usa-date-of-birth-pattern label="Date of Birth"></usa-date-of-birth-pattern>',
  // 'usa-ssn-pattern': '<usa-ssn-pattern label="Social Security Number"></usa-ssn-pattern>',

  // // Templates
  // 'usa-landing-template': `<usa-landing-template
  // hero-heading="Welcome"
  // hero-description="Your agency description here."
  // hero-cta-text="Learn More">
  // </usa-landing-template>`,
  // 'usa-form-template': '<usa-form-template heading="Form Title"></usa-form-template>',
  // 'usa-sign-in-template': '<usa-sign-in-template></usa-sign-in-template>',
  // 'usa-error-template': '<usa-error-template error-code="404"></usa-error-template>',
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
export const USWDS_WC_BUNDLE_VERSION = '2.5.7';

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
