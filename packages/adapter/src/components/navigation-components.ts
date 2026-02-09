/**
 * Navigation Components
 *
 * Registers navigation/header/footer components:
 * usa-header, usa-footer, usa-in-page-navigation, usa-language-selector,
 * usa-character-count, usa-memorable-date
 */

import type { ComponentRegistration, UnifiedTrait } from './shared-utils.js';
import {
  coerceBoolean,
} from './shared-utils.js';

/**
 * Registry interface to avoid circular imports.
 */
interface RegistryLike {
  register(registration: ComponentRegistration): void;
}

export function registerNavigationComponents(registry: RegistryLike): void {

/**
 * WORKAROUND: Some USWDS web components block re-renders after USWDS JavaScript initializes.
 *
 * The USWDS JavaScript (header mobile menu, accordion behaviors, etc.) sets up event
 * listeners and modifies the DOM. After this initialization, the Lit component's
 * shouldUpdate may return false to prevent the USWDS JavaScript state from being lost.
 *
 * This means we need to manipulate the DOM directly for visual changes.
 * This helper function encapsulates this pattern and ensures we try both
 * the Lit way (requestUpdate) and direct DOM manipulation as a fallback.
 *
 * Currently used by:
 * - usa-header: USWDS mobile menu JavaScript can block Lit updates
 *
 * @param element The web component element
 * @param callback Function to perform direct DOM manipulation
 */
function updateWithFallback(
  element: HTMLElement,
  callback: () => void
): void {
  // First, try to update via Lit
  if (typeof (element as any).requestUpdate === 'function') {
    (element as any).requestUpdate();
  }

  // Then, perform direct DOM manipulation as a fallback
  // This ensures the visual state is correct even if Lit's update is blocked
  callback();

  // Schedule another requestUpdate in case the component becomes responsive
  setTimeout(() => {
    if (typeof (element as any).requestUpdate === 'function') {
      (element as any).requestUpdate();
    }
  }, 50);
}

/**
 * Helper function to update/create/remove skip link for header
 * The skip link is inserted as a sibling before the usa-header element
 */
function updateHeaderSkipLink(element: HTMLElement): void {
  const showSkipLink = element.getAttribute('show-skip-link') !== 'false';
  const skipLinkText = element.getAttribute('skip-link-text') || 'Skip to main content';
  const skipLinkHref = element.getAttribute('skip-link-href') || '#main-content';

  // Find existing skip link (look for sibling with data-header-skip-link attribute)
  const existingSkipLink = element.previousElementSibling?.hasAttribute('data-header-skip-link')
    ? element.previousElementSibling as HTMLElement
    : null;

  if (showSkipLink) {
    if (existingSkipLink) {
      // Update existing skip link
      existingSkipLink.textContent = skipLinkText;
      existingSkipLink.setAttribute('href', skipLinkHref);
    } else {
      // Create new skip link
      const skipLink = document.createElement('a');
      skipLink.className = 'usa-skipnav';
      skipLink.setAttribute('href', skipLinkHref);
      skipLink.setAttribute('data-header-skip-link', 'true');
      skipLink.textContent = skipLinkText;

      // Insert before the header element
      element.parentNode?.insertBefore(skipLink, element);
    }
  } else {
    // Remove skip link if it exists
    if (existingSkipLink) {
      existingSkipLink.remove();
    }
  }
}

/**
 * Helper function to rebuild header nav items array from attributes
 */
function rebuildHeaderNavItems(element: HTMLElement, count: number): void {
  const navItems: Array<{ label: string; href: string; current?: boolean }> = [];

  for (let i = 1; i <= count; i++) {
    const label = element.getAttribute(`nav${i}-label`) || `Link ${i}`;
    const href = element.getAttribute(`nav${i}-href`) || '#';
    const current = element.hasAttribute(`nav${i}-current`);

    navItems.push({ label, href, current: current || undefined });
  }

  // Set the navItems property on the Lit component
  (element as any).navItems = navItems;

  if (typeof (element as any).requestUpdate === 'function') {
    (element as any).requestUpdate();
  }
}

/**
 * Initialize header nav items with retry logic
 * Waits for the Lit component to be ready before setting navItems
 */
function initHeaderNavItems(element: HTMLElement): void {
  const count = parseInt(element.getAttribute('nav-count') || '4', 10);

  // Build nav items from attributes
  const navItems: Array<{ label: string; href: string; current?: boolean }> = [];
  for (let i = 1; i <= count; i++) {
    const label = element.getAttribute(`nav${i}-label`) || `Link ${i}`;
    const href = element.getAttribute(`nav${i}-href`) || '#';
    const current = element.hasAttribute(`nav${i}-current`);
    navItems.push({ label, href, current: current || undefined });
  }

  const trySetNavItems = (attempt: number = 0): void => {
    // Set navItems property directly
    (element as any).navItems = navItems;

    // Also try to trigger update if available
    if (typeof (element as any).requestUpdate === 'function') {
      (element as any).requestUpdate();
    }

    // If component isn't ready yet, retry
    if (!(element as any).navItems?.length && attempt < 30) {
      setTimeout(() => trySetNavItems(attempt + 1), 100);
    }
  };

  // Try immediately, then retry
  trySetNavItems();

  // Also try after a longer delay to catch late initialization
  setTimeout(() => {
    if (!(element as any).navItems?.length) {
      (element as any).navItems = navItems;
      if (typeof (element as any).requestUpdate === 'function') {
        (element as any).requestUpdate();
      }
    }
  }, 500);
}

/**
 * Helper function to create header nav item traits
 */
function createHeaderNavItemTrait(
  index: number,
  type: 'label' | 'href' | 'current'
): UnifiedTrait {
  const attrName = `nav${index}-${type}`;

  // Visibility function - only show if index <= nav-count
  const visibleFn = (component: any) => {
    try {
      if (!component) return true;
      const count = parseInt(component.get?.('attributes')?.['nav-count'] || '4', 10);
      return index <= count;
    } catch {
      return true;
    }
  };

  if (type === 'current') {
    return {
      definition: {
        name: attrName,
        label: `Nav ${index} Current`,
        type: 'checkbox',
        default: false,
        visible: visibleFn,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const isCurrent = coerceBoolean(value);
          if (isCurrent) {
            element.setAttribute(attrName, '');
          } else {
            element.removeAttribute(attrName);
          }
          const count = parseInt(element.getAttribute('nav-count') || '4', 10);
          rebuildHeaderNavItems(element, count);
        },
        getValue: (element: HTMLElement) => {
          return element.hasAttribute(attrName);
        },
      },
    };
  }

  const isLabel = type === 'label';
  const defaultValue = isLabel ? `Link ${index}` : '#';

  return {
    definition: {
      name: attrName,
      label: `Nav ${index} ${isLabel ? 'Label' : 'URL'}`,
      type: 'text',
      default: defaultValue,
      placeholder: isLabel ? 'Link text' : 'URL',
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: any) => {
        element.setAttribute(attrName, value || '');
        const count = parseInt(element.getAttribute('nav-count') || '4', 10);
        rebuildHeaderNavItems(element, count);
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) ?? defaultValue;
      },
    },
  };
}

/**
 * Helper function to rebuild header secondary links array from attributes
 */
function rebuildHeaderSecondaryLinks(element: HTMLElement, count: number): void {
  const links: Array<{ label: string; href: string }> = [];

  for (let i = 1; i <= count; i++) {
    const label = element.getAttribute(`sec${i}-label`) || `Link ${i}`;
    const href = element.getAttribute(`sec${i}-href`) || '#';
    links.push({ label, href });
  }

  (element as any).secondaryLinks = links;

  if (typeof (element as any).requestUpdate === 'function') {
    (element as any).requestUpdate();
  }
}

/**
 * Initialize header secondary links with retry logic
 */
function initHeaderSecondaryLinks(element: HTMLElement): void {
  const count = parseInt(element.getAttribute('sec-count') || '0', 10);
  if (count === 0) return;

  const links: Array<{ label: string; href: string }> = [];
  for (let i = 1; i <= count; i++) {
    const label = element.getAttribute(`sec${i}-label`) || `Link ${i}`;
    const href = element.getAttribute(`sec${i}-href`) || '#';
    links.push({ label, href });
  }

  const trySetLinks = (attempt: number = 0): void => {
    (element as any).secondaryLinks = links;

    if (typeof (element as any).requestUpdate === 'function') {
      (element as any).requestUpdate();
    }

    if (!(element as any).secondaryLinks?.length && attempt < 30) {
      setTimeout(() => trySetLinks(attempt + 1), 100);
    }
  };

  trySetLinks();

  setTimeout(() => {
    if (!(element as any).secondaryLinks?.length) {
      (element as any).secondaryLinks = links;
      if (typeof (element as any).requestUpdate === 'function') {
        (element as any).requestUpdate();
      }
    }
  }, 500);
}

/**
 * Helper function to create header secondary link traits
 */
function createHeaderSecondaryLinkTrait(
  index: number,
  type: 'label' | 'href'
): UnifiedTrait {
  const attrName = `sec${index}-${type}`;

  const visibleFn = (component: any) => {
    try {
      if (!component) return false;
      const count = parseInt(component.get?.('attributes')?.['sec-count'] || '0', 10);
      return index <= count;
    } catch {
      return false;
    }
  };

  const isLabel = type === 'label';
  const defaultValue = isLabel ? `Link ${index}` : '#';

  return {
    definition: {
      name: attrName,
      label: `Sec ${index} ${isLabel ? 'Label' : 'URL'}`,
      type: 'text',
      default: defaultValue,
      placeholder: isLabel ? 'Link text' : 'URL',
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: any) => {
        element.setAttribute(attrName, value || '');
        const count = parseInt(element.getAttribute('sec-count') || '0', 10);
        rebuildHeaderSecondaryLinks(element, count);
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) ?? defaultValue;
      },
    },
  };
}

/**
 * USA Header Component
 *
 * Site header with logo, navigation, and optional search.
 */
registry.register({
  tagName: 'usa-header',
  droppable: false,

  traits: {
    // Skip Link - Include skip navigation for accessibility
    'show-skip-link': {
      definition: {
        name: 'show-skip-link',
        label: 'Include Skip Link',
        type: 'checkbox',
        default: true,
        category: { id: 'accessibility', label: 'Accessibility' },
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const showSkipLink = value === true || value === 'true';
          element.setAttribute('show-skip-link', showSkipLink ? 'true' : 'false');
          updateHeaderSkipLink(element);
        },
        getValue: (element: HTMLElement) => {
          const attr = element.getAttribute('show-skip-link');
          return attr === 'true' || attr === null; // default true
        },
        onInit: (element: HTMLElement, value: any) => {
          const showSkipLink = value === true || value === 'true' || value === undefined;
          if (showSkipLink) {
            // Delay to ensure element is in DOM
            setTimeout(() => updateHeaderSkipLink(element), 100);
          }
        },
      },
    },

    'skip-link-text': {
      definition: {
        name: 'skip-link-text',
        label: 'Skip Link Text',
        type: 'text',
        default: 'Skip to main content',
        placeholder: 'Skip to main content',
        visible: (component: any) => {
          try {
            if (!component) return false;
            const showSkipLink = component.get?.('attributes')?.['show-skip-link'];
            return showSkipLink === true || showSkipLink === 'true' || showSkipLink === undefined;
          } catch {
            return true;
          }
        },
        category: { id: 'accessibility', label: 'Accessibility' },
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const text = value || 'Skip to main content';
          element.setAttribute('skip-link-text', text);
          updateHeaderSkipLink(element);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('skip-link-text') || 'Skip to main content';
        },
      },
    },

    'skip-link-href': {
      definition: {
        name: 'skip-link-href',
        label: 'Skip Link Target',
        type: 'text',
        default: '#main-content',
        placeholder: '#main-content',
        visible: (component: any) => {
          try {
            if (!component) return false;
            const showSkipLink = component.get?.('attributes')?.['show-skip-link'];
            return showSkipLink === true || showSkipLink === 'true' || showSkipLink === undefined;
          } catch {
            return true;
          }
        },
        category: { id: 'accessibility', label: 'Accessibility' },
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const href = value || '#main-content';
          element.setAttribute('skip-link-href', href);
          updateHeaderSkipLink(element);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('skip-link-href') || '#main-content';
        },
      },
    },

    // Logo Text
    'logo-text': {
      definition: {
        name: 'logo-text',
        label: 'Logo Text',
        type: 'text',
        default: 'Site Name',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const text = value || 'Site Name';
          element.setAttribute('logo-text', text);
          (element as any).logoText = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).logoText || element.getAttribute('logo-text') || 'Site Name';
        },
        // Also initialize nav items and secondary links when logo-text initializes (backup entry point)
        onInit: (element: HTMLElement, value: any) => {
          const text = value || 'Site Name';
          (element as any).logoText = text;
          // Initialize nav items and secondary links as well
          initHeaderNavItems(element);
          initHeaderSecondaryLinks(element);
        },
      },
    },

    // Logo URL
    'logo-href': {
      definition: {
        name: 'logo-href',
        label: 'Logo URL',
        type: 'text',
        default: '/',
        placeholder: 'URL when logo is clicked',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const href = value || '/';
          element.setAttribute('logo-href', href);
          (element as any).logoHref = href;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).logoHref || element.getAttribute('logo-href') || '/';
        },
      },
    },

    // Logo Image Source (optional)
    'logo-image-src': {
      definition: {
        name: 'logo-image-src',
        label: 'Logo Image URL',
        type: 'text',
        default: '',
        placeholder: 'Optional image URL',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          if (value) {
            element.setAttribute('logo-image-src', value);
            (element as any).logoImageSrc = value;
          } else {
            element.removeAttribute('logo-image-src');
            (element as any).logoImageSrc = '';
          }
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).logoImageSrc || element.getAttribute('logo-image-src') || '';
        },
      },
    },

    // Logo Image Alt Text
    'logo-image-alt': {
      definition: {
        name: 'logo-image-alt',
        label: 'Logo Image Alt',
        type: 'text',
        default: '',
        placeholder: 'Alt text for logo image',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          if (value) {
            element.setAttribute('logo-image-alt', value);
            (element as any).logoImageAlt = value;
          } else {
            element.removeAttribute('logo-image-alt');
            (element as any).logoImageAlt = '';
          }
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).logoImageAlt || element.getAttribute('logo-image-alt') || '';
        },
      },
    },

    // Extended header style (uses workaround for USWDS init blocking)
    extended: {
      definition: {
        name: 'extended',
        label: 'Extended Style',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const isExtended = coerceBoolean(value);
          if (isExtended) {
            element.setAttribute('extended', '');
          } else {
            element.removeAttribute('extended');
          }
          (element as any).extended = isExtended;

          // Use workaround helper for header DOM updates
          updateWithFallback(element, () => {
            const header = element.querySelector('.usa-header');
            if (header) {
              header.classList.toggle('usa-header--extended', isExtended);
              header.classList.toggle('usa-header--basic', !isExtended);
            }
          });
        },
        getValue: (element: HTMLElement) => {
          return (element as any).extended || element.hasAttribute('extended');
        },
      },
    },

    // Show Search - triggers Lit component re-render
    'show-search': {
      definition: {
        name: 'show-search',
        label: 'Show Search',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const showSearch = coerceBoolean(value);
          // Set the attribute (for persistence)
          if (showSearch) {
            element.setAttribute('show-search', '');
          } else {
            element.removeAttribute('show-search');
          }
          // Set the Lit property directly to trigger re-render
          (element as any).showSearch = showSearch;
          // Request an update from the Lit component
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).showSearch || element.hasAttribute('show-search');
        },
        onInit: (element: HTMLElement, value: any) => {
          const showSearch = coerceBoolean(value);
          (element as any).showSearch = showSearch;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },

    // Search Placeholder
    'search-placeholder': {
      definition: {
        name: 'search-placeholder',
        label: 'Search Placeholder',
        type: 'text',
        default: 'Search',
        placeholder: 'Search placeholder text',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const placeholder = value || 'Search';
          element.setAttribute('search-placeholder', placeholder);
          (element as any).searchPlaceholder = placeholder;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).searchPlaceholder || element.getAttribute('search-placeholder') || 'Search';
        },
      },
    },

    // Navigation item count
    'nav-count': {
      definition: {
        name: 'nav-count',
        label: 'Number of Nav Items',
        type: 'select',
        default: '4',
        options: [
          { id: '1', label: '1 Item' },
          { id: '2', label: '2 Items' },
          { id: '3', label: '3 Items' },
          { id: '4', label: '4 Items' },
          { id: '5', label: '5 Items' },
          { id: '6', label: '6 Items' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const count = parseInt(value || '4', 10);
          element.setAttribute('nav-count', String(count));
          rebuildHeaderNavItems(element, count);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('nav-count') ?? '4';
        },
        onInit: (element: HTMLElement, _value: any) => {
          // Use retry logic to wait for Lit component to be ready
          initHeaderNavItems(element);
        },
      },
    },

    // Nav item traits (up to 6)
    'nav1-label': createHeaderNavItemTrait(1, 'label'),
    'nav1-href': createHeaderNavItemTrait(1, 'href'),
    'nav1-current': createHeaderNavItemTrait(1, 'current'),
    'nav2-label': createHeaderNavItemTrait(2, 'label'),
    'nav2-href': createHeaderNavItemTrait(2, 'href'),
    'nav2-current': createHeaderNavItemTrait(2, 'current'),
    'nav3-label': createHeaderNavItemTrait(3, 'label'),
    'nav3-href': createHeaderNavItemTrait(3, 'href'),
    'nav3-current': createHeaderNavItemTrait(3, 'current'),
    'nav4-label': createHeaderNavItemTrait(4, 'label'),
    'nav4-href': createHeaderNavItemTrait(4, 'href'),
    'nav4-current': createHeaderNavItemTrait(4, 'current'),
    'nav5-label': createHeaderNavItemTrait(5, 'label'),
    'nav5-href': createHeaderNavItemTrait(5, 'href'),
    'nav5-current': createHeaderNavItemTrait(5, 'current'),
    'nav6-label': createHeaderNavItemTrait(6, 'label'),
    'nav6-href': createHeaderNavItemTrait(6, 'href'),
    'nav6-current': createHeaderNavItemTrait(6, 'current'),

    // Secondary (utility) link count
    'sec-count': {
      definition: {
        name: 'sec-count',
        label: 'Secondary Links',
        type: 'select',
        default: '0',
        options: [
          { id: '0', label: 'None' },
          { id: '1', label: '1 Link' },
          { id: '2', label: '2 Links' },
          { id: '3', label: '3 Links' },
          { id: '4', label: '4 Links' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const count = parseInt(value || '0', 10);
          element.setAttribute('sec-count', String(count));
          rebuildHeaderSecondaryLinks(element, count);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('sec-count') ?? '0';
        },
        onInit: (element: HTMLElement, _value: any) => {
          initHeaderSecondaryLinks(element);
        },
      },
    },

    // Secondary link traits (up to 4)
    'sec1-label': createHeaderSecondaryLinkTrait(1, 'label'),
    'sec1-href': createHeaderSecondaryLinkTrait(1, 'href'),
    'sec2-label': createHeaderSecondaryLinkTrait(2, 'label'),
    'sec2-href': createHeaderSecondaryLinkTrait(2, 'href'),
    'sec3-label': createHeaderSecondaryLinkTrait(3, 'label'),
    'sec3-href': createHeaderSecondaryLinkTrait(3, 'href'),
    'sec4-label': createHeaderSecondaryLinkTrait(4, 'label'),
    'sec4-href': createHeaderSecondaryLinkTrait(4, 'href'),
  },
});

/**
 * Helper function to rebuild footer sections array from attributes
 */
function rebuildFooterSections(element: HTMLElement, count: number): void {
  const sections: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [];

  for (let i = 1; i <= count; i++) {
    const title = element.getAttribute(`section${i}-title`) || `Section ${i}`;

    // Get links for this section (up to 4 links per section)
    const links: Array<{ label: string; href: string }> = [];
    for (let j = 1; j <= 4; j++) {
      const linkLabel = element.getAttribute(`section${i}-link${j}-label`);
      const linkHref = element.getAttribute(`section${i}-link${j}-href`) || '#';

      if (linkLabel) {
        links.push({ label: linkLabel, href: linkHref });
      }
    }

    sections.push({ title, links });
  }

  // Set the sections property on the Lit component
  (element as any).sections = sections;

  if (typeof (element as any).requestUpdate === 'function') {
    (element as any).requestUpdate();
  }
}

/**
 * Initialize footer sections with retry logic
 * Waits for the Lit component to be ready before setting sections
 */
function initFooterSections(element: HTMLElement): void {
  const variant = element.getAttribute('variant') || 'medium';

  // Only initialize sections for 'big' variant
  if (variant !== 'big') return;

  const count = parseInt(element.getAttribute('section-count') || '3', 10);

  const trySetSections = (attempt: number = 0): void => {
    // Check if the component is ready (has requestUpdate method)
    if (typeof (element as any).requestUpdate === 'function') {
      rebuildFooterSections(element, count);
    } else if (attempt < 20) {
      // Retry up to 20 times with 50ms delay (1 second total)
      setTimeout(() => trySetSections(attempt + 1), 50);
    }
  };

  // Try immediately
  trySetSections();
}

/**
 * Helper function to create footer section title trait
 */
function createFooterSectionTitleTrait(sectionNum: number): UnifiedTrait {
  const attrName = `section${sectionNum}-title`;
  const defaultValue = `Section ${sectionNum}`;

  // Visibility function - only show if sectionNum <= section-count
  const visibleFn = (component: any) => {
    try {
      if (!component) return false;
      const variant = component.get?.('attributes')?.['variant'] || 'medium';
      // Only 'big' variant shows sections
      if (variant !== 'big') return false;
      const count = parseInt(component.get?.('attributes')?.['section-count'] || '3', 10);
      return sectionNum <= count;
    } catch {
      return false;
    }
  };

  return {
    definition: {
      name: attrName,
      label: `Section ${sectionNum} Title`,
      type: 'text',
      default: defaultValue,
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: any) => {
        element.setAttribute(attrName, value || '');
        const count = parseInt(element.getAttribute('section-count') || '3', 10);
        rebuildFooterSections(element, count);
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) ?? defaultValue;
      },
    },
  };
}

/**
 * Helper function to create footer section link traits
 */
function createFooterSectionLinkTrait(
  sectionNum: number,
  linkNum: number,
  type: 'label' | 'href'
): UnifiedTrait {
  const attrName = `section${sectionNum}-link${linkNum}-${type}`;
  const isLabel = type === 'label';
  const defaultValue = isLabel ? (linkNum === 1 ? 'Link 1' : '') : '#';

  // Visibility function - only show if sectionNum <= section-count and variant is 'big'
  const visibleFn = (component: any) => {
    try {
      if (!component) return false;
      const variant = component.get?.('attributes')?.['variant'] || 'medium';
      if (variant !== 'big') return false;
      const count = parseInt(component.get?.('attributes')?.['section-count'] || '3', 10);
      return sectionNum <= count;
    } catch {
      return false;
    }
  };

  return {
    definition: {
      name: attrName,
      label: `S${sectionNum} Link ${linkNum} ${isLabel ? 'Text' : 'URL'}`,
      type: 'text',
      default: defaultValue,
      placeholder: isLabel ? 'Link text' : 'URL',
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: any) => {
        if (value) {
          element.setAttribute(attrName, value);
        } else {
          element.removeAttribute(attrName);
        }
        const count = parseInt(element.getAttribute('section-count') || '3', 10);
        rebuildFooterSections(element, count);
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) ?? defaultValue;
      },
    },
  };
}

/**
 * USA Footer Component
 *
 * Site footer with agency info and optional link sections.
 */
registry.register({
  tagName: 'usa-footer',
  droppable: false,

  traits: {
    // Variant
    variant: {
      definition: {
        name: 'variant',
        label: 'Variant',
        type: 'select',
        default: 'medium',
        options: [
          { id: 'slim', label: 'Slim' },
          { id: 'medium', label: 'Medium' },
          { id: 'big', label: 'Big (with sections)' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const variant = value || 'medium';
          element.setAttribute('variant', variant);
          (element as any).variant = variant;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).variant || element.getAttribute('variant') || 'medium';
        },
      },
    },

    // Agency Name
    'agency-name': {
      definition: {
        name: 'agency-name',
        label: 'Agency Name',
        type: 'text',
        default: 'Agency Name',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const name = value || 'Agency Name';
          element.setAttribute('agency-name', name);
          (element as any).agencyName = name;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).agencyName || element.getAttribute('agency-name') || 'Agency Name';
        },
      },
    },

    // Agency URL
    'agency-url': {
      definition: {
        name: 'agency-url',
        label: 'Agency URL',
        type: 'text',
        default: '#',
        placeholder: 'Agency website URL',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const url = value || '#';
          element.setAttribute('agency-url', url);
          (element as any).agencyUrl = url;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).agencyUrl || element.getAttribute('agency-url') || '#';
        },
      },
    },

    // Logo Source (optional)
    'logo-src': {
      definition: {
        name: 'logo-src',
        label: 'Logo Image URL',
        type: 'text',
        default: '',
        placeholder: 'Optional footer logo URL',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          if (value) {
            element.setAttribute('logo-src', value);
            (element as any).logoSrc = value;
          } else {
            element.removeAttribute('logo-src');
            (element as any).logoSrc = '';
          }
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).logoSrc || element.getAttribute('logo-src') || '';
        },
      },
    },

    // Logo Alt Text
    'logo-alt': {
      definition: {
        name: 'logo-alt',
        label: 'Logo Alt Text',
        type: 'text',
        default: '',
        placeholder: 'Alt text for logo',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          if (value) {
            element.setAttribute('logo-alt', value);
            (element as any).logoAlt = value;
          } else {
            element.removeAttribute('logo-alt');
            (element as any).logoAlt = '';
          }
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).logoAlt || element.getAttribute('logo-alt') || '';
        },
      },
    },

    // Contact Phone
    'contact-phone': {
      definition: {
        name: 'contact-phone',
        label: 'Contact Phone',
        type: 'text',
        default: '',
        placeholder: '(555) 555-5555',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          if (value) {
            element.setAttribute('contact-phone', value);
            (element as any).contactPhone = value;
          } else {
            element.removeAttribute('contact-phone');
            (element as any).contactPhone = '';
          }
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).contactPhone || element.getAttribute('contact-phone') || '';
        },
      },
    },

    // Contact Email
    'contact-email': {
      definition: {
        name: 'contact-email',
        label: 'Contact Email',
        type: 'text',
        default: '',
        placeholder: 'contact@agency.gov',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          if (value) {
            element.setAttribute('contact-email', value);
            (element as any).contactEmail = value;
          } else {
            element.removeAttribute('contact-email');
            (element as any).contactEmail = '';
          }
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).contactEmail || element.getAttribute('contact-email') || '';
        },
      },
    },

    // Section count (for 'big' variant)
    'section-count': {
      definition: {
        name: 'section-count',
        label: 'Number of Sections',
        type: 'select',
        default: '3',
        options: [
          { id: '1', label: '1 Section' },
          { id: '2', label: '2 Sections' },
          { id: '3', label: '3 Sections' },
          { id: '4', label: '4 Sections' },
        ],
        visible: (component: any) => {
          try {
            if (!component) return false;
            const variant = component.get?.('attributes')?.['variant'] || 'medium';
            return variant === 'big';
          } catch {
            return false;
          }
        },
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const count = parseInt(value || '3', 10);
          element.setAttribute('section-count', String(count));
          rebuildFooterSections(element, count);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('section-count') ?? '3';
        },
        onInit: (element: HTMLElement, _value: any) => {
          // Use retry logic to wait for Lit component to be ready
          initFooterSections(element);
        },
      },
    },

    // Section 1 traits
    'section1-title': createFooterSectionTitleTrait(1),
    'section1-link1-label': createFooterSectionLinkTrait(1, 1, 'label'),
    'section1-link1-href': createFooterSectionLinkTrait(1, 1, 'href'),
    'section1-link2-label': createFooterSectionLinkTrait(1, 2, 'label'),
    'section1-link2-href': createFooterSectionLinkTrait(1, 2, 'href'),
    'section1-link3-label': createFooterSectionLinkTrait(1, 3, 'label'),
    'section1-link3-href': createFooterSectionLinkTrait(1, 3, 'href'),
    'section1-link4-label': createFooterSectionLinkTrait(1, 4, 'label'),
    'section1-link4-href': createFooterSectionLinkTrait(1, 4, 'href'),

    // Section 2 traits
    'section2-title': createFooterSectionTitleTrait(2),
    'section2-link1-label': createFooterSectionLinkTrait(2, 1, 'label'),
    'section2-link1-href': createFooterSectionLinkTrait(2, 1, 'href'),
    'section2-link2-label': createFooterSectionLinkTrait(2, 2, 'label'),
    'section2-link2-href': createFooterSectionLinkTrait(2, 2, 'href'),
    'section2-link3-label': createFooterSectionLinkTrait(2, 3, 'label'),
    'section2-link3-href': createFooterSectionLinkTrait(2, 3, 'href'),
    'section2-link4-label': createFooterSectionLinkTrait(2, 4, 'label'),
    'section2-link4-href': createFooterSectionLinkTrait(2, 4, 'href'),

    // Section 3 traits
    'section3-title': createFooterSectionTitleTrait(3),
    'section3-link1-label': createFooterSectionLinkTrait(3, 1, 'label'),
    'section3-link1-href': createFooterSectionLinkTrait(3, 1, 'href'),
    'section3-link2-label': createFooterSectionLinkTrait(3, 2, 'label'),
    'section3-link2-href': createFooterSectionLinkTrait(3, 2, 'href'),
    'section3-link3-label': createFooterSectionLinkTrait(3, 3, 'label'),
    'section3-link3-href': createFooterSectionLinkTrait(3, 3, 'href'),
    'section3-link4-label': createFooterSectionLinkTrait(3, 4, 'label'),
    'section3-link4-href': createFooterSectionLinkTrait(3, 4, 'href'),

    // Section 4 traits
    'section4-title': createFooterSectionTitleTrait(4),
    'section4-link1-label': createFooterSectionLinkTrait(4, 1, 'label'),
    'section4-link1-href': createFooterSectionLinkTrait(4, 1, 'href'),
    'section4-link2-label': createFooterSectionLinkTrait(4, 2, 'label'),
    'section4-link2-href': createFooterSectionLinkTrait(4, 2, 'href'),
    'section4-link3-label': createFooterSectionLinkTrait(4, 3, 'label'),
    'section4-link3-href': createFooterSectionLinkTrait(4, 3, 'href'),
    'section4-link4-label': createFooterSectionLinkTrait(4, 4, 'label'),
    'section4-link4-href': createFooterSectionLinkTrait(4, 4, 'href'),
  },
});

/**
 * USA In-Page Navigation Component
 *
 * Sidebar table of contents that links to headings on the page.
 */
registry.register({
  tagName: 'usa-in-page-navigation',
  droppable: false,

  traits: {
    'nav-title': {
      definition: {
        name: 'nav-title',
        label: 'Title',
        type: 'text',
        default: 'On this page',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const text = value || 'On this page';
          element.setAttribute('nav-title', text);
          (element as any).navTitle = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).navTitle || element.getAttribute('nav-title') || 'On this page';
        },
      },
    },

    'heading-level': {
      definition: {
        name: 'heading-level',
        label: 'Heading Level',
        type: 'select',
        default: 'h2',
        options: [
          { id: 'h2', label: 'H2' },
          { id: 'h3', label: 'H3' },
          { id: 'h4', label: 'H4' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const level = value || 'h2';
          element.setAttribute('heading-level', level);
          (element as any).headingLevel = level;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).headingLevel || element.getAttribute('heading-level') || 'h2';
        },
      },
    },
  },
});

/**
 * USA Language Selector Component
 *
 * Allows users to switch between languages.
 */
registry.register({
  tagName: 'usa-language-selector',
  droppable: false,

  traits: {
    variant: {
      definition: {
        name: 'variant',
        label: 'Variant',
        type: 'select',
        default: 'default',
        options: [
          { id: 'default', label: 'Default' },
          { id: 'unstyled', label: 'Unstyled' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const variant = value || 'default';
          element.setAttribute('variant', variant);
          (element as any).variant = variant;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).variant || element.getAttribute('variant') || 'default';
        },
      },
    },

    'lang-count': {
      definition: {
        name: 'lang-count',
        label: 'Number of Languages',
        type: 'select',
        default: '3',
        options: [
          { id: '2', label: '2' },
          { id: '3', label: '3' },
          { id: '4', label: '4' },
          { id: '5', label: '5' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          element.setAttribute('lang-count', value || '3');
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('lang-count') || '3';
        },
      },
    },

    'lang1-label': {
      definition: { name: 'lang1-label', label: 'Language 1 Label', type: 'text', default: 'English' },
      handler: {
        onChange: (element: HTMLElement, value: any) => { element.setAttribute('lang1-label', value || 'English'); if (typeof (element as any).requestUpdate === 'function') { (element as any).requestUpdate(); } },
        getValue: (element: HTMLElement) => element.getAttribute('lang1-label') || 'English',
      },
    },
    'lang1-value': {
      definition: { name: 'lang1-value', label: 'Language 1 Value', type: 'text', default: 'en' },
      handler: {
        onChange: (element: HTMLElement, value: any) => { element.setAttribute('lang1-value', value || 'en'); if (typeof (element as any).requestUpdate === 'function') { (element as any).requestUpdate(); } },
        getValue: (element: HTMLElement) => element.getAttribute('lang1-value') || 'en',
      },
    },
    'lang2-label': {
      definition: { name: 'lang2-label', label: 'Language 2 Label', type: 'text', default: 'Español' },
      handler: {
        onChange: (element: HTMLElement, value: any) => { element.setAttribute('lang2-label', value || 'Español'); if (typeof (element as any).requestUpdate === 'function') { (element as any).requestUpdate(); } },
        getValue: (element: HTMLElement) => element.getAttribute('lang2-label') || 'Español',
      },
    },
    'lang2-value': {
      definition: { name: 'lang2-value', label: 'Language 2 Value', type: 'text', default: 'es' },
      handler: {
        onChange: (element: HTMLElement, value: any) => { element.setAttribute('lang2-value', value || 'es'); if (typeof (element as any).requestUpdate === 'function') { (element as any).requestUpdate(); } },
        getValue: (element: HTMLElement) => element.getAttribute('lang2-value') || 'es',
      },
    },
    'lang3-label': {
      definition: { name: 'lang3-label', label: 'Language 3 Label', type: 'text', default: 'Français' },
      handler: {
        onChange: (element: HTMLElement, value: any) => { element.setAttribute('lang3-label', value || 'Français'); if (typeof (element as any).requestUpdate === 'function') { (element as any).requestUpdate(); } },
        getValue: (element: HTMLElement) => element.getAttribute('lang3-label') || 'Français',
      },
    },
    'lang3-value': {
      definition: { name: 'lang3-value', label: 'Language 3 Value', type: 'text', default: 'fr' },
      handler: {
        onChange: (element: HTMLElement, value: any) => { element.setAttribute('lang3-value', value || 'fr'); if (typeof (element as any).requestUpdate === 'function') { (element as any).requestUpdate(); } },
        getValue: (element: HTMLElement) => element.getAttribute('lang3-value') || 'fr',
      },
    },

    'lang4-label': {
      definition: {
        name: 'lang4-label', label: 'Language 4 Label', type: 'text', default: '中文',
        visible: (component: any) => {
          try { return parseInt(component?.get?.('attributes')?.['lang-count'] || '3', 10) >= 4; } catch { return false; }
        },
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => { element.setAttribute('lang4-label', value || '中文'); if (typeof (element as any).requestUpdate === 'function') { (element as any).requestUpdate(); } },
        getValue: (element: HTMLElement) => element.getAttribute('lang4-label') || '中文',
      },
    },
    'lang4-value': {
      definition: {
        name: 'lang4-value', label: 'Language 4 Value', type: 'text', default: 'zh',
        visible: (component: any) => {
          try { return parseInt(component?.get?.('attributes')?.['lang-count'] || '3', 10) >= 4; } catch { return false; }
        },
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => { element.setAttribute('lang4-value', value || 'zh'); if (typeof (element as any).requestUpdate === 'function') { (element as any).requestUpdate(); } },
        getValue: (element: HTMLElement) => element.getAttribute('lang4-value') || 'zh',
      },
    },
    'lang5-label': {
      definition: {
        name: 'lang5-label', label: 'Language 5 Label', type: 'text', default: 'العربية',
        visible: (component: any) => {
          try { return parseInt(component?.get?.('attributes')?.['lang-count'] || '3', 10) >= 5; } catch { return false; }
        },
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => { element.setAttribute('lang5-label', value || 'العربية'); if (typeof (element as any).requestUpdate === 'function') { (element as any).requestUpdate(); } },
        getValue: (element: HTMLElement) => element.getAttribute('lang5-label') || 'العربية',
      },
    },
    'lang5-value': {
      definition: {
        name: 'lang5-value', label: 'Language 5 Value', type: 'text', default: 'ar',
        visible: (component: any) => {
          try { return parseInt(component?.get?.('attributes')?.['lang-count'] || '3', 10) >= 5; } catch { return false; }
        },
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => { element.setAttribute('lang5-value', value || 'ar'); if (typeof (element as any).requestUpdate === 'function') { (element as any).requestUpdate(); } },
        getValue: (element: HTMLElement) => element.getAttribute('lang5-value') || 'ar',
      },
    },
  },
});

/**
 * USA Character Count Component
 *
 * Text input or textarea with a character count indicator.
 */
registry.register({
  tagName: 'usa-character-count',
  droppable: false,

  traits: {
    label: {
      definition: {
        name: 'label',
        label: 'Label',
        type: 'text',
        default: 'Message',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const text = value || 'Message';
          element.setAttribute('label', text);
          (element as any).label = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).label || element.getAttribute('label') || 'Message';
        },
      },
    },

    maxlength: {
      definition: {
        name: 'maxlength',
        label: 'Max Characters',
        type: 'number',
        default: 200,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const maxlen = parseInt(value, 10) || 200;
          element.setAttribute('maxlength', String(maxlen));
          (element as any).maxlength = maxlen;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return parseInt(element.getAttribute('maxlength') || '200', 10);
        },
      },
    },

    name: {
      definition: {
        name: 'name',
        label: 'Field Name',
        type: 'text',
        default: '',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          element.setAttribute('name', value || '');
          (element as any).name = value || '';
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('name') || '';
        },
      },
    },

    hint: {
      definition: {
        name: 'hint',
        label: 'Hint Text',
        type: 'text',
        default: '',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          element.setAttribute('hint', value || '');
          (element as any).hint = value || '';
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).hint || element.getAttribute('hint') || '';
        },
      },
    },
  },
});

/**
 * USA Memorable Date Component
 *
 * A date input pattern using separate month, day, and year fields.
 */
registry.register({
  tagName: 'usa-memorable-date',
  droppable: false,

  traits: {
    legend: {
      definition: {
        name: 'legend',
        label: 'Legend',
        type: 'text',
        default: 'Date of birth',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const text = value || 'Date of birth';
          element.setAttribute('legend', text);
          (element as any).legend = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).legend || element.getAttribute('legend') || 'Date of birth';
        },
      },
    },

    hint: {
      definition: {
        name: 'hint',
        label: 'Hint Text',
        type: 'text',
        default: 'For example: January 19 2000',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const text = value || '';
          element.setAttribute('hint', text);
          (element as any).hint = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).hint || element.getAttribute('hint') || '';
        },
      },
    },
  },
});

}
