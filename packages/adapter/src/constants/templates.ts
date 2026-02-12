/**
 * Default content templates for drag-and-drop
 */
export const DEFAULT_CONTENT: Record<string, string> = {
  // Basic Elements (wrapped in usa-prose so USWDS typography applies)
  'heading': '__FULL_HTML__<div class="usa-prose"><h2>Heading</h2></div>',
  'text': '__FULL_HTML__<div class="usa-prose"><p>This is a paragraph of text. Click to edit.</p></div>',

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
  'checkbox-group': `__FULL_HTML__<fieldset class="usa-fieldset usa-form-group">
  <legend class="usa-legend">Select your options</legend>
  <usa-checkbox label="Option 1" name="checkbox-group" value="option1"></usa-checkbox>
  <usa-checkbox label="Option 2" name="checkbox-group" value="option2"></usa-checkbox>
  <usa-checkbox label="Option 3" name="checkbox-group" value="option3"></usa-checkbox>
</fieldset>`,
  'usa-radio': '__FULL_HTML__<usa-radio label="Radio option" name="radio-group" value="option1"></usa-radio>',
  'radio-group': `__FULL_HTML__<fieldset class="usa-fieldset usa-form-group">
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
  'usa-table': '__FULL_HTML__<usa-table caption="Sample Table" striped col-count="3" row-count="3" header1="Name" header2="Role" header3="Status" row1-col1="Jane" row1-col2="Admin" row1-col3="Active" row2-col1="Bob" row2-col2="Editor" row2-col3="Active" row3-col1="Carol" row3-col2="Viewer" row3-col3="Pending"></usa-table>',
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
  'usa-in-page-navigation': '__FULL_HTML__<usa-in-page-navigation heading-level="h2" nav-title="On this page"></usa-in-page-navigation>',
  'usa-language-selector': '__FULL_HTML__<usa-language-selector variant="default" lang-count="3" lang1-label="English" lang1-value="en" lang2-label="Espa\u00f1ol" lang2-value="es" lang3-label="Fran\u00e7ais" lang3-value="fr"></usa-language-selector>',
  'usa-character-count': '__FULL_HTML__<usa-character-count label="Message" maxlength="200"></usa-character-count>',
  'usa-memorable-date': '__FULL_HTML__<usa-memorable-date legend="Date of birth" hint="For example: January 19 2000"></usa-memorable-date>',

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

  // Form Patterns - Single-element components with attribute-driven rebuild
  'usa-name-pattern': '<usa-name-pattern></usa-name-pattern>',
  'usa-address-pattern': '<usa-address-pattern></usa-address-pattern>',
  'usa-phone-number-pattern': '<usa-phone-number-pattern></usa-phone-number-pattern>',
  'usa-email-address-pattern': '<usa-email-address-pattern></usa-email-address-pattern>',
  'usa-date-of-birth-pattern': '<usa-date-of-birth-pattern></usa-date-of-birth-pattern>',
  'usa-ssn-pattern': '<usa-ssn-pattern></usa-ssn-pattern>',

  // Containers
  'form-container': `__FULL_HTML__<div class="grid-container">
  <form class="usa-form usa-form--large" action="#" method="post" novalidate style="min-height: 100px;">
  </form>
</div>`,

  'section-container': `__FULL_HTML__<section class="usa-section">
  <div class="grid-container">
    <div class="grid-row grid-gap">
      <div class="grid-col-12" style="min-height: 80px;"></div>
    </div>
  </div>
</section>`,

  // Grid Layout - USWDS Grid System
  // Wrapped in grid-container so they work standalone with proper max-width
  // Responsive 2-column: full width on mobile, 50/50 on tablet+
  'grid-2-col': `__FULL_HTML__<div class="grid-container">
  <div class="grid-row grid-gap">
    <div class="grid-col-12 tablet:grid-col-6" style="min-height: 80px;"></div>
    <div class="grid-col-12 tablet:grid-col-6" style="min-height: 80px;"></div>
  </div>
</div>`,

  // Responsive 3-column: full width on mobile, 33/33/33 on tablet+
  'grid-3-col': `__FULL_HTML__<div class="grid-container">
  <div class="grid-row grid-gap">
    <div class="grid-col-12 tablet:grid-col-4" style="min-height: 80px;"></div>
    <div class="grid-col-12 tablet:grid-col-4" style="min-height: 80px;"></div>
    <div class="grid-col-12 tablet:grid-col-4" style="min-height: 80px;"></div>
  </div>
</div>`,

  // Responsive 4-column: full width on mobile, 50/50 on tablet, 25/25/25/25 on desktop
  'grid-4-col': `__FULL_HTML__<div class="grid-container">
  <div class="grid-row grid-gap">
    <div class="grid-col-12 tablet:grid-col-6 desktop:grid-col-3" style="min-height: 80px;"></div>
    <div class="grid-col-12 tablet:grid-col-6 desktop:grid-col-3" style="min-height: 80px;"></div>
    <div class="grid-col-12 tablet:grid-col-6 desktop:grid-col-3" style="min-height: 80px;"></div>
    <div class="grid-col-12 tablet:grid-col-6 desktop:grid-col-3" style="min-height: 80px;"></div>
  </div>
</div>`,

  // Responsive sidebar left: full width stacked on mobile, sidebar/main on tablet+
  'grid-sidebar-left': `__FULL_HTML__<div class="grid-container">
  <div class="grid-row grid-gap">
    <div class="grid-col-12 tablet:grid-col-4" style="min-height: 100px;"></div>
    <div class="grid-col-12 tablet:grid-col-8" style="min-height: 100px;"></div>
  </div>
</div>`,

  // Responsive sidebar right: full width stacked on mobile, main/sidebar on tablet+
  'grid-sidebar-right': `__FULL_HTML__<div class="grid-container">
  <div class="grid-row grid-gap">
    <div class="grid-col-12 tablet:grid-col-8" style="min-height: 100px;"></div>
    <div class="grid-col-12 tablet:grid-col-4" style="min-height: 100px;"></div>
  </div>
</div>`,
};

/**
 * Starter templates for the template chooser (new prototype flow)
 */
export interface StarterTemplate {
  id: string;
  label: string;
  description: string;
  icon: string;
  content: string;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'signed-in',
    label: 'Signed In',
    description: 'Full page with authenticated header, navigation, and user account links',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v2H3V3zm0 16h18v2H3v-2z"/><path d="M5 7h14v10H5V7z" opacity="0.3"/><circle cx="17" cy="4" r="1.5"/><path d="M7 9h6v1H7zm0 2h10v1H7zm0 2h4v1H7z" opacity="0.5"/></svg>`,
    content: `__FULL_HTML__<div class="signed-in-template" data-template="signed-in">
  <usa-banner></usa-banner>
  <usa-header extended logo-text="Agency Name" logo-href="/" nav-count="3" nav1-label="Home" nav1-href="#" nav1-current nav2-label="Benefits" nav2-href="#" nav3-label="Records" nav3-href="#" sec-count="2" sec1-label="My Account" sec1-href="#" sec2-label="Sign Out" sec2-href="#" show-search show-skip-link="true"></usa-header>
  <main id="main-content" class="grid-container" style="padding: 2rem 0; min-height: 400px;">
    <div class="grid-row">
      <div class="grid-col-12"></div>
    </div>
  </main>
  <usa-footer variant="medium" agency-name="Agency Name" agency-url="#"></usa-footer>
  <usa-identifier domain="agency.gov" parent-agency="Department of Example" parent-agency-href="#"></usa-identifier>
</div>`,
  },
  {
    id: 'signed-out',
    label: 'Signed Out',
    description: 'Full page with public header, navigation, and Sign In link',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v2H3V3zm0 16h18v2H3v-2z"/><path d="M5 7h14v10H5V7z" opacity="0.3"/><path d="M7 9h6v1H7zm0 2h10v1H7zm0 2h4v1H7z" opacity="0.5"/></svg>`,
    content: `__FULL_HTML__<div class="signed-out-template" data-template="signed-out">
  <usa-banner></usa-banner>
  <usa-header logo-text="Agency Name" logo-href="/" nav-count="5" nav1-label="Home" nav1-href="#" nav1-current nav2-label="About" nav2-href="#" nav3-label="Services" nav3-href="#" nav4-label="Contact" nav4-href="#" nav5-label="Sign In" nav5-href="#" show-search show-skip-link="true"></usa-header>
  <main id="main-content" class="grid-container" style="padding: 2rem 0; min-height: 400px;">
    <div class="grid-row">
      <div class="grid-col-12"></div>
    </div>
  </main>
  <usa-footer variant="medium" agency-name="Agency Name" agency-url="#"></usa-footer>
  <usa-identifier domain="agency.gov" parent-agency="Department of Example" parent-agency-href="#"></usa-identifier>
</div>`,
  },
  {
    id: 'form',
    label: 'Form',
    description: 'Minimal header with a form content area for collecting information',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v2H3V3zm0 16h18v2H3v-2z"/><path d="M5 7h14v2H5V7zm0 4h14v2H5v-2zm0 4h8v2H5v-2z" opacity="0.5"/></svg>`,
    content: `__FULL_HTML__<div class="form-starter-template" data-template="form">
  <usa-banner></usa-banner>
  <usa-header logo-text="Agency Name" logo-href="/" nav-count="2" nav1-label="Home" nav1-href="#" nav2-label="Help" nav2-href="#" show-skip-link="true"></usa-header>
  <main id="main-content" class="grid-container" style="padding: 2rem 0;">
    <div style="max-width: 40rem;">
      <h1>Form Title</h1>
      <p class="usa-intro">Brief instructions for completing this form.</p>
      <form style="margin-top: 2rem;">
        <fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 0 0 2rem;">
          <legend class="usa-legend usa-legend--large">Section Title</legend>
        </fieldset>
        <usa-button text="Submit" variant="default"></usa-button>
      </form>
    </div>
  </main>
  <usa-footer variant="slim" agency-name="Agency Name" agency-url="#"></usa-footer>
  <usa-identifier domain="agency.gov" parent-agency="Department of Example" parent-agency-href="#"></usa-identifier>
</div>`,
  },
  {
    id: 'blank',
    label: 'Blank',
    description: 'Completely empty canvas to build from scratch',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3,2" opacity="0.5"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="1.5" opacity="0.4"/></svg>`,
    content: '',
  },
];
