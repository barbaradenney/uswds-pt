/**
 * USWDS Web Components Initialization
 *
 * Initializes USWDS web components after they're rendered in the DOM.
 * Some components (usa-header, usa-footer) need their properties set
 * programmatically to trigger proper rendering.
 */

// Preset option lists for usa-select
const SELECT_PRESETS: Record<string, Array<{ value: string; text: string }>> = {
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

/**
 * Initialize all USWDS web components in the document or a container
 */
export async function initializeUSWDSComponents(container: HTMLElement | Document = document): Promise<void> {
  // Wait for custom elements to be defined (with timeout fallback)
  try {
    await Promise.race([
      Promise.all([
        customElements.whenDefined('usa-banner'),
        customElements.whenDefined('usa-header'),
        customElements.whenDefined('usa-footer'),
      ]),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);
  } catch (err) {
    console.warn('USWDS web components may not be fully loaded:', err);
  }

  // Initialize usa-banner components
  container.querySelectorAll('usa-banner').forEach((banner: any) => {
    if (typeof banner.requestUpdate === 'function') {
      banner.requestUpdate();
    }
  });

  // Initialize usa-header components
  container.querySelectorAll('usa-header').forEach((header: any) => {
    const count = parseInt(header.getAttribute('nav-count') || '4', 10);
    const navItems = [];

    for (let i = 1; i <= count; i++) {
      const label = header.getAttribute(`nav${i}-label`) || `Link ${i}`;
      const href = header.getAttribute(`nav${i}-href`) || '#';
      const current = header.hasAttribute(`nav${i}-current`);
      navItems.push({ label, href, current: current || undefined });
    }

    // Set the navItems property
    header.navItems = navItems;

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
  container.querySelectorAll('usa-footer').forEach((footer: any) => {
    footer.variant = footer.getAttribute('variant') || 'medium';
    footer.agencyName = footer.getAttribute('agency-name') || '';
    footer.agencyUrl = footer.getAttribute('agency-url') || '#';

    if (typeof footer.requestUpdate === 'function') {
      footer.requestUpdate();
    }
  });

  // Initialize usa-button components with href
  container.querySelectorAll('usa-button').forEach((button: any) => {
    const textAttr = button.getAttribute('text');
    const href = resolveHref(button);

    // Apply text as fallback if inner content is empty
    setTimeout(() => {
      const inner = button.querySelector('button, a');
      if (inner) {
        const currentText = inner.textContent?.trim();
        if (!currentText && textAttr) {
          inner.textContent = textAttr;
        }
      }
    }, 150);

    if (href && href !== '#') {
      button.href = href;
      if (typeof button.requestUpdate === 'function') {
        button.requestUpdate();
      }
    }
  });

  // Initialize usa-link components
  container.querySelectorAll('usa-link[href], usa-link[page-link]').forEach((link: any) => {
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

  // Initialize usa-select components with options
  container.querySelectorAll('usa-select').forEach((select: any) => {
    initializeSelectOptions(select);
  });

  // Fix usa-checkbox duplicate ID issue and initialize hint text
  // When an ID is set on usa-checkbox for show/hide, the web component also
  // sets it on the internal input, causing duplicate IDs. We fix this by
  // giving the internal input a unique ID.
  container.querySelectorAll('usa-checkbox').forEach((checkbox: Element) => {
    const wrapperId = checkbox.getAttribute('id');
    if (wrapperId) {
      const input = checkbox.querySelector('input[type="checkbox"]');
      const label = checkbox.querySelector('label');
      if (input && label) {
        const inputId = `${wrapperId}-input`;
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

  // Fix usa-radio duplicate ID issue (same as checkbox)
  container.querySelectorAll('usa-radio').forEach((radio: Element) => {
    const wrapperId = radio.getAttribute('id');
    if (wrapperId) {
      const input = radio.querySelector('input[type="radio"]');
      const label = radio.querySelector('label');
      if (input && label) {
        const inputId = `${wrapperId}-input`;
        input.setAttribute('id', inputId);
        label.setAttribute('for', inputId);
      }
    }
  });

  // Initialize fieldset legends from the legend attribute
  container.querySelectorAll('fieldset[legend]').forEach((fieldset: Element) => {
    const legendText = fieldset.getAttribute('legend');
    if (legendText) {
      const legendEl = fieldset.querySelector('legend');
      if (legendEl) {
        legendEl.textContent = legendText;
      }
    }
  });

  // Add spacing between radios inside fieldsets
  // usa-radio elements need display:block and margin for proper spacing
  container.querySelectorAll('fieldset').forEach((fieldset: Element) => {
    const radios = fieldset.querySelectorAll('usa-radio');
    radios.forEach((radio: Element, index: number) => {
      const radioEl = radio as HTMLElement;
      radioEl.style.display = 'block';
      if (index > 0) {
        // Add margin-top to all radios except the first
        radioEl.style.marginTop = '0.75rem';
      }
    });
  });

  // Initialize usa-button-group button text from attributes
  // Need to wait for web component to render, then apply our values
  const initButtonGroup = (buttonGroup: Element) => {
    const count = parseInt(buttonGroup.getAttribute('btn-count') || '2', 10);
    const ul = buttonGroup.querySelector('ul.usa-button-group');
    if (!ul) return false;

    const buttons = ul.querySelectorAll('li.usa-button-group__item button');
    if (buttons.length === 0) return false;

    buttons.forEach((button: Element, index: number) => {
      const btnIndex = index + 1;
      if (btnIndex <= count) {
        const text = buttonGroup.getAttribute(`btn${btnIndex}-text`) || `Button ${btnIndex}`;
        const variant = buttonGroup.getAttribute(`btn${btnIndex}-variant`) || '';

        button.textContent = text;
        button.className = 'usa-button';
        if (variant && variant !== 'default') {
          button.classList.add(`usa-button--${variant}`);
        }
      }
    });
    return true;
  };

  container.querySelectorAll('usa-button-group').forEach((buttonGroup: Element) => {
    // Try immediately
    if (!initButtonGroup(buttonGroup)) {
      // If no buttons found, wait for render
      setTimeout(() => initButtonGroup(buttonGroup), 100);
    }
    // Also run again after a delay to ensure web component hasn't overwritten
    setTimeout(() => initButtonGroup(buttonGroup), 200);
    setTimeout(() => initButtonGroup(buttonGroup), 500);
  });

  // Initialize conditional show/hide fields
  initializeConditionalFields(container);
}

/**
 * Parse custom options from textarea format
 * Format: one option per line, either "value|label" or just "label" (value = label)
 */
function parseCustomOptions(text: string): Array<{ value: string; text: string }> {
  if (!text || !text.trim()) return [];

  return text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      if (line.includes('|')) {
        const [value, ...rest] = line.split('|');
        return { value: value.trim(), text: rest.join('|').trim() || value.trim() };
      }
      return { value: line, text: line };
    });
}

/**
 * Initialize usa-select component options based on preset or custom options
 */
function initializeSelectOptions(select: HTMLElement): void {
  const preset = select.getAttribute('options-preset') || 'manual';
  const customOptions = select.getAttribute('custom-options') || '';

  let options: Array<{ value: string; text: string }> = [];

  if (preset === 'custom') {
    options = parseCustomOptions(customOptions);
  } else if (preset !== 'manual' && SELECT_PRESETS[preset]) {
    options = SELECT_PRESETS[preset];
  } else {
    // Manual mode - use individual option traits
    const count = parseInt(select.getAttribute('option-count') || '3', 10);
    for (let i = 1; i <= count; i++) {
      const text = select.getAttribute(`option${i}-label`) || `Option ${i}`;
      const value = select.getAttribute(`option${i}-value`) || `option${i}`;
      options.push({ value, text });
    }
  }

  // Wait for the component to render, then populate the internal select
  const populateOptions = () => {
    const internalSelect = select.querySelector('select');
    if (internalSelect) {
      // Clear existing options
      internalSelect.innerHTML = '';

      // Add default empty option
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '- Select -';
      internalSelect.appendChild(defaultOpt);

      // Add all options
      options.forEach(({ value, text }) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = text;
        internalSelect.appendChild(opt);
      });
    } else {
      // Fallback: set the options property on the web component
      (select as any).options = options;
      if (typeof (select as any).requestUpdate === 'function') {
        (select as any).requestUpdate();
      }
    }
  };

  // Try immediately, then retry with delays if needed
  populateOptions();
  setTimeout(populateOptions, 100);
  setTimeout(populateOptions, 300);
}

/**
 * Initialize conditional show/hide fields
 * Handles checkboxes and radios with data-reveals and data-hides attributes
 */
function initializeConditionalFields(container: HTMLElement | Document): void {
  // Get the root element to search in (could be container or document)
  const root = container instanceof Document ? container : container.ownerDocument || document;

  // Helper to get elements from comma-separated IDs
  const getElementsFromIds = (idString: string | null): HTMLElement[] => {
    if (!idString) return [];
    return idString.split(',')
      .map(id => id.trim())
      .filter(id => id)
      .map(id => root.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
  };

  // Find all triggers with data-reveals or data-hides
  container.querySelectorAll('[data-reveals], [data-hides]').forEach((trigger: Element) => {
    // Skip if already initialized
    if ((trigger as any)._conditionalInit) return;
    (trigger as any)._conditionalInit = true;

    const revealsIds = trigger.getAttribute('data-reveals');
    const hidesIds = trigger.getAttribute('data-hides');
    const revealsTargets = getElementsFromIds(revealsIds);
    const hidesTargets = getElementsFromIds(hidesIds);

    if (revealsTargets.length === 0 && hidesTargets.length === 0) return;

    const name = trigger.getAttribute('name');
    const tagName = trigger.tagName.toLowerCase();
    const isRadio = tagName === 'usa-radio';
    const isCheckbox = tagName === 'usa-checkbox';

    // Helper to show an element
    const showElement = (target: HTMLElement) => {
      target.removeAttribute('hidden');
      target.setAttribute('aria-hidden', 'false');
      target.style.display = '';
    };

    // Helper to hide an element
    const hideElement = (target: HTMLElement) => {
      target.setAttribute('hidden', '');
      target.setAttribute('aria-hidden', 'true');
      target.style.display = 'none';
    };

    // Set initial state: "reveals" targets start hidden, "hides" targets start visible
    revealsTargets.forEach(target => hideElement(target));
    hidesTargets.forEach(target => showElement(target));

    const updateVisibility = () => {
      // Check both the internal input AND the custom element's checked attribute
      // Web components may not have synced the internal input yet
      const input = trigger.querySelector('input') as HTMLInputElement | null;
      const elementChecked = trigger.hasAttribute('checked');
      const inputChecked = input?.checked ?? false;
      const isChecked = elementChecked || inputChecked;

      revealsTargets.forEach(target => {
        if (isChecked) {
          showElement(target);
        } else {
          hideElement(target);
        }
      });

      hidesTargets.forEach(target => {
        if (isChecked) {
          hideElement(target);
        } else {
          showElement(target);
        }
      });
    };

    if (isRadio && name) {
      // For radios, listen to all radios in the same group
      container.querySelectorAll(`usa-radio[name="${name}"]`).forEach((radio: Element) => {
        if (!(radio as any)._conditionalListener) {
          (radio as any)._conditionalListener = true;
          radio.addEventListener('change', updateVisibility);
        }
      });
    } else if (isCheckbox) {
      trigger.addEventListener('change', updateVisibility);
    }

    // Set initial visibility
    updateVisibility();
  });
}

/**
 * Resolve href from page-link attribute or normalize external URLs
 */
function resolveHref(element: Element): string | null {
  let href = element.getAttribute('href');
  const pageLink = element.getAttribute('page-link');
  const linkType = element.getAttribute('link-type');

  // If page-link is set, derive href from it
  if (pageLink && linkType === 'page') {
    href = `#page-${pageLink}`;
    element.setAttribute('href', href);
  }
  // Normalize external URLs without protocol
  else if (href && linkType === 'external' && !href.startsWith('#') && !href.startsWith('/') && !href.includes('://')) {
    href = 'https://' + href;
    element.setAttribute('href', href);
  }

  return href;
}
