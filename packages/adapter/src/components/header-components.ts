/**
 * Header Components
 *
 * Registers the usa-header component with navigation, search, skip link,
 * logo, and secondary link traits.
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

export function registerHeaderComponents(registry: RegistryLike): void {

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

}
