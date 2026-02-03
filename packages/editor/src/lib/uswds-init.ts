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
