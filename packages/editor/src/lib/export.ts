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

  // Remove USWDS JS script tags - web components handle their own behavior
  // and USWDS JS conflicts with them (causes "Cannot read properties of null" errors)
  cleaned = removeUSWDSScripts(cleaned);

  if (removeGrapesAttributes) {
    cleaned = removeGrapesAttrs(cleaned);
  }

  if (removeEmptyAttributes) {
    cleaned = removeEmptyAttrs(cleaned);
  }

  // Remove generated IDs (pattern: single letter followed by random chars)
  cleaned = cleaned.replace(/\s+id="[a-z][a-z0-9]{3,5}"/gi, '');

  // Clean up GrapesJS classes
  cleaned = cleanGrapesClasses(cleaned);

  if (formatOutput) {
    cleaned = formatHtml(cleaned, indentSize);
  }

  return cleaned.trim();
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
 * CDN URLs for USWDS resources (keep in sync with adapter constants)
 */
const USWDS_VERSION = '3.8.1';
const USWDS_WC_BUNDLE_VERSION = '2.5.12';

const PREVIEW_CDN_URLS = {
  uswdsCss: `https://cdn.jsdelivr.net/npm/@uswds/uswds@${USWDS_VERSION}/dist/css/uswds.min.css`,
  uswdsWcJs: `https://cdn.jsdelivr.net/npm/@uswds-wc/bundle@${USWDS_WC_BUNDLE_VERSION}/uswds-wc.js`,
  uswdsWcCss: `https://cdn.jsdelivr.net/npm/@uswds-wc/bundle@${USWDS_WC_BUNDLE_VERSION}/uswds-wc.css`,
};

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
      customElements.whenDefined('usa-header'),
      customElements.whenDefined('usa-footer'),
    ]).catch((err) => {
      console.warn('USWDS web components may not be fully loaded:', err);
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

    // Initialize usa-button components with href or page-link
    document.querySelectorAll('usa-button[href], usa-button[page-link]').forEach(button => {
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
          anchor.textContent = innerButton.textContent;
          innerButton.replaceWith(anchor);
        } else if (innerAnchor) {
          innerAnchor.href = href;
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
  ${generateInitScript()}
</head>
<body>
${content ? indentContent(content, 2) : '  <!-- Add your content here -->'}
</body>
</html>`;
}

/**
 * Open a preview of the HTML content in a new browser tab
 */
export function openPreviewInNewTab(html: string, title: string = 'Prototype Preview'): void {
  // Clean the HTML first
  const cleanedHtml = cleanExport(html);

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
  ${pageNavScript}
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
