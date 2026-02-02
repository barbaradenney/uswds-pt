/**
 * USWDS Resource Loader for GrapesJS Canvas
 *
 * Handles loading USWDS CSS and Web Components JavaScript into the GrapesJS canvas iframe.
 */

import { CDN_URLS } from '@uswds-pt/adapter';

// Debug logging
const DEBUG =
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).get('debug') === 'true' ||
    localStorage.getItem('uswds_pt_debug') === 'true');

function debug(...args: unknown[]): void {
  if (DEBUG) {
    console.log('[USWDS-PT]', ...args);
  }
}

// GrapesJS editor type
type EditorInstance = any;

/**
 * Helper to wait for a resource to load
 */
function waitForLoad(element: HTMLElement, type: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${type} load timeout after 10s`));
    }, 10000);

    element.onload = () => {
      clearTimeout(timeout);
      debug(`${type} loaded`);
      resolve();
    };
    element.onerror = (e) => {
      clearTimeout(timeout);
      console.error(`USWDS-PT: ${type} failed to load`, e);
      reject(e);
    };
  });
}

/**
 * Helper to wait for custom elements to be defined
 */
async function waitForCustomElements(
  iframeWindow: Window,
  elements: string[],
  maxWaitMs = 5000
): Promise<boolean> {
  const startTime = Date.now();
  const customElements = iframeWindow.customElements;

  while (Date.now() - startTime < maxWaitMs) {
    const allDefined = elements.every(el => customElements.get(el) !== undefined);
    if (allDefined) {
      debug('All custom elements registered:', elements);
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const missing = elements.filter(el => customElements.get(el) === undefined);
  console.warn('USWDS-PT: Some custom elements not registered after timeout:', missing);
  return false;
}

/**
 * Load USWDS resources into the GrapesJS canvas iframe
 *
 * @param editor - GrapesJS editor instance
 * @returns Promise that resolves when resources are loaded
 */
export async function loadUSWDSResources(editor: EditorInstance): Promise<void> {
  const canvas = editor.Canvas;
  if (!canvas) return;

  const doc = canvas.getDocument();
  if (!doc) return;

  // Check if resources are already loaded AND functional in this document
  const existingLink = doc.querySelector('link[href*="uswds"]') as HTMLLinkElement;
  if (existingLink && existingLink.sheet) {
    debug('USWDS resources already loaded in this canvas');
    return;
  }

  // If link exists but stylesheet not loaded, remove stale links
  if (existingLink && !existingLink.sheet) {
    debug('Removing stale USWDS link tags');
    doc.querySelectorAll('link[href*="uswds"]').forEach((el: Element) => el.remove());
    doc.querySelectorAll('script[src*="uswds"]').forEach((el: Element) => el.remove());
  }

  debug('Loading USWDS resources into canvas iframe');

  try {
    // 1. Load CSS files in parallel
    const uswdsCss = doc.createElement('link');
    uswdsCss.rel = 'stylesheet';
    uswdsCss.href = CDN_URLS.uswdsCss;

    const uswdsWcCss = doc.createElement('link');
    uswdsWcCss.rel = 'stylesheet';
    uswdsWcCss.href = CDN_URLS.uswdsWcCss;

    doc.head.appendChild(uswdsCss);
    doc.head.appendChild(uswdsWcCss);

    await Promise.all([
      waitForLoad(uswdsCss, 'USWDS CSS'),
      waitForLoad(uswdsWcCss, 'USWDS-WC CSS'),
    ]);

    // 2. Load USWDS-WC bundle JS
    const uswdsWcScript = doc.createElement('script');
    uswdsWcScript.type = 'module';
    uswdsWcScript.src = CDN_URLS.uswdsWcJs;
    doc.head.appendChild(uswdsWcScript);

    await waitForLoad(uswdsWcScript, 'USWDS-WC JS');

    // Note: USWDS JavaScript (uswds.min.js) is NOT loaded here because:
    // - All components are web components that handle their own behavior internally
    // - Loading USWDS JS would conflict with web component event handlers
    // - The usa-header web component has its own mobile menu toggle via Lit events

    // 3. Wait for critical custom elements to be registered
    const iframeWindow = canvas.getWindow();
    if (iframeWindow) {
      const criticalElements = ['usa-button', 'usa-header', 'usa-footer', 'usa-alert'];
      await waitForCustomElements(iframeWindow, criticalElements);
    }

    debug('All USWDS resources loaded successfully');

    // 4. Trigger a canvas refresh
    setTimeout(() => {
      editor.refresh();
      debug('Canvas refreshed after resource load');
    }, 100);

  } catch (err) {
    console.error('USWDS-PT: Error loading resources:', err);
  }
}

/**
 * Add custom CSS to canvas for card container content
 */
export function addCardContainerCSS(editor: EditorInstance): void {
  const canvasFrame = editor.Canvas?.getFrameEl();
  if (canvasFrame?.contentDocument) {
    const style = canvasFrame.contentDocument.createElement('style');
    style.textContent = `
      /* Remove default margins from elements inside card containers */
      .uswds-card-container h1,
      .uswds-card-container h2,
      .uswds-card-container h3,
      .uswds-card-container h4,
      .uswds-card-container h5,
      .uswds-card-container h6,
      .uswds-card-container p,
      .uswds-card-container ul,
      .uswds-card-container ol {
        margin: 0;
      }
    `;
    canvasFrame.contentDocument.head.appendChild(style);
    debug('Added card container CSS to canvas');
  }
}

/**
 * Clear GrapesJS localStorage to prevent state bleeding between prototypes
 */
export function clearGrapesJSStorage(): void {
  try {
    const storageKeys = Object.keys(localStorage).filter(key =>
      key.startsWith('gjs-') || key.startsWith('gjsProject')
    );
    if (storageKeys.length > 0) {
      storageKeys.forEach(key => localStorage.removeItem(key));
      debug('Cleared GrapesJS storage keys:', storageKeys);
    }
  } catch (e) {
    console.warn('Failed to clear GrapesJS storage:', e);
  }
}
