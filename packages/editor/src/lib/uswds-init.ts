/**
 * USWDS Web Components Initialization
 *
 * Initializes USWDS web components after they're rendered in the DOM.
 * Some components (usa-header, usa-footer) need their properties set
 * programmatically to trigger proper rendering.
 */

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

  // Initialize conditional show/hide fields
  initializeConditionalFields(container);
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
      const input = trigger.querySelector('input') as HTMLInputElement | null;
      const isChecked = input?.checked ?? false;

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
