/**
 * HTML Export Utilities
 * Clean HTML output for developer handoff
 */

export interface CleanOptions {
  removeGrapesAttributes?: boolean;
  removeEmptyAttributes?: boolean;
  formatOutput?: boolean;
  indentSize?: number;
}

/**
 * Regex patterns for GrapesJS attributes that should be removed.
 * Using patterns instead of a hardcoded list ensures we catch all
 * data-gjs-* attributes even if GrapesJS adds new ones.
 */
const GRAPES_ATTR_PATTERNS = [
  /\s+data-gjs-[a-z-]+(?:="[^"]*")?/gi,  // All data-gjs-* attributes
  /\s+data-highlightable(?:="[^"]*")?/gi, // data-highlightable (no gjs prefix)
  /\s+data-uswds-pt-id(?:="[^"]*")?/gi,   // Internal tracking IDs
];

/**
 * CSS classes added by GrapesJS that should be removed
 */
const GRAPES_CLASSES = [
  'gjs-selected',
  'gjs-hovered',
  'gjs-dashed',
  'gjs-comp-selected',
  'gjs-freezed',
];

/**
 * Clean HTML content by removing GrapesJS artifacts
 */
export function cleanExport(html: string, options: CleanOptions = {}): string {
  const {
    removeGrapesAttributes = true,
    removeEmptyAttributes = true,
    formatOutput = true,
    indentSize = 2,
  } = options;

  if (!html || !html.trim()) {
    return '';
  }

  let cleaned = html;

  // Fix usa-button slot content - the text attribute should become the slot content
  // since the web component uses slot content, not the text attribute
  cleaned = fixButtonSlotContent(cleaned);

  // Remove USWDS JS script tags - web components handle their own behavior
  // and USWDS JS conflicts with them (causes "Cannot read properties of null" errors)
  cleaned = removeUSWDSScripts(cleaned);

  if (removeGrapesAttributes) {
    cleaned = removeGrapesAttrs(cleaned);
  }

  if (removeEmptyAttributes) {
    cleaned = removeEmptyAttrs(cleaned);
  }

  // Remove GrapesJS generated IDs (pattern: single letter + alphanumeric with at least one digit)
  // This preserves meaningful IDs like "select", "my-input" while removing generated ones like "i1a2b"
  cleaned = cleaned.replace(/\s+id="[a-z](?=[a-z0-9]*\d)[a-z0-9]{3,7}"/gi, '');

  // Clean up GrapesJS classes
  cleaned = cleanGrapesClasses(cleaned);

  if (formatOutput) {
    cleaned = formatHtml(cleaned, indentSize);
  }

  return cleaned.trim();
}

/**
 * Fix usa-button slot content based on the text attribute.
 * The usa-button web component uses slot content, not a text attribute.
 * GrapesJS stores the text in the attribute, so we need to move it to slot content.
 *
 * Transforms: <usa-button text="page 2" ...>Click me</usa-button>
 * Into:       <usa-button text="page 2" ...>page 2</usa-button>
 */
function fixButtonSlotContent(html: string): string {
  // Match usa-button tags with a text attribute and capture the text value and old content
  // Pattern: <usa-button ... text="value" ...>old content</usa-button>
  return html.replace(
    /<usa-button([^>]*)\stext="([^"]*)"([^>]*)>([^<]*)<\/usa-button>/gi,
    (match, before, textValue, after, oldContent) => {
      // Use the text attribute value as the new slot content
      // Keep the text attribute for reference (web component ignores it anyway)
      return `<usa-button${before} text="${textValue}"${after}>${textValue}</usa-button>`;
    }
  );
}

/**
 * Remove USWDS JS script tags that conflict with web components.
 * The web components handle their own behavior (mobile menu, accordions, etc.)
 * and loading USWDS JS causes "Cannot read properties of null" errors.
 */
function removeUSWDSScripts(html: string): string {
  // Remove script tags that load uswds.min.js or uswds.js from any source
  // Matches: <script src="...uswds.min.js..."></script> or <script src="...uswds.js..."></script>
  return html.replace(/<script[^>]*src="[^"]*uswds(?:\.min)?\.js[^"]*"[^>]*><\/script>/gi, '');
}

/**
 * Remove data-gjs-* and other GrapesJS-related attributes using regex patterns.
 * This is more maintainable than a hardcoded list and catches all variants.
 */
function removeGrapesAttrs(html: string): string {
  let result = html;

  for (const pattern of GRAPES_ATTR_PATTERNS) {
    result = result.replace(pattern, '');
  }

  return result;
}

/**
 * Remove empty attributes like class=""
 */
function removeEmptyAttrs(html: string): string {
  // Remove empty class attributes
  let result = html.replace(/\s+class=""/g, '');

  // Remove empty style attributes
  result = result.replace(/\s+style=""/g, '');

  // Remove empty id attributes
  result = result.replace(/\s+id=""/g, '');

  // Remove empty href attributes
  result = result.replace(/\s+href=""/g, '');

  // Remove empty page-link attributes
  result = result.replace(/\s+page-link=""/g, '');

  return result;
}

/**
 * Remove GrapesJS-specific classes from class attributes
 */
function cleanGrapesClasses(html: string): string {
  return html.replace(/class="([^"]*)"/g, (match, classes: string) => {
    const cleanedClasses = classes
      .split(' ')
      .filter((cls: string) => {
        // Remove gjs-* classes
        if (cls.startsWith('gjs-')) return false;
        // Remove classes in our list
        if (GRAPES_CLASSES.includes(cls)) return false;
        // Keep non-empty classes
        return cls.trim().length > 0;
      })
      .join(' ')
      .trim();

    if (!cleanedClasses) {
      return ''; // Remove entire attribute if no classes left
    }

    return `class="${cleanedClasses}"`;
  });
}

/**
 * Simple HTML formatter
 */
function formatHtml(html: string, indentSize: number): string {
  const indent = ' '.repeat(indentSize);
  let result = '';
  let depth = 0;

  // Normalize whitespace
  html = html.replace(/>\s+</g, '><').trim();

  // Split by tags
  const tokens = html.split(/(<\/?[^>]+>)/g).filter(Boolean);

  for (const token of tokens) {
    const isClosingTag = token.startsWith('</');
    const isSelfClosing = token.endsWith('/>') || isSelfClosingTag(token);
    const isOpeningTag = token.startsWith('<') && !isClosingTag && !isSelfClosing;

    if (isClosingTag) {
      depth = Math.max(0, depth - 1);
    }

    const currentIndent = indent.repeat(depth);

    if (token.startsWith('<')) {
      result += '\n' + currentIndent + token;
    } else if (token.trim()) {
      // Text content
      result += token.trim();
    }

    if (isOpeningTag) {
      depth++;
    }
  }

  return result.trim();
}

/**
 * Check if a tag is self-closing (void element)
 */
function isSelfClosingTag(tag: string): boolean {
  const voidElements = [
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
  ];

  const tagName = tag.match(/<(\w+)/)?.[1]?.toLowerCase();
  return tagName ? voidElements.includes(tagName) : false;
}

/**
 * CDN URLs for USWDS resources
 * Imported from adapter package to ensure consistency
 */
import { CDN_URLS, CONDITIONAL_FIELDS_SCRIPT } from '@uswds-pt/adapter';

// Use the shared CDN URLs from adapter
const PREVIEW_CDN_URLS = CDN_URLS;

/**
 * Check if the HTML content uses conditional field reveal/hide functionality
 */
function hasConditionalFields(html: string): boolean {
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
function generateInitScript(): string {
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

    // Initialize usa-banner components - ensure toggle functionality works
    document.querySelectorAll('usa-banner').forEach(banner => {
      // Trigger update to ensure component is fully rendered
      if (typeof banner.requestUpdate === 'function') {
        banner.requestUpdate();
      }

      // Set up click handler for the banner toggle button as a fallback
      // The web component should handle this, but we add it as insurance
      setTimeout(() => {
        const button = banner.querySelector('.usa-banner__button');
        const content = banner.querySelector('.usa-banner__content');
        const header = banner.querySelector('.usa-banner__header');

        if (button && content && header) {
          // Check if handler is already attached by checking if clicking works
          // We'll add our own handler that won't conflict
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

/**
 * Generate a full HTML document with USWDS imports
 */
export function generateFullDocument(
  content: string,
  options: {
    title?: string;
    lang?: string;
  } = {}
): string {
  const {
    title = 'Prototype',
    lang = 'en',
  } = options;

  // Include conditional fields script only if content uses data-reveals or data-hides
  const conditionalScript = hasConditionalFields(content) ? `
  <!-- Conditional field show/hide functionality -->
  ${CONDITIONAL_FIELDS_SCRIPT}` : '';

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>

  <!-- USWDS Base CSS -->
  <link rel="stylesheet" href="${PREVIEW_CDN_URLS.uswdsCss}">
  <!-- USWDS Web Components CSS -->
  <link rel="stylesheet" href="${PREVIEW_CDN_URLS.uswdsWcCss}">
  <!-- USWDS Web Components JS (handles all component behavior - USWDS JS is NOT loaded as it conflicts) -->
  <script type="module" src="${PREVIEW_CDN_URLS.uswdsWcJs}"></script>
  <!-- Initialize web component properties after they render -->
  ${generateInitScript()}${conditionalScript}
</head>
<body>
${content ? indentContent(content, 2) : '  <!-- Add your content here -->'}
</body>
</html>`;
}

import { createDebugLogger } from '@uswds-pt/shared';

const debug = createDebugLogger('Export');

// Used in generateInitScript and preview functions
const DEBUG =
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).get('debug') === 'true' ||
    localStorage.getItem('uswds_pt_debug') === 'true');

/**
 * Open a preview of the HTML content in a new browser tab
 */
export function openPreviewInNewTab(html: string, title: string = 'Prototype Preview'): void {
  debug('Preview: input length =', html?.length);

  // Clean the HTML first
  const cleanedHtml = cleanExport(html);
  debug('Preview: cleaned length =', cleanedHtml?.length);

  // Store for debugging (accessible via window.__lastCleanedPreviewHtml)
  if (DEBUG) {
    (window as any).__lastCleanedPreviewHtml = cleanedHtml;
  }

  // Generate full document
  const fullDocument = generateFullDocument(cleanedHtml, { title });

  // Create a blob URL and open in new tab
  const blob = new Blob([fullDocument], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  // Open in new tab
  const newTab = window.open(url, '_blank');

  // Clean up the blob URL after a delay (give time for the page to load)
  if (newTab) {
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }
}

/**
 * Page data for multi-page preview
 */
export interface PageData {
  id: string;
  name: string;
  html: string;
}

/**
 * Generate page navigation script for multi-page preview
 */
function generatePageNavigationScript(): string {
  return `
  // Page navigation for multi-page preview
  function initPageNavigation() {
    const pages = document.querySelectorAll('[data-page-id]');
    if (pages.length === 0) return;

    // Show the first page by default, or the one in the URL hash
    function showPage(pageId) {
      pages.forEach(page => {
        if (page.getAttribute('data-page-id') === pageId) {
          page.style.display = '';
        } else {
          page.style.display = 'none';
        }
      });
    }

    // Get initial page from URL hash or show first page
    const hashPageId = window.location.hash.replace('#page-', '');
    const firstPageId = pages[0].getAttribute('data-page-id');
    const initialPageId = hashPageId && document.querySelector('[data-page-id="' + hashPageId + '"]')
      ? hashPageId
      : firstPageId;
    showPage(initialPageId);

    // Handle clicks on page links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[href^="#page-"]');
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        const pageId = href.replace('#page-', '');
        showPage(pageId);
        // Update URL hash without scrolling
        history.pushState(null, '', href);
      }
    });

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      const pageId = window.location.hash.replace('#page-', '') || firstPageId;
      showPage(pageId);
    });
  }

  initPageNavigation();`;
}

/**
 * Generate a full HTML document with multiple pages for preview
 */
export function generateMultiPageDocument(
  pages: PageData[],
  options: {
    title?: string;
    lang?: string;
  } = {}
): string {
  const {
    title = 'Prototype',
    lang = 'en',
  } = options;

  // Wrap each page in a container with data-page-id attribute
  const pagesHtml = pages.map(page => {
    const cleanedHtml = cleanExport(page.html);
    return `  <!-- Page: ${escapeHtml(page.name)} -->
  <div data-page-id="${escapeHtml(page.id)}" data-page-name="${escapeHtml(page.name)}">
${indentContent(cleanedHtml, 4)}
  </div>`;
  }).join('\n\n');

  // Generate init script with page navigation added
  const initScript = generateInitScript();
  const pageNavScript = `<script type="module">${generatePageNavigationScript()}</script>`;

  // Include conditional fields script only if any page uses data-reveals or data-hides
  const anyPageHasConditionalFields = pages.some(page => hasConditionalFields(page.html));
  const conditionalScript = anyPageHasConditionalFields ? `
  <!-- Conditional field show/hide functionality -->
  ${CONDITIONAL_FIELDS_SCRIPT}` : '';

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>

  <!-- USWDS Base CSS -->
  <link rel="stylesheet" href="${PREVIEW_CDN_URLS.uswdsCss}">
  <!-- USWDS Web Components CSS -->
  <link rel="stylesheet" href="${PREVIEW_CDN_URLS.uswdsWcCss}">
  <!-- USWDS Web Components JS (handles all component behavior - USWDS JS is NOT loaded as it conflicts) -->
  <script type="module" src="${PREVIEW_CDN_URLS.uswdsWcJs}"></script>
  <!-- Initialize web component properties after they render -->
  ${initScript}
  <!-- Page navigation for multi-page preview -->
  ${pageNavScript}${conditionalScript}
</head>
<body>
${pagesHtml}
</body>
</html>`;
}

/**
 * Open a multi-page preview in a new browser tab
 */
export function openMultiPagePreviewInNewTab(
  pages: PageData[],
  title: string = 'Prototype Preview'
): void {
  // Generate full document with all pages
  const fullDocument = generateMultiPageDocument(pages, { title });

  // Create a blob URL and open in new tab
  const blob = new Blob([fullDocument], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  // Open in new tab
  const newTab = window.open(url, '_blank');

  // Clean up the blob URL after a delay (give time for the page to load)
  if (newTab) {
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Indent content by a number of spaces
 */
function indentContent(content: string, spaces: number): string {
  const indent = ' '.repeat(spaces);
  return content
    .split('\n')
    .map((line) => indent + line)
    .join('\n');
}
