/**
 * Web Component Initialization Script
 * Generates the <script> tag that initializes USWDS web components
 * in exported/previewed HTML documents.
 */

/**
 * Check if the HTML content uses conditional field reveal/hide functionality
 */
export function hasConditionalFields(html: string): boolean {
  return /data-reveals=|data-hides=/.test(html);
}

/**
 * Generate initialization script for web components that need JS setup.
 * This script:
 * 1. Waits for web components to be defined
 * 2. Sets their properties to trigger Light DOM rendering
 *
 * Note: Mobile menu functionality is handled by the usa-header component itself,
 * not by USWDS JS. USWDS JS causes conflicts with web components.
 */
export function generateInitScript(): string {
  return `
<script type="module">
  // Wait for web components to be defined and DOM to be ready
  async function initializeComponents() {
    // Wait for custom elements to be defined (with timeout fallback)
    await Promise.all([
      customElements.whenDefined('usa-banner'),
      customElements.whenDefined('usa-header'),
      customElements.whenDefined('usa-footer'),
    ]).catch((err) => {
      console.warn('USWDS web components may not be fully loaded:', err);
    });

    // Initialize usa-banner components - ensure they start collapsed and toggle works.
    // Collapsed state is enforced by CSS (supplemental CSS hides .usa-banner__content
    // unless .usa-banner__header--expanded is present), so we only need JS for the
    // click toggle handler as a fallback in case the web component doesn't wire it.
    document.querySelectorAll('usa-banner').forEach(banner => {
      banner.removeAttribute('expanded');

      setTimeout(() => {
        const button = banner.querySelector('.usa-banner__button');
        const content = banner.querySelector('.usa-banner__content');
        const header = banner.querySelector('.usa-banner__header');

        if (button && content && header) {
          // Ensure collapsed DOM state on init
          button.setAttribute('aria-expanded', 'false');
          header.classList.remove('usa-banner__header--expanded');

          button.addEventListener('click', (e) => {
            e.preventDefault();
            const isExpanded = button.getAttribute('aria-expanded') === 'true';
            const newExpanded = !isExpanded;

            button.setAttribute('aria-expanded', String(newExpanded));

            if (newExpanded) {
              content.removeAttribute('hidden');
              header.classList.add('usa-banner__header--expanded');
            } else {
              content.setAttribute('hidden', '');
              header.classList.remove('usa-banner__header--expanded');
            }
          });
        }
      }, 200);
    });

    // Initialize usa-header components
    document.querySelectorAll('usa-header').forEach(header => {
      const count = parseInt(header.getAttribute('nav-count') || '4', 10);
      const navItems = [];

      for (let i = 1; i <= count; i++) {
        const label = header.getAttribute('nav' + i + '-label') || 'Link ' + i;
        const href = header.getAttribute('nav' + i + '-href') || '#';
        const current = header.hasAttribute('nav' + i + '-current');
        navItems.push({ label, href, current: current || undefined });
      }

      // Set the navItems property
      header.navItems = navItems;

      // Build secondary links from sec-count/sec1-label/sec1-href attributes
      var secCount = parseInt(header.getAttribute('sec-count') || '0', 10);
      var secondaryLinks = [];
      for (var j = 1; j <= secCount; j++) {
        secondaryLinks.push({
          label: header.getAttribute('sec' + j + '-label') || 'Link ' + j,
          href: header.getAttribute('sec' + j + '-href') || '#',
        });
      }
      if (secondaryLinks.length > 0) {
        header.secondaryLinks = secondaryLinks;
      }

      // Set other properties
      header.logoText = header.getAttribute('logo-text') || 'Site Name';
      header.logoHref = header.getAttribute('logo-href') || '/';

      const logoImageSrc = header.getAttribute('logo-image-src');
      if (logoImageSrc) {
        header.logoImageSrc = logoImageSrc;
        header.logoImageAlt = header.getAttribute('logo-image-alt') || '';
      }

      header.extended = header.hasAttribute('extended');
      header.showSearch = header.hasAttribute('show-search');

      const searchPlaceholder = header.getAttribute('search-placeholder');
      if (searchPlaceholder) {
        header.searchPlaceholder = searchPlaceholder;
      }

      // Request update if available
      if (typeof header.requestUpdate === 'function') {
        header.requestUpdate();
      }
    });

    // Initialize usa-footer components
    document.querySelectorAll('usa-footer').forEach(footer => {
      footer.variant = footer.getAttribute('variant') || 'medium';
      footer.agencyName = footer.getAttribute('agency-name') || '';
      footer.agencyUrl = footer.getAttribute('agency-url') || '#';

      if (typeof footer.requestUpdate === 'function') {
        footer.requestUpdate();
      }
    });

    // Helper to resolve href from page-link or normalize external URLs
    function resolveHref(element) {
      let href = element.getAttribute('href');
      const pageLink = element.getAttribute('page-link');
      const linkType = element.getAttribute('link-type');

      // If page-link is set, derive href from it
      if (pageLink && linkType === 'page') {
        href = '#page-' + pageLink;
        element.setAttribute('href', href);
      }
      // Normalize external URLs without protocol
      else if (href && linkType === 'external' && !href.startsWith('#') && !href.startsWith('/') && !href.includes('://')) {
        href = 'https://' + href;
        element.setAttribute('href', href);
      }

      return href;
    }

    // Initialize usa-button components
    document.querySelectorAll('usa-button').forEach(button => {
      // The usa-button web component uses slot content (not text attribute)
      // The slot content should already be moved to the inner button by the WC
      // We only apply text attribute as a FALLBACK if inner button is empty
      const textAttr = button.getAttribute('text');
      const applyTextFallback = () => {
        const inner = button.querySelector('button, a');
        if (inner) {
          // Only apply text attribute if inner is empty (slot content didn't work)
          const currentText = inner.textContent?.trim();
          if (!currentText && textAttr) {
            inner.textContent = textAttr;
          }
        }
      };
      // Wait a bit for web component to process slot content first
      setTimeout(applyTextFallback, 150);

      // Handle href/page-link
      const href = resolveHref(button);
      if (href && href !== '#') {
        button.href = href;
        // Ensure inner element is an anchor with correct href
        const innerButton = button.querySelector('button');
        const innerAnchor = button.querySelector('a');
        if (innerButton && !innerAnchor) {
          // Convert button to anchor
          const anchor = document.createElement('a');
          anchor.href = href;
          anchor.className = innerButton.className;
          anchor.textContent = textAttr || innerButton.textContent;
          innerButton.replaceWith(anchor);
        } else if (innerAnchor) {
          innerAnchor.href = href;
          if (textAttr) {
            innerAnchor.textContent = textAttr;
          }
        }
        if (typeof button.requestUpdate === 'function') {
          button.requestUpdate();
        }
      }
    });

    // Initialize usa-link components with href or page-link
    document.querySelectorAll('usa-link[href], usa-link[page-link]').forEach(link => {
      const href = resolveHref(link);
      if (href && href !== '#') {
        link.href = href;
        const innerAnchor = link.querySelector('a');
        if (innerAnchor) {
          innerAnchor.href = href;
        }
        if (typeof link.requestUpdate === 'function') {
          link.requestUpdate();
        }
      }
    });

    // Initialize form pattern components from attributes
    // Must run BEFORE usa-select init so generated selects get their options
    function esc(str) { return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

    document.querySelectorAll('usa-name-pattern').forEach(function(el) {
      var legend = el.getAttribute('legend') || 'Full Name';
      var showMiddle = el.getAttribute('show-middle') !== 'false';
      var showSuffix = el.getAttribute('show-suffix') !== 'false';
      var middleHtml = showMiddle ? '<usa-text-input label="Middle Name" name="middle-name"></usa-text-input>' : '';
      var suffixHtml = showSuffix ? '<usa-text-input label="Suffix" name="suffix" hint="e.g., Jr., Sr., III" width="sm" style="max-width: 8rem;"></usa-text-input>' : '';
      el.innerHTML = '<fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 0;"><legend class="usa-legend usa-legend--large">' + esc(legend) + '</legend><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;"><usa-text-input label="First Name" name="first-name" required></usa-text-input>' + middleHtml + '<usa-text-input label="Last Name" name="last-name" required></usa-text-input></div>' + suffixHtml + '</fieldset>';
    });

    document.querySelectorAll('usa-address-pattern').forEach(function(el) {
      var legend = el.getAttribute('legend') || 'Mailing Address';
      var showAddr2 = el.getAttribute('show-address-2') !== 'false';
      var addr2Html = showAddr2 ? '<usa-text-input label="Street Address Line 2" name="street-address-2" hint="Apartment, suite, unit, building, floor, etc."></usa-text-input>' : '';
      el.innerHTML = '<fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 0;"><legend class="usa-legend usa-legend--large">' + esc(legend) + '</legend><usa-text-input label="Street Address" name="street-address-1" required></usa-text-input>' + addr2Html + '<div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1rem;"><usa-text-input label="City" name="city" required></usa-text-input><usa-select label="State" name="state" required options-preset="us-states"></usa-select><usa-text-input label="ZIP Code" name="zip-code" inputmode="numeric" required></usa-text-input></div></fieldset>';
    });

    document.querySelectorAll('usa-phone-number-pattern').forEach(function(el) {
      var legend = el.getAttribute('legend') || 'Phone Number';
      var showType = el.getAttribute('show-phone-type') !== 'false';
      var typeHtml = showType ? '<fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 1rem 0 0;"><legend class="usa-legend">Phone type</legend><usa-radio label="Mobile" name="phone-type" value="mobile"></usa-radio><usa-radio label="Home" name="phone-type" value="home"></usa-radio><usa-radio label="Work" name="phone-type" value="work"></usa-radio></fieldset>' : '';
      el.innerHTML = '<fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 0;"><legend class="usa-legend usa-legend--large">' + esc(legend) + '</legend><usa-text-input label="Phone Number" name="phone" type="tel" hint="10-digit phone number, e.g., 202-555-0123" inputmode="tel" required></usa-text-input>' + typeHtml + '</fieldset>';
    });

    document.querySelectorAll('usa-email-address-pattern').forEach(function(el) {
      var legend = el.getAttribute('legend') || 'Email Address';
      var showConfirm = el.getAttribute('show-confirm') !== 'false';
      var confirmHtml = showConfirm ? '<usa-text-input label="Confirm Email Address" name="email-confirm" type="email" hint="Re-enter your email address" required></usa-text-input>' : '';
      el.innerHTML = '<fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 0;"><legend class="usa-legend usa-legend--large">' + esc(legend) + '</legend><usa-text-input label="Email Address" name="email" type="email" hint="Enter your email address" required></usa-text-input>' + confirmHtml + '</fieldset>';
    });

    document.querySelectorAll('usa-date-of-birth-pattern').forEach(function(el) {
      var legend = el.getAttribute('legend') || 'Date of Birth';
      var hint = el.getAttribute('hint') || 'For example: January 19, 2000';
      el.innerHTML = '<fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 0;"><legend class="usa-legend usa-legend--large">' + esc(legend) + '</legend><p class="usa-hint" style="margin: 0 0 0.5rem;">' + esc(hint) + '</p><div style="display: flex; gap: 1rem;"><usa-select label="Month" name="dob-month" required options-preset="months" style="min-width: 10rem;"></usa-select><usa-text-input label="Day" name="dob-day" inputmode="numeric" maxlength="2" required style="max-width: 5rem;"></usa-text-input><usa-text-input label="Year" name="dob-year" inputmode="numeric" minlength="4" maxlength="4" required style="max-width: 6rem;"></usa-text-input></div></fieldset>';
    });

    document.querySelectorAll('usa-ssn-pattern').forEach(function(el) {
      var legend = el.getAttribute('legend') || 'Social Security Number';
      var showAlert = el.getAttribute('show-alert') !== 'false';
      var alertHeading = el.getAttribute('alert-heading') || 'Why we need this';
      var alertText = el.getAttribute('alert-text') || 'We use your Social Security Number to verify your identity. Your information is protected and encrypted.';
      var alertHtml = showAlert ? '<usa-alert variant="info" heading="' + esc(alertHeading) + '" text="' + esc(alertText) + '" slim></usa-alert>' : '';
      el.innerHTML = '<fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 0;"><legend class="usa-legend usa-legend--large">' + esc(legend) + '</legend>' + alertHtml + '<usa-text-input label="Social Security Number" name="ssn" type="password" hint="Enter the 9 digits of your SSN" inputmode="numeric" maxlength="11" required style="max-width: 12rem; margin-top: 1rem;"></usa-text-input><usa-checkbox label="Show SSN" name="show-ssn" style="margin-top: 0.5rem;"></usa-checkbox></fieldset>';
    });

    // Initialize usa-select components with options
    const SELECT_PRESETS = {
      'us-states': [
        { value: 'AL', text: 'Alabama' }, { value: 'AK', text: 'Alaska' }, { value: 'AZ', text: 'Arizona' },
        { value: 'AR', text: 'Arkansas' }, { value: 'CA', text: 'California' }, { value: 'CO', text: 'Colorado' },
        { value: 'CT', text: 'Connecticut' }, { value: 'DE', text: 'Delaware' }, { value: 'FL', text: 'Florida' },
        { value: 'GA', text: 'Georgia' }, { value: 'HI', text: 'Hawaii' }, { value: 'ID', text: 'Idaho' },
        { value: 'IL', text: 'Illinois' }, { value: 'IN', text: 'Indiana' }, { value: 'IA', text: 'Iowa' },
        { value: 'KS', text: 'Kansas' }, { value: 'KY', text: 'Kentucky' }, { value: 'LA', text: 'Louisiana' },
        { value: 'ME', text: 'Maine' }, { value: 'MD', text: 'Maryland' }, { value: 'MA', text: 'Massachusetts' },
        { value: 'MI', text: 'Michigan' }, { value: 'MN', text: 'Minnesota' }, { value: 'MS', text: 'Mississippi' },
        { value: 'MO', text: 'Missouri' }, { value: 'MT', text: 'Montana' }, { value: 'NE', text: 'Nebraska' },
        { value: 'NV', text: 'Nevada' }, { value: 'NH', text: 'New Hampshire' }, { value: 'NJ', text: 'New Jersey' },
        { value: 'NM', text: 'New Mexico' }, { value: 'NY', text: 'New York' }, { value: 'NC', text: 'North Carolina' },
        { value: 'ND', text: 'North Dakota' }, { value: 'OH', text: 'Ohio' }, { value: 'OK', text: 'Oklahoma' },
        { value: 'OR', text: 'Oregon' }, { value: 'PA', text: 'Pennsylvania' }, { value: 'RI', text: 'Rhode Island' },
        { value: 'SC', text: 'South Carolina' }, { value: 'SD', text: 'South Dakota' }, { value: 'TN', text: 'Tennessee' },
        { value: 'TX', text: 'Texas' }, { value: 'UT', text: 'Utah' }, { value: 'VT', text: 'Vermont' },
        { value: 'VA', text: 'Virginia' }, { value: 'WA', text: 'Washington' }, { value: 'WV', text: 'West Virginia' },
        { value: 'WI', text: 'Wisconsin' }, { value: 'WY', text: 'Wyoming' }, { value: 'DC', text: 'District of Columbia' },
        { value: 'AS', text: 'American Samoa' }, { value: 'GU', text: 'Guam' }, { value: 'MP', text: 'Northern Mariana Islands' },
        { value: 'PR', text: 'Puerto Rico' }, { value: 'VI', text: 'U.S. Virgin Islands' },
      ],
      'countries': [
        { value: 'US', text: 'United States' }, { value: 'CA', text: 'Canada' }, { value: 'MX', text: 'Mexico' },
        { value: 'AF', text: 'Afghanistan' }, { value: 'AL', text: 'Albania' }, { value: 'DZ', text: 'Algeria' },
        { value: 'AR', text: 'Argentina' }, { value: 'AU', text: 'Australia' }, { value: 'AT', text: 'Austria' },
        { value: 'BD', text: 'Bangladesh' }, { value: 'BE', text: 'Belgium' }, { value: 'BR', text: 'Brazil' },
        { value: 'BG', text: 'Bulgaria' }, { value: 'KH', text: 'Cambodia' }, { value: 'CM', text: 'Cameroon' },
        { value: 'CL', text: 'Chile' }, { value: 'CN', text: 'China' }, { value: 'CO', text: 'Colombia' },
        { value: 'CR', text: 'Costa Rica' }, { value: 'HR', text: 'Croatia' }, { value: 'CU', text: 'Cuba' },
        { value: 'CZ', text: 'Czech Republic' }, { value: 'DK', text: 'Denmark' }, { value: 'DO', text: 'Dominican Republic' },
        { value: 'EC', text: 'Ecuador' }, { value: 'EG', text: 'Egypt' }, { value: 'SV', text: 'El Salvador' },
        { value: 'ET', text: 'Ethiopia' }, { value: 'FI', text: 'Finland' }, { value: 'FR', text: 'France' },
        { value: 'DE', text: 'Germany' }, { value: 'GH', text: 'Ghana' }, { value: 'GR', text: 'Greece' },
        { value: 'GT', text: 'Guatemala' }, { value: 'HT', text: 'Haiti' }, { value: 'HN', text: 'Honduras' },
        { value: 'HK', text: 'Hong Kong' }, { value: 'HU', text: 'Hungary' }, { value: 'IS', text: 'Iceland' },
        { value: 'IN', text: 'India' }, { value: 'ID', text: 'Indonesia' }, { value: 'IR', text: 'Iran' },
        { value: 'IQ', text: 'Iraq' }, { value: 'IE', text: 'Ireland' }, { value: 'IL', text: 'Israel' },
        { value: 'IT', text: 'Italy' }, { value: 'JM', text: 'Jamaica' }, { value: 'JP', text: 'Japan' },
        { value: 'JO', text: 'Jordan' }, { value: 'KE', text: 'Kenya' }, { value: 'KR', text: 'South Korea' },
        { value: 'KW', text: 'Kuwait' }, { value: 'LB', text: 'Lebanon' }, { value: 'MY', text: 'Malaysia' },
        { value: 'MA', text: 'Morocco' }, { value: 'NL', text: 'Netherlands' }, { value: 'NZ', text: 'New Zealand' },
        { value: 'NG', text: 'Nigeria' }, { value: 'NO', text: 'Norway' }, { value: 'PK', text: 'Pakistan' },
        { value: 'PA', text: 'Panama' }, { value: 'PE', text: 'Peru' }, { value: 'PH', text: 'Philippines' },
        { value: 'PL', text: 'Poland' }, { value: 'PT', text: 'Portugal' }, { value: 'RO', text: 'Romania' },
        { value: 'RU', text: 'Russia' }, { value: 'SA', text: 'Saudi Arabia' }, { value: 'SG', text: 'Singapore' },
        { value: 'ZA', text: 'South Africa' }, { value: 'ES', text: 'Spain' }, { value: 'SE', text: 'Sweden' },
        { value: 'CH', text: 'Switzerland' }, { value: 'TW', text: 'Taiwan' }, { value: 'TH', text: 'Thailand' },
        { value: 'TR', text: 'Turkey' }, { value: 'UA', text: 'Ukraine' }, { value: 'AE', text: 'United Arab Emirates' },
        { value: 'GB', text: 'United Kingdom' }, { value: 'VE', text: 'Venezuela' }, { value: 'VN', text: 'Vietnam' },
      ],
      'months': [
        { value: '01', text: 'January' }, { value: '02', text: 'February' }, { value: '03', text: 'March' },
        { value: '04', text: 'April' }, { value: '05', text: 'May' }, { value: '06', text: 'June' },
        { value: '07', text: 'July' }, { value: '08', text: 'August' }, { value: '09', text: 'September' },
        { value: '10', text: 'October' }, { value: '11', text: 'November' }, { value: '12', text: 'December' },
      ],
      'years': Array.from({ length: 100 }, (_, i) => {
        const year = new Date().getFullYear() - i;
        return { value: String(year), text: String(year) };
      }),
      'yes-no': [
        { value: 'yes', text: 'Yes' }, { value: 'no', text: 'No' },
      ],
    };

    function parseCustomOptions(text) {
      if (!text || !text.trim()) return [];
      return text.split('\\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
          if (line.includes('|')) {
            const parts = line.split('|');
            return { value: parts[0].trim(), text: parts.slice(1).join('|').trim() || parts[0].trim() };
          }
          return { value: line, text: line };
        });
    }

    document.querySelectorAll('usa-select').forEach(select => {
      const preset = select.getAttribute('options-preset') || 'manual';
      const customOptions = select.getAttribute('custom-options') || '';

      let options = [];

      if (preset === 'custom') {
        options = parseCustomOptions(customOptions);
      } else if (preset !== 'manual' && SELECT_PRESETS[preset]) {
        options = SELECT_PRESETS[preset];
      } else {
        // Manual mode - use individual option traits
        const count = parseInt(select.getAttribute('option-count') || '3', 10);
        for (let i = 1; i <= count; i++) {
          const text = select.getAttribute('option' + i + '-label') || 'Option ' + i;
          const value = select.getAttribute('option' + i + '-value') || 'option' + i;
          options.push({ value, text });
        }
      }

      // Populate the internal select
      const populateOptions = () => {
        const internalSelect = select.querySelector('select');
        if (internalSelect) {
          internalSelect.innerHTML = '';
          const defaultOpt = document.createElement('option');
          defaultOpt.value = '';
          defaultOpt.textContent = '- Select -';
          internalSelect.appendChild(defaultOpt);
          options.forEach(opt => {
            const optEl = document.createElement('option');
            optEl.value = opt.value;
            optEl.textContent = opt.text;
            internalSelect.appendChild(optEl);
          });
        } else {
          select.options = options;
          if (typeof select.requestUpdate === 'function') {
            select.requestUpdate();
          }
        }
      };

      populateOptions();
      setTimeout(populateOptions, 100);
      setTimeout(populateOptions, 300);
    });

    // Fix usa-checkbox duplicate ID issue and initialize hint text
    // When an ID is set on usa-checkbox for show/hide targeting, the web component
    // copies that ID to the internal input element, creating two elements with the same ID.
    // When clicking the label, the browser finds the wrapper first instead of the input.
    // Fix: Give the internal input a unique ID and update the label's "for" attribute.
    document.querySelectorAll('usa-checkbox').forEach(checkbox => {
      const wrapperId = checkbox.getAttribute('id');
      if (wrapperId) {
        const input = checkbox.querySelector('input[type="checkbox"]');
        const label = checkbox.querySelector('label');
        if (input && label) {
          const inputId = wrapperId + '-input';
          input.setAttribute('id', inputId);
          label.setAttribute('for', inputId);
        }
      }

      // Initialize hint text if present
      const hintText = checkbox.getAttribute('hint');
      if (hintText) {
        const label = checkbox.querySelector('.usa-checkbox__label');
        if (label && !label.querySelector('.usa-checkbox__label-description')) {
          const descSpan = document.createElement('span');
          descSpan.className = 'usa-checkbox__label-description';
          descSpan.textContent = hintText;
          label.appendChild(descSpan);
        }
      }
    });

    // Fix usa-radio duplicate ID issue (same pattern as checkbox)
    document.querySelectorAll('usa-radio').forEach(radio => {
      const wrapperId = radio.getAttribute('id');
      if (wrapperId) {
        const input = radio.querySelector('input[type="radio"]');
        const label = radio.querySelector('label');
        if (input && label) {
          const inputId = wrapperId + '-input';
          input.setAttribute('id', inputId);
          label.setAttribute('for', inputId);
        }
      }
    });

    // Initialize fieldset legends from the legend attribute
    document.querySelectorAll('fieldset[legend]').forEach(fieldset => {
      const legendText = fieldset.getAttribute('legend');
      if (legendText) {
        const legendEl = fieldset.querySelector('legend');
        if (legendEl) {
          legendEl.textContent = legendText;
        }
      }
    });

    // Add usa-form-group class to fieldsets for proper USWDS spacing
    // This class provides margin-top: 1.5rem which creates consistent spacing between form elements
    document.querySelectorAll('fieldset.usa-fieldset').forEach(fieldset => {
      if (!fieldset.classList.contains('usa-form-group')) {
        fieldset.classList.add('usa-form-group');
      }
    });

    // Initialize usa-table components from attributes
    document.querySelectorAll('usa-table').forEach(table => {
      var colCount = Math.min(10, Math.max(1, parseInt(table.getAttribute('col-count') || '3', 10)));
      var rowCount = Math.min(20, Math.max(1, parseInt(table.getAttribute('row-count') || '3', 10)));
      var caption = table.getAttribute('caption') || '';
      var isStriped = table.hasAttribute('striped');
      var isBorderless = table.hasAttribute('borderless');
      var isCompact = table.hasAttribute('compact');
      var stacked = table.getAttribute('stacked') || 'none';

      var className = 'usa-table';
      if (isStriped) className += ' usa-table--striped';
      if (isBorderless) className += ' usa-table--borderless';
      if (isCompact) className += ' usa-table--compact';
      if (stacked === 'header') className += ' usa-table--stacked-header';
      else if (stacked === 'default') className += ' usa-table--stacked';

      var headers = [];
      for (var c = 1; c <= colCount; c++) {
        headers.push(table.getAttribute('header' + c) || 'Column ' + c);
      }

      var rows = [];
      for (var r = 1; r <= rowCount; r++) {
        var row = [];
        for (var c2 = 1; c2 <= colCount; c2++) {
          row.push(table.getAttribute('row' + r + '-col' + c2) || '');
        }
        rows.push(row);
      }

      // Escape HTML in user-provided content to prevent XSS
      function esc(str) { return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

      var captionHtml = caption ? '<caption>' + esc(caption) + '</caption>' : '';
      var theadHtml = '<thead><tr>' + headers.map(function(h) { return '<th scope="col">' + esc(h) + '</th>'; }).join('') + '</tr></thead>';
      var tbodyHtml = '<tbody>' + rows.map(function(row) {
        return '<tr>' + row.map(function(cell, ci) {
          return ci === 0 ? '<th scope="row">' + esc(cell) + '</th>' : '<td>' + esc(cell) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody>';

      table.innerHTML = '<div class="usa-table-container--scrollable" tabindex="0"><table class="' + className + '">' + captionHtml + theadHtml + tbodyHtml + '</table></div>';
    });

    // Initialize usa-button-group button text and links from attributes
    // Need to wait for web component to render, then apply our values
    function initButtonGroup(buttonGroup) {
      const count = parseInt(buttonGroup.getAttribute('btn-count') || '2', 10);
      const ul = buttonGroup.querySelector('ul.usa-button-group');
      if (!ul) return false;

      const items = ul.querySelectorAll('li.usa-button-group__item');
      if (items.length === 0) return false;

      items.forEach((li, index) => {
        const btnIndex = index + 1;
        if (btnIndex <= count) {
          const text = buttonGroup.getAttribute('btn' + btnIndex + '-text') || 'Button ' + btnIndex;
          const variant = buttonGroup.getAttribute('btn' + btnIndex + '-variant') || '';
          const linkType = buttonGroup.getAttribute('btn' + btnIndex + '-link-type') || 'none';
          const pageLink = buttonGroup.getAttribute('btn' + btnIndex + '-page-link') || '';
          let href = buttonGroup.getAttribute('btn' + btnIndex + '-href') || '';

          // Resolve href from page-link if needed
          if (linkType === 'page' && pageLink) {
            href = '#page-' + pageLink;
          } else if (linkType === 'external' && href && !href.startsWith('#') && !href.startsWith('/') && !href.includes('://')) {
            href = 'https://' + href;
          }

          const existingButton = li.querySelector('button');
          const existingAnchor = li.querySelector('a');

          // Build class string
          let className = 'usa-button';
          if (variant && variant !== 'default') {
            className += ' usa-button--' + variant;
          }

          if (href && linkType !== 'none') {
            // Need an anchor element
            if (existingAnchor) {
              existingAnchor.href = href;
              existingAnchor.textContent = text;
              existingAnchor.className = className;
            } else if (existingButton) {
              // Convert button to anchor
              const anchor = document.createElement('a');
              anchor.href = href;
              anchor.textContent = text;
              anchor.className = className;
              existingButton.replaceWith(anchor);
            }
          } else {
            // Need a button element
            if (existingButton) {
              existingButton.textContent = text;
              existingButton.className = className;
            } else if (existingAnchor) {
              // Convert anchor to button
              const button = document.createElement('button');
              button.type = 'button';
              button.textContent = text;
              button.className = className;
              existingAnchor.replaceWith(button);
            }
          }
        }
      });
      return true;
    }

    document.querySelectorAll('usa-button-group').forEach(buttonGroup => {
      // Try immediately
      if (!initButtonGroup(buttonGroup)) {
        // If no buttons found, wait for render
        setTimeout(() => initButtonGroup(buttonGroup), 100);
      }
      // Also run again after a delay to ensure web component hasn't overwritten
      setTimeout(() => initButtonGroup(buttonGroup), 200);
      setTimeout(() => initButtonGroup(buttonGroup), 500);
    });
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeComponents);
  } else {
    initializeComponents();
  }
</script>`;
}
