/**
 * Page Link Trait Factories
 *
 * Creates traits for linking buttons/links to pages within the prototype
 * or to external URLs. Used by usa-button, usa-link, and usa-button-group.
 */

import type { UnifiedTrait, TraitValue } from './shared-utils.js';
import type { GrapesComponentModel } from '../types.js';
import type { USWDSElement } from '@uswds-pt/shared';

/**
 * Helper to convert button's inner element to anchor or back to button.
 * USWDS usa-button should render as <a> when href is set, but the web component
 * doesn't always re-render, so we manually swap the inner element.
 */
export function updateButtonInnerElement(element: HTMLElement, href: string | null): void {
  const tagName = element.tagName.toLowerCase();
  if (tagName !== 'usa-button') return;

  const innerButton = element.querySelector('button');
  const innerAnchor = element.querySelector('a');

  if (href) {
    // Need an anchor element
    if (innerAnchor) {
      // Already an anchor, just update href
      innerAnchor.setAttribute('href', href);
    } else if (innerButton) {
      // Convert button to anchor
      const anchor = document.createElement('a');
      anchor.setAttribute('href', href);
      anchor.className = innerButton.className;
      anchor.textContent = innerButton.textContent;
      innerButton.replaceWith(anchor);
    }
  } else {
    // Need a button element (no href)
    if (innerButton) {
      // Already a button, nothing to do
    } else if (innerAnchor) {
      // Convert anchor back to button
      const button = document.createElement('button');
      button.type = 'button';
      button.className = innerAnchor.className;
      button.textContent = innerAnchor.textContent;
      innerAnchor.replaceWith(button);
    }
  }
}

/**
 * Create page link traits for button/link components.
 * Allows users to easily link to other pages in the prototype.
 *
 * The page-link select options are populated dynamically by the Editor
 * when a component is selected (see Editor.tsx).
 */
export function createPageLinkTraits(): Record<string, UnifiedTrait> {
  // Visibility for page-link: only when link-type is 'page'
  const pageLinkVisible = (component: GrapesComponentModel) => {
    try {
      if (!component?.get) return false;
      const attrs = component.get('attributes') as Record<string, string> | undefined;
      return attrs?.['link-type'] === 'page';
    } catch {
      return false;
    }
  };

  // Visibility for href: only when link-type is 'external'
  const externalLinkVisible = (component: GrapesComponentModel) => {
    try {
      if (!component?.get) return false;
      const attrs = component.get('attributes') as Record<string, string> | undefined;
      return attrs?.['link-type'] === 'external';
    } catch {
      return false;
    }
  };

  return {
    'link-type': {
      definition: {
        name: 'link-type',
        label: 'Link To',
        type: 'select',
        default: 'none',
        options: [
          { id: 'none', label: 'None (Button Only)' },
          { id: 'page', label: 'Page in Prototype' },
          { id: 'external', label: 'External URL' },
        ],
        category: { id: 'link', label: 'Link' },
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue, _oldValue?: TraitValue, component?: GrapesComponentModel) => {
          const linkType = String(value || 'none');
          element.setAttribute('link-type', linkType);

          // Clear conflicting attributes when switching modes
          if (linkType === 'none') {
            // Clear both href and page-link
            element.removeAttribute('href');
            element.removeAttribute('page-link');
            if (component?.addAttributes) {
              component.addAttributes({ href: '', 'page-link': '', 'link-type': linkType });
            }
            // Revert usa-button inner anchor back to button
            updateButtonInnerElement(element, null);
          } else if (linkType === 'external') {
            // Clear page-link when switching to external
            element.removeAttribute('page-link');
            if (component?.addAttributes) {
              component.addAttributes({ 'page-link': '', 'link-type': linkType });
            }
          } else if (linkType === 'page') {
            // Clear href when switching to page (page-link will set its own href)
            element.removeAttribute('href');
            if (component?.addAttributes) {
              component.addAttributes({ href: '', 'link-type': linkType });
            }
            // Revert usa-button inner anchor back to button until page is selected
            updateButtonInnerElement(element, null);
          }
        },
        getValue: (element: HTMLElement) => {
          // Infer link-type from existing href if not set
          const linkType = element.getAttribute('link-type');
          if (linkType) return linkType;

          const href = element.getAttribute('href');
          if (!href || href === '#') return 'none';
          if (href.startsWith('#page-')) return 'page';
          return 'external';
        },
      },
    },

    'page-link': {
      definition: {
        name: 'page-link',
        label: 'Select Page',
        type: 'select',
        default: '',
        // Options are populated dynamically by useGrapesJSSetup.ts
        options: [
          { id: '', label: '-- Select a page --' },
        ],
        visible: pageLinkVisible,
        category: { id: 'link', label: 'Link' },
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue, _oldValue?: TraitValue, component?: GrapesComponentModel) => {
          if (value) {
            const pageValue = String(value);
            const href = `#page-${pageValue}`;
            // Set href as both attribute and property on DOM element
            element.setAttribute('href', href);
            (element as USWDSElement).href = href;
            element.setAttribute('page-link', pageValue);

            // CRITICAL: Also update GrapesJS component model so getHtml() includes href
            if (component?.addAttributes) {
              component.addAttributes({ href: href, 'page-link': pageValue });
            }

            // Update inner element based on component type
            // usa-button: swap button to anchor
            // usa-link: update anchor href
            updateButtonInnerElement(element, href);
            const innerAnchor = element.querySelector('a');
            if (innerAnchor) {
              innerAnchor.setAttribute('href', href);
            }

            // Trigger web component update
            if (typeof (element as USWDSElement).requestUpdate === 'function') {
              (element as USWDSElement).requestUpdate?.();
            }
          } else {
            element.removeAttribute('href');
            (element as USWDSElement).href = undefined;
            element.removeAttribute('page-link');
            // Also update GrapesJS component model
            if (component?.addAttributes) {
              component.addAttributes({ href: '', 'page-link': '' });
            }
            // Revert button inner element and clear anchor href
            updateButtonInnerElement(element, null);
            const innerAnchor = element.querySelector('a');
            if (innerAnchor) {
              innerAnchor.setAttribute('href', '#');
            }
          }
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('page-link') || '';
        },
      },
    },

    href: {
      definition: {
        name: 'href',
        label: 'URL',
        type: 'text',
        default: '',
        placeholder: 'https://example.com',
        visible: externalLinkVisible,
        category: { id: 'link', label: 'Link' },
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue, _oldValue?: TraitValue, component?: GrapesComponentModel) => {
          if (value) {
            // Normalize URL: add https:// if it looks like a domain but has no protocol
            let href = String(value);
            if (href && !href.startsWith('#') && !href.startsWith('/') && !href.includes('://')) {
              // Looks like a domain without protocol (e.g., "www.google.com" or "google.com")
              href = 'https://' + href;
            }

            // Set href as both attribute and property on DOM element
            element.setAttribute('href', href);
            (element as USWDSElement).href = href;

            // Also update GrapesJS component model
            if (component?.addAttributes) {
              component.addAttributes({ href: href });
            }

            // Update inner element based on component type
            // usa-button: swap button to anchor
            // usa-link: update anchor href
            updateButtonInnerElement(element, href);
            const innerAnchor = element.querySelector('a');
            if (innerAnchor) {
              innerAnchor.setAttribute('href', href);
            }

            // Trigger web component update
            if (typeof (element as USWDSElement).requestUpdate === 'function') {
              (element as USWDSElement).requestUpdate?.();
            }
          } else {
            element.removeAttribute('href');
            (element as USWDSElement).href = undefined;
            // Also update GrapesJS component model
            if (component?.addAttributes) {
              component.addAttributes({ href: '' });
            }
            // Revert button inner element and clear anchor href
            updateButtonInnerElement(element, null);
            const innerAnchor = element.querySelector('a');
            if (innerAnchor) {
              innerAnchor.setAttribute('href', '#');
            }
          }
        },
        getValue: (element: HTMLElement) => {
          const href = element.getAttribute('href') || '';
          // Only return href if it's not a page link
          if (href.startsWith('#page-')) return '';
          return href;
        },
      },
    },
  };
}
