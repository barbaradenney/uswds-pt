/**
 * Page Management
 *
 * Handles page lifecycle events (add/select/remove), template injection
 * for new pages, frame readiness synchronization, and page-link trait updates.
 */

import { createDebugLogger } from '@uswds-pt/shared';
import { DEFAULT_CONTENT } from '@uswds-pt/adapter';
import { loadUSWDSResources } from '../resource-loader';
import { isExtractingPerPageHtml } from '../data-extractor';
import {
  forceCanvasUpdate,
  reinitInteractiveHandlers,
  syncPageLinkHrefs,
} from '../canvas-helpers';
import type { UseEditorStateMachineReturn } from '../../../hooks/useEditorStateMachine';
import type { EditorInstance, RegisterListener } from './types';

const debug = createDebugLogger('GrapesJSSetup');

/**
 * Wait for canvas frame to be ready, with timeout fallback.
 * Uses event-based synchronization instead of hardcoded delays.
 */
export function waitForFrameReady(
  editor: EditorInstance,
  timeoutMs: number = 300,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    let resolved = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      editor.off('canvas:frame:load', onFrameLoad);
    };

    const onFrameLoad = () => {
      if (resolved) return;
      resolved = true;
      signal?.removeEventListener('abort', onAbort);
      cleanup();
      debug('Frame ready (event)');
      resolve();
    };

    const onAbort = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    const cleanupAll = () => {
      signal?.removeEventListener('abort', onAbort);
      cleanup();
    };

    editor.on('canvas:frame:load', onFrameLoad);

    timeoutId = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      cleanupAll();
      debug('Frame ready (timeout fallback)');
      resolve();
    }, timeoutMs);

    const frame = editor.Canvas?.getFrame?.();
    if (frame?.loaded || editor.Canvas?.getDocument?.()) {
      if (!resolved) {
        resolved = true;
        cleanupAll();
        debug('Frame already ready');
        resolve();
      }
    }
  });
}

/**
 * Build a new-page template by copying header/footer from an existing page.
 */
export function buildTemplateFromExistingPage(editor: EditorInstance): string | null {
  const HEADER_TAGS = ['usa-banner', 'usa-header'];
  const FOOTER_TAGS = ['usa-footer', 'usa-identifier'];

  const allPages = editor.Pages?.getAll?.() || [];
  const currentPageId = editor.Pages?.getSelected?.()?.getId?.();

  const sourcePage = allPages.find((p: any) => {
    const pid = p.getId?.() || p.id;
    return pid !== currentPageId;
  });
  if (!sourcePage) return null;

  const sourceWrapper = sourcePage.getMainComponent?.();
  if (!sourceWrapper) return null;

  const headerParts: string[] = [];
  const footerParts: string[] = [];

  const collect = (comp: any) => {
    const tag = (comp.get?.('tagName') || '').toLowerCase();
    if (HEADER_TAGS.includes(tag)) headerParts.push(comp.toHTML());
    else if (FOOTER_TAGS.includes(tag)) footerParts.push(comp.toHTML());
    const children = comp.components?.();
    if (children) children.forEach((child: any) => collect(child));
  };
  collect(sourceWrapper);

  if (headerParts.length === 0) return null;

  return `<div class="page-template">
  ${headerParts.join('\n  ')}
  <main id="main-content" class="grid-container" style="padding: 2rem 0; min-height: 400px;">
    <div class="grid-row">
      <div class="grid-col-12"></div>
    </div>
  </main>
  ${footerParts.join('\n  ')}
</div>`;
}

/**
 * Set up page event handlers (add/select/remove)
 */
export function setupPageEventHandlers(
  editor: EditorInstance,
  registerListener: RegisterListener,
  stateMachine: UseEditorStateMachineReturn
): { markInitialized: () => void } {
  const pagesNeedingTemplate = new Set<string>();
  let isInitialized = false;
  let pendingPageSwitch: AbortController | null = null;

  registerListener(editor, 'page:select', async (page: any) => {
    if (isExtractingPerPageHtml()) return;

    const pageId = page?.getId?.() || page?.id;
    const pageName = page?.get?.('name') || page?.getName?.() || 'unnamed';
    debug('Page selected:', pageId, '-', pageName);

    if (pendingPageSwitch) {
      pendingPageSwitch.abort();
      stateMachine.pageSwitchComplete();
    }
    pendingPageSwitch = new AbortController();
    const signal = pendingPageSwitch.signal;

    stateMachine.pageSwitchStart();

    try {
      await waitForFrameReady(editor, 300, signal);
      if (signal.aborted) {
        debug('Page switch aborted (new switch started)');
        return;
      }

      await loadUSWDSResources(editor, signal);
      if (signal.aborted) return;

      // Inject template into newly added pages
      if (pageId && pagesNeedingTemplate.has(pageId)) {
        pagesNeedingTemplate.delete(pageId);

        try {
          const mainComponent = editor.DomComponents?.getWrapper?.();
          if (mainComponent) {
            const existingComponents = mainComponent.components?.();
            const componentCount = existingComponents?.length || 0;

            let shouldAddTemplate = componentCount === 0;

            if (!shouldAddTemplate && componentCount <= 3) {
              const componentTypes = existingComponents.map((c: any) =>
                c.get?.('tagName')?.toLowerCase() || c.get?.('type') || ''
              );
              const isDefaultContent = componentTypes.every((type: string) =>
                ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'text', 'default', 'heading-block', 'text-block'].includes(type)
              );
              if (isDefaultContent) shouldAddTemplate = true;
            }

            if (shouldAddTemplate) {
              let templateHtml = buildTemplateFromExistingPage(editor);
              if (!templateHtml) {
                templateHtml = DEFAULT_CONTENT['blank-template']?.replace('__FULL_HTML__', '') || '';
              }
              if (templateHtml) {
                mainComponent.components(templateHtml);
                debug('Added template to new page');
              }
            }
          }
        } catch (err) {
          debug('Error adding template to new page:', err);
        }
      }

      forceCanvasUpdate(editor);
      reinitInteractiveHandlers(editor);
      syncPageLinkHrefs(editor);
      debug('Page switch completed');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        debug('Page switch aborted');
        return;
      }
      if (!signal.aborted) debug('Page switch warning:', err);
    } finally {
      if (!signal.aborted) {
        stateMachine.pageSwitchComplete();
        debug('Page switch lock released');
      }
    }
  });

  registerListener(editor, 'page:add', (page: any) => {
    const pageId = page?.getId?.() || page?.id;
    const pageName = page?.get?.('name') || page?.getName?.() || 'New Page';
    debug('Page added:', pageId, '-', pageName);
    if (pageId && isInitialized) {
      pagesNeedingTemplate.add(pageId);
      debug('Marked page for template:', pageId);
    } else {
      debug('Skipping template mark for initial page:', pageId);
    }
  });

  registerListener(editor, 'page:remove', (page: any) => {
    const pageId = page?.getId?.() || page?.id;
    debug('Page removed:', pageId);
  });

  return {
    markInitialized: () => {
      isInitialized = true;
      debug('Page event handlers: init complete, template injection enabled');
    },
  };
}

/**
 * Set up page-link trait updates
 */
export function setupPageLinkTrait(
  editor: EditorInstance,
  registerListener: RegisterListener
): void {
  const updatePageLinkOptions = (component: any) => {
    if (!component) return;

    const pages = editor.Pages?.getAll?.() || [];
    const currentPage = editor.Pages?.getSelected?.() || null;

    const pageOptions = [
      { id: '', label: '-- Select a page --' },
      ...pages
        .filter((page: any) => !currentPage || page !== currentPage)
        .map((page: any) => ({
          id: page.getId?.() || page.id,
          label: page.get?.('name') || page.getName?.() || `Page ${page.getId?.() || page.id}`,
        })),
    ];

    const pageLinkTrait = component.getTrait?.('page-link');
    if (pageLinkTrait) {
      pageLinkTrait.set('options', pageOptions);
      debug('Updated page-link options:', pageOptions);
    }

    for (let i = 1; i <= 4; i++) {
      const btnPageLinkTrait = component.getTrait?.(`btn${i}-page-link`);
      if (btnPageLinkTrait) {
        btnPageLinkTrait.set('options', pageOptions);
        debug(`Updated btn${i}-page-link options`);
      }
    }
  };

  registerListener(editor, 'component:selected', (component: any) => {
    updatePageLinkOptions(component);
  });

  registerListener(editor, 'page', () => {
    const selected = editor.getSelected?.();
    if (selected) updatePageLinkOptions(selected);
  });
}
