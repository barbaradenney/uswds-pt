/**
 * Canvas Helpers — Page Link Sync
 *
 * Ensures page-link hrefs and external URLs are correctly formatted
 * before save/export operations.
 */

import { createDebugLogger } from '@uswds-pt/shared';
import type { EditorInstance } from '../../../types/grapesjs';

const debug = createDebugLogger('Canvas');

/**
 * Sync page-link hrefs for usa-button and usa-link components.
 *
 * Ensures `href` attributes match the `#page-{pageLink}` pattern expected by
 * the in-canvas page navigation handler, and normalizes external URLs that are
 * missing a protocol prefix.
 *
 * Safe to call during save extraction (operates on DOM attributes only, no
 * async work or resource loading).
 */
export function syncPageLinkHrefs(editor: EditorInstance): void {
  try {
    const doc = editor.Canvas?.getDocument?.();
    if (!doc) return;

    const findComponent = (el: Element) => {
      const wrapper = editor.DomComponents?.getWrapper?.();
      if (!wrapper) return null;

      const findInChildren = (comp: any): any => {
        if (comp.getEl?.() === el) return comp;
        const children = comp.components?.() || [];
        const childArray = children.models || children;
        if (!childArray || !childArray.length) return null;
        for (const child of childArray) {
          const found = findInChildren(child);
          if (found) return found;
        }
        return null;
      };

      return findInChildren(wrapper);
    };

    // Fix page links
    const elementsWithPageLink = doc.querySelectorAll('usa-button[page-link], usa-link[page-link]');
    elementsWithPageLink.forEach((el: Element) => {
      const pageLink = el.getAttribute('page-link');
      const linkType = el.getAttribute('link-type');
      const currentHref = el.getAttribute('href');

      if (pageLink && (linkType === 'page' || !linkType)) {
        const expectedHref = `#page-${pageLink}`;
        if (currentHref !== expectedHref) {
          el.setAttribute('href', expectedHref);
          (el as any).href = expectedHref;
          const innerAnchor = el.querySelector('a');
          if (innerAnchor) {
            innerAnchor.setAttribute('href', expectedHref);
          }
          const component = findComponent(el);
          if (component?.addAttributes) {
            component.addAttributes({ href: expectedHref, 'link-type': 'page' });
          }
          debug('Fixed page-link href:', pageLink, '->', expectedHref);
        }
      }
    });

    // Fix external URLs without protocol
    const elementsWithExternalLink = doc.querySelectorAll('usa-button[link-type="external"], usa-link[link-type="external"]');
    elementsWithExternalLink.forEach((el: Element) => {
      const href = el.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('/') && !href.includes('://')) {
        const normalizedHref = 'https://' + href;
        el.setAttribute('href', normalizedHref);
        (el as any).href = normalizedHref;
        const innerAnchor = el.querySelector('a');
        if (innerAnchor) {
          innerAnchor.setAttribute('href', normalizedHref);
        }
        const component = findComponent(el);
        if (component?.addAttributes) {
          component.addAttributes({ href: normalizedHref });
        }
        debug('Normalized external href:', href, '->', normalizedHref);
      }
    });
  } catch (err) {
    debug('Error syncing page-link hrefs:', err);
  }
}
