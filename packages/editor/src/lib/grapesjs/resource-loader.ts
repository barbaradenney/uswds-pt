/**
 * USWDS Resource Loader for GrapesJS Canvas
 *
 * Handles loading USWDS CSS and Web Components JavaScript into the GrapesJS canvas iframe.
 */

import { CDN_URLS } from '@uswds-pt/adapter';
import { createDebugLogger } from '@uswds-pt/shared';
import type { EditorInstance } from '../../types/grapesjs';

const debug = createDebugLogger('ResourceLoader');

/**
 * Helper to wait for a resource to load
 * @param signal - Optional AbortSignal for cancellation
 */
function waitForLoad(element: HTMLElement, type: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already aborted
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error(`${type} load timeout after 10s`));
    }, 10000);

    const cleanup = () => {
      clearTimeout(timeout);
      element.onload = null;
      element.onerror = null;
    };

    // Listen for abort
    const abortHandler = () => {
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', abortHandler, { once: true });

    element.onload = () => {
      signal?.removeEventListener('abort', abortHandler);
      cleanup();
      debug(`${type} loaded`);
      resolve();
    };
    element.onerror = (e) => {
      signal?.removeEventListener('abort', abortHandler);
      cleanup();
      debug(`${type} failed to load`, e);
      reject(e);
    };
  });
}

/**
 * Helper to wait for custom elements to be defined
 * @param signal - Optional AbortSignal for cancellation
 */
async function waitForCustomElements(
  iframeWindow: Window,
  elements: string[],
  maxWaitMs = 5000,
  signal?: AbortSignal
): Promise<boolean> {
  const startTime = Date.now();
  const customElements = iframeWindow.customElements;

  while (Date.now() - startTime < maxWaitMs) {
    // Check for abort
    if (signal?.aborted) {
      debug('waitForCustomElements aborted');
      return false;
    }

    const allDefined = elements.every(el => customElements.get(el) !== undefined);
    if (allDefined) {
      debug('All custom elements registered:', elements);
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const missing = elements.filter(el => customElements.get(el) === undefined);
  debug('Some custom elements not registered after timeout:', missing);
  return false;
}

/**
 * Load USWDS resources into the GrapesJS canvas iframe
 *
 * @param editor - GrapesJS editor instance
 * @param signal - Optional AbortSignal for cancellation
 * @returns Promise that resolves when resources are loaded
 */
export async function loadUSWDSResources(editor: EditorInstance, signal?: AbortSignal): Promise<void> {
  // Check for early abort
  if (signal?.aborted) {
    debug('loadUSWDSResources aborted before start');
    return;
  }

  const canvas = editor.Canvas;
  if (!canvas) return;

  const doc = canvas.getDocument();
  if (!doc) return;

  // Check CSS and JS independently — canvas.styles may have loaded CSS
  // already, but we still need to inject the JS module script.
  const existingCssLink = doc.querySelector('link[href*="uswds"]') as HTMLLinkElement;
  const cssLoaded = existingCssLink && existingCssLink.sheet;
  const existingScript = doc.querySelector('script[src*="uswds-wc"]');
  const jsLoaded = !!existingScript;

  if (cssLoaded && jsLoaded) {
    debug('USWDS resources already loaded in this canvas');
    return;
  }

  // If CSS link exists but stylesheet not loaded, remove stale links
  if (existingCssLink && !existingCssLink.sheet) {
    debug('Removing stale USWDS link tags');
    doc.querySelectorAll('link[href*="uswds"]').forEach((el: Element) => el.remove());
  }

  debug('Loading USWDS resources into canvas iframe', { cssLoaded, jsLoaded });

  try {
    // 1. Load CSS files (skip if already loaded, e.g., via canvas.styles config)
    if (!cssLoaded) {
      const uswdsCss = doc.createElement('link');
      uswdsCss.rel = 'stylesheet';
      uswdsCss.href = CDN_URLS.uswdsCss;

      const uswdsWcCss = doc.createElement('link');
      uswdsWcCss.rel = 'stylesheet';
      uswdsWcCss.href = CDN_URLS.uswdsWcCss;

      doc.head.appendChild(uswdsCss);
      doc.head.appendChild(uswdsWcCss);

      await Promise.all([
        waitForLoad(uswdsCss, 'USWDS CSS', signal),
        waitForLoad(uswdsWcCss, 'USWDS-WC CSS', signal),
      ]);

      if (signal?.aborted) {
        debug('loadUSWDSResources aborted after CSS load');
        return;
      }
    } else {
      debug('CSS already loaded (via canvas.styles), skipping CSS injection');
    }

    // 2. Load USWDS-WC bundle JS (module script)
    if (!jsLoaded) {
      const uswdsWcScript = doc.createElement('script');
      uswdsWcScript.type = 'module';
      uswdsWcScript.src = CDN_URLS.uswdsWcJs;
      doc.head.appendChild(uswdsWcScript);

      await waitForLoad(uswdsWcScript, 'USWDS-WC JS', signal);

      if (signal?.aborted) {
        debug('loadUSWDSResources aborted after JS load');
        return;
      }
    } else {
      debug('JS already loaded, skipping JS injection');
    }

    // Note: USWDS JavaScript (uswds.min.js) is NOT loaded here because:
    // - All components are web components that handle their own behavior internally
    // - Loading USWDS JS would conflict with web component event handlers
    // - The usa-header web component has its own mobile menu toggle via Lit events

    // 3. Wait for critical custom elements to be registered
    const iframeWindow = canvas.getWindow();
    if (iframeWindow) {
      const criticalElements = ['usa-button', 'usa-header', 'usa-footer', 'usa-alert'];
      await waitForCustomElements(iframeWindow, criticalElements, 5000, signal);
    }

    // Final abort check before refresh
    if (signal?.aborted) {
      debug('loadUSWDSResources aborted before refresh');
      return;
    }

    debug('All USWDS resources loaded successfully');

    // 4. Trigger a canvas refresh
    setTimeout(() => {
      if (!signal?.aborted) {
        editor.refresh();
        debug('Canvas refreshed after resource load');
      }
    }, 100);

  } catch (err) {
    // Don't log abort errors as they're expected during page switching
    if (err instanceof DOMException && err.name === 'AbortError') {
      debug('loadUSWDSResources aborted');
      return;
    }
    debug('Error loading resources:', err);
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
 * Add custom CSS to canvas for fieldset spacing
 * USWDS .usa-fieldset sets margin: 0, which overrides .usa-form-group margin-top
 * This CSS ensures fieldsets get proper spacing in the canvas
 */
export function addFieldsetSpacingCSS(editor: EditorInstance): void {
  const canvasFrame = editor.Canvas?.getFrameEl();
  if (canvasFrame?.contentDocument) {
    const style = canvasFrame.contentDocument.createElement('style');
    style.textContent = `
      /* Ensure fieldsets with usa-form-group get proper margin-top */
      /* This overrides the usa-fieldset margin: 0 reset */
      fieldset.usa-fieldset.usa-form-group {
        margin-top: 1.5rem !important;
      }
    `;
    canvasFrame.contentDocument.head.appendChild(style);
    debug('Added fieldset spacing CSS to canvas');
  }
}

/**
 * Add custom CSS to canvas for USWDS typography on plain HTML elements.
 * USWDS scopes its heading/paragraph font styles to .usa-prose, so bare
 * h1-h6 and p elements fall back to browser defaults.  This ensures the
 * USWDS font stack is applied to all common text elements in the canvas.
 */
export function addTypographyCSS(editor: EditorInstance): void {
  const canvasFrame = editor.Canvas?.getFrameEl();
  if (canvasFrame?.contentDocument) {
    const style = canvasFrame.contentDocument.createElement('style');
    style.textContent = `
      /* Apply USWDS font stack to base text elements */
      body, h1, h2, h3, h4, h5, h6, p, li, td, th, label, input, textarea, select, button {
        font-family: "Source Sans Pro Web", "Helvetica Neue", Helvetica, Roboto, Arial, sans-serif;
      }
    `;
    canvasFrame.contentDocument.head.appendChild(style);
    debug('Added typography CSS to canvas');
  }
}

/**
 * Add custom CSS to canvas for button group styling
 * Removes excessive padding from usa-button-group web component
 */
export function addButtonGroupCSS(editor: EditorInstance): void {
  const canvasFrame = editor.Canvas?.getFrameEl();
  if (canvasFrame?.contentDocument) {
    const style = canvasFrame.contentDocument.createElement('style');
    style.textContent = `
      /* Reset padding on usa-button-group web component */
      usa-button-group {
        display: block;
        padding: 0 !important;
        margin: 0;
      }
      /* Ensure the inner ul has proper USWDS styling */
      usa-button-group ul.usa-button-group {
        padding: 0;
        margin: 0;
      }
    `;
    canvasFrame.contentDocument.head.appendChild(style);
    debug('Added button group CSS to canvas');
  }
}

/**
 * Remove the GrapesJS wrapper's `min-height: 100vh` so the canvas layout
 * matches preview/export (no large gap between content and footer).
 * GrapesJS injects this rule to ensure there's always drop space, but
 * it creates a visual mismatch with the preview.
 */
export function addWrapperOverrideCSS(editor: EditorInstance): void {
  const canvasFrame = editor.Canvas?.getFrameEl();
  if (canvasFrame?.contentDocument) {
    const style = canvasFrame.contentDocument.createElement('style');
    style.textContent = `
      /* Remove min-height so content flows naturally like in preview */
      [data-gjs-type="wrapper"] {
        min-height: auto !important;
      }
    `;
    canvasFrame.contentDocument.head.appendChild(style);
    debug('Added wrapper override CSS to canvas');
  }
}

/**
 * Add CSS to canvas to ensure usa-banner starts collapsed.
 * The web component renders its accordion content visible by default;
 * requestUpdate() re-renders and removes the JS-set `hidden` attribute.
 * A CSS rule is more reliable because it applies immediately and can't
 * be undone by a re-render cycle.
 */
export function addBannerCollapseCSS(editor: EditorInstance): void {
  const canvasFrame = editor.Canvas?.getFrameEl();
  if (canvasFrame?.contentDocument) {
    const style = canvasFrame.contentDocument.createElement('style');
    style.textContent = `
      /* Collapse usa-banner accordion content by default */
      usa-banner .usa-banner__content {
        display: none !important;
      }
      usa-banner .usa-banner__header--expanded + .usa-banner__content,
      usa-banner[expanded] .usa-banner__content {
        display: block !important;
      }
    `;
    canvasFrame.contentDocument.head.appendChild(style);
    debug('Added banner collapse CSS to canvas');
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
    debug('Failed to clear GrapesJS storage:', e);
  }
}
