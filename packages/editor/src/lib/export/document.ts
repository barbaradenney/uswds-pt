/**
 * Document Generation and Preview
 * Generate full HTML documents with USWDS imports for export and preview
 */

import { createDebugLogger, escapeHtml } from '@uswds-pt/shared';
import { CDN_URLS, CONDITIONAL_FIELDS_SCRIPT, STATE_VISIBILITY_SCRIPT } from '@uswds-pt/adapter';
import { BLOB_URL_REVOKE_DELAY_MS } from '../constants';

import { cleanExport } from './clean';
import { generateInitScript, hasConditionalFields } from './init-script';

const debug = createDebugLogger('Export');

/**
 * Generate supplemental CSS that the GrapesJS canvas applies via resource-loader.ts
 * but that the preview/export documents also need for visual parity.
 */
function generateSupplementalCSS(): string {
  return `
  <style>
    /* Apply USWDS font stack to base text elements (mirrors canvas typography CSS) */
    body, h1, h2, h3, h4, h5, h6, p, li, td, th, label, input, textarea, select, button {
      font-family: "Source Sans Pro Web", "Helvetica Neue", Helvetica, Roboto, Arial, sans-serif;
    }
    /* Ensure fieldsets with usa-form-group get proper margin-top */
    fieldset.usa-fieldset.usa-form-group {
      margin-top: 1.5rem !important;
    }
    /* Reset padding on usa-button-group web component */
    usa-button-group {
      display: block;
      padding: 0 !important;
      margin: 0;
    }
    usa-button-group ul.usa-button-group {
      padding: 0;
      margin: 0;
    }
    /* Collapse usa-banner accordion content by default */
    usa-banner .usa-banner__content {
      display: none !important;
    }
    usa-banner .usa-banner__header--expanded + .usa-banner__content,
    usa-banner[expanded] .usa-banner__content {
      display: block !important;
    }
  </style>`;
}

// Used in preview functions for debug output
const DEBUG =
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).get('debug') === 'true' ||
    localStorage.getItem('uswds_pt_debug') === 'true');

// Use the shared CDN URLs from adapter
const PREVIEW_CDN_URLS = CDN_URLS;

/**
 * Page data for multi-page preview
 */
export interface PageData {
  id: string;
  name: string;
  html: string;
}

/**
 * Check if content uses data-states attributes for state visibility
 */
function hasStateVisibility(content: string): boolean {
  return content.includes('data-states=');
}

/**
 * Check if content uses data-users attributes for user visibility
 */
function hasUserVisibility(content: string): boolean {
  return content.includes('data-users=');
}

/**
 * Generate a full HTML document with USWDS imports
 */
export function generateFullDocument(
  content: string,
  options: {
    title?: string;
    lang?: string;
    activeStateId?: string | null;
    activeUserId?: string | null;
  } = {}
): string {
  const {
    title = 'Prototype',
    lang = 'en',
    activeStateId = null,
    activeUserId = null,
  } = options;

  // Include conditional fields script only if content uses data-reveals or data-hides
  const conditionalScript = hasConditionalFields(content) ? `
  <!-- Conditional field show/hide functionality -->
  ${CONDITIONAL_FIELDS_SCRIPT}` : '';

  // Include state/user visibility script if content uses data-states or data-users
  const stateScript = (hasStateVisibility(content) || hasUserVisibility(content)) ? `
  <!-- State/User visibility functionality -->
  ${STATE_VISIBILITY_SCRIPT}` : '';

  let bodyAttrs = '';
  if (activeStateId) bodyAttrs += ` data-active-state="${escapeHtml(activeStateId)}"`;
  if (activeUserId) bodyAttrs += ` data-active-user="${escapeHtml(activeUserId)}"`;


  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>

  <!-- USWDS Base CSS -->
  <link rel="stylesheet" href="${PREVIEW_CDN_URLS.uswdsCss}">
  <!-- USWDS Web Components CSS -->
  <link rel="stylesheet" href="${PREVIEW_CDN_URLS.uswdsWcCss}">
  ${generateSupplementalCSS()}
  <!-- USWDS Web Components JS (handles all component behavior - USWDS JS is NOT loaded as it conflicts) -->
  <script type="module" src="${PREVIEW_CDN_URLS.uswdsWcJs}"></script>
  <!-- Initialize web component properties after they render -->
  ${generateInitScript()}${conditionalScript}${stateScript}
</head>
<body${bodyAttrs}>
${content ? indentContent(content, 2) : '  <!-- Add your content here -->'}
</body>
</html>`;
}

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
    }, BLOB_URL_REVOKE_DELAY_MS);
  }
}

/**
 * Generate page navigation script for multi-page preview
 */
function generatePageNavigationScript(defaultPageId?: string | null): string {
  // Inject the default page ID as a string literal (or null) so the script
  // can use it as a fallback when no URL hash is present.
  const defaultPageLiteral = defaultPageId ? `"${defaultPageId.replace(/"/g, '\\"')}"` : 'null';
  return `
  // Page navigation for multi-page preview
  function initPageNavigation() {
    const pages = document.querySelectorAll('[data-page-id]');
    if (pages.length === 0) return;

    var defaultPageId = ${defaultPageLiteral};

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
    var rawPageId = window.location.hash.replace('#page-', '');
    // Sanitize page ID to prevent CSS selector injection
    var hashPageId = /^[\\w-]+$/.test(rawPageId) ? rawPageId : '';
    const firstPageId = pages[0].getAttribute('data-page-id');
    const initialPageId = hashPageId && document.querySelector('[data-page-id="' + hashPageId + '"]')
      ? hashPageId
      : (defaultPageId || firstPageId);
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
    activeStateId?: string | null;
    activeUserId?: string | null;
    activePageId?: string | null;
  } = {}
): string {
  const {
    title = 'Prototype',
    lang = 'en',
    activeStateId = null,
    activeUserId = null,
    activePageId = null,
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
  const pageNavScript = `<script type="module">${generatePageNavigationScript(activePageId)}</script>`;

  // Include conditional fields script only if any page uses data-reveals or data-hides
  const anyPageHasConditionalFields = pages.some(page => hasConditionalFields(page.html));
  const conditionalScript = anyPageHasConditionalFields ? `
  <!-- Conditional field show/hide functionality -->
  ${CONDITIONAL_FIELDS_SCRIPT}` : '';

  // Include state/user visibility script if any page uses data-states or data-users
  const anyPageHasStates = pages.some(page => hasStateVisibility(page.html));
  const anyPageHasUsers = pages.some(page => hasUserVisibility(page.html));
  const stateScript = (anyPageHasStates || anyPageHasUsers) ? `
  <!-- State/User visibility functionality -->
  ${STATE_VISIBILITY_SCRIPT}` : '';

  let bodyAttrs = '';
  if (activeStateId) bodyAttrs += ` data-active-state="${escapeHtml(activeStateId)}"`;
  if (activeUserId) bodyAttrs += ` data-active-user="${escapeHtml(activeUserId)}"`;


  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>

  <!-- USWDS Base CSS -->
  <link rel="stylesheet" href="${PREVIEW_CDN_URLS.uswdsCss}">
  <!-- USWDS Web Components CSS -->
  <link rel="stylesheet" href="${PREVIEW_CDN_URLS.uswdsWcCss}">
  ${generateSupplementalCSS()}
  <!-- USWDS Web Components JS (handles all component behavior - USWDS JS is NOT loaded as it conflicts) -->
  <script type="module" src="${PREVIEW_CDN_URLS.uswdsWcJs}"></script>
  <!-- Initialize web component properties after they render -->
  ${initScript}
  <!-- Page navigation for multi-page preview -->
  ${pageNavScript}${conditionalScript}${stateScript}
</head>
<body${bodyAttrs}>
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
    }, BLOB_URL_REVOKE_DELAY_MS);
  }
}

/**
 * Indent content by a number of spaces
 */
export function indentContent(content: string, spaces: number): string {
  const indent = ' '.repeat(spaces);
  return content
    .split('\n')
    .map((line) => indent + line)
    .join('\n');
}
