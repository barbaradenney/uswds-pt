/**
 * Canvas Helpers — Interactive Component Handlers
 *
 * Click and change handlers for USWDS web components in the canvas:
 * page links, banner toggle, accordion toggle, modal open/close,
 * and conditional field visibility.
 */

import { createDebugLogger } from '@uswds-pt/shared';
import type { EditorInstance } from '../../../types/grapesjs';
import { GJS_EVENTS } from '../../contracts';
import { addTrackedDocumentListener, isDocumentHandled, markDocumentHandled } from './tracking';

const debug = createDebugLogger('Canvas');

// ============================================================================
// Page Link Handler
// ============================================================================

/**
 * Set up page link click handler for navigation within prototypes
 */
export function setupPageLinkHandler(editor: EditorInstance): void {
  const canvas = editor.Canvas;
  const doc = canvas?.getDocument?.();
  if (!doc) return;

  const handlerKey = 'pageLink';
  if (isDocumentHandled(doc, handlerKey)) return;
  markDocumentHandled(doc, handlerKey);

  const handler = (e: Event) => {
    const mouseEvent = e as MouseEvent;
    // Only handle clicks in preview mode (not editing mode)
    const isPreviewMode = editor.Commands?.isActive?.('preview');
    if (!isPreviewMode) return;

    const target = mouseEvent.target as HTMLElement;
    const link = target.closest('[href^="#page-"]') as HTMLElement;
    if (link) {
      mouseEvent.preventDefault();
      mouseEvent.stopPropagation();
      const href = link.getAttribute('href');
      if (href) {
        const pageId = href.replace('#page-', '');
        const pages = editor.Pages;
        const targetPage = pages?.get?.(pageId);
        if (targetPage) {
          pages.select(targetPage);
          debug('Navigated to page:', pageId);
        }
      }
    }
  };

  addTrackedDocumentListener(doc, 'click', handler);
}

// ============================================================================
// Banner Click Handler
// ============================================================================

/**
 * Set up banner click handler to toggle "Here's how you know" section
 */
export function setupBannerClickHandler(editor: EditorInstance): void {
  const canvas = editor.Canvas;
  const doc = canvas?.getDocument?.();
  if (!doc) return;

  const handlerKey = 'banner';
  if (isDocumentHandled(doc, handlerKey)) return;
  markDocumentHandled(doc, handlerKey);

  const handler = (e: Event) => {
    const mouseEvent = e as MouseEvent;
    const target = mouseEvent.target as HTMLElement;
    const banner = target.closest('usa-banner') as HTMLElement;
    if (!banner) return;

    const isActionButton = target.closest('.usa-banner__button') ||
      target.closest('.usa-banner__header-action') ||
      target.closest('[aria-controls]');

    if (isActionButton) {
      mouseEvent.preventDefault();
      mouseEvent.stopPropagation();

      const isCurrentlyExpanded = banner.hasAttribute('expanded');
      if (isCurrentlyExpanded) {
        banner.removeAttribute('expanded');
        (banner as any).expanded = false;
      } else {
        banner.setAttribute('expanded', '');
        (banner as any).expanded = true;
      }

      if (typeof (banner as any).requestUpdate === 'function') {
        (banner as any).requestUpdate();
      }

      // Update the GrapesJS component model
      const gjsComponent = editor.DomComponents?.getWrapper()?.find('usa-banner')?.[0];
      if (gjsComponent) {
        const attrs = gjsComponent.get('attributes') || {};
        if (isCurrentlyExpanded) {
          delete attrs.expanded;
        } else {
          attrs.expanded = true;
        }
        gjsComponent.set('attributes', { ...attrs });
      }

      debug('Toggled usa-banner expanded state:', !isCurrentlyExpanded);
    }
  };

  addTrackedDocumentListener(doc, 'click', handler, true);
}

// ============================================================================
// Accordion Click Handler
// ============================================================================

/**
 * Set up accordion click handler
 */
export function setupAccordionClickHandler(editor: EditorInstance): void {
  const canvas = editor.Canvas;
  const doc = canvas?.getDocument?.();
  if (!doc) return;

  const handlerKey = 'accordion';
  if (isDocumentHandled(doc, handlerKey)) return;
  markDocumentHandled(doc, handlerKey);

  const handler = (e: Event) => {
    const mouseEvent = e as MouseEvent;
    const target = mouseEvent.target as HTMLElement;
    const accordion = target.closest('usa-accordion') as HTMLElement;
    if (!accordion) return;

    const headerButton = target.closest('.usa-accordion__button') ||
      target.closest('[aria-controls^="accordion"]') ||
      target.closest('button[aria-expanded]');

    if (headerButton && headerButton.closest('usa-accordion') === accordion) {
      mouseEvent.preventDefault();
      mouseEvent.stopPropagation();

      const ariaControls = headerButton.getAttribute('aria-controls');
      const isExpanded = headerButton.getAttribute('aria-expanded') === 'true';

      headerButton.setAttribute('aria-expanded', String(!isExpanded));

      if (ariaControls) {
        const content = accordion.querySelector(`#${ariaControls}`) as HTMLElement;
        if (content) {
          content.hidden = isExpanded;
        }
      }

      if (typeof (accordion as any).requestUpdate === 'function') {
        (accordion as any).requestUpdate();
      }

      debug('Toggled usa-accordion section:', ariaControls, 'expanded:', !isExpanded);
    }
  };

  addTrackedDocumentListener(doc, 'click', handler, true);
}

// ============================================================================
// Modal Click Handler
// ============================================================================

/**
 * Set up modal click handler.
 * Handles trigger clicks (inside or outside usa-modal), close buttons,
 * and backdrop/overlay clicks.
 */
export function setupModalClickHandler(editor: EditorInstance): void {
  const canvas = editor.Canvas;
  const doc = canvas?.getDocument?.();
  if (!doc) return;

  const handlerKey = 'modal';
  if (isDocumentHandled(doc, handlerKey)) return;
  markDocumentHandled(doc, handlerKey);

  /** Find the target usa-modal for a trigger outside usa-modal via aria-controls */
  const findModalByTrigger = (trigger: HTMLElement): HTMLElement | null => {
    const ariaControls = trigger.getAttribute('aria-controls');
    if (ariaControls) {
      const el = doc.getElementById(ariaControls);
      if (el) {
        if (el.tagName.toLowerCase() === 'usa-modal') return el;
        const parentModal = el.closest('usa-modal');
        if (parentModal) return parentModal as HTMLElement;
      }
    }
    return null;
  };

  const openModal = (modal: HTMLElement) => {
    modal.setAttribute('open', '');
    (modal as any).open = true;
    if (typeof (modal as any).requestUpdate === 'function') {
      (modal as any).requestUpdate();
    }
    debug('Opened usa-modal');
  };

  const closeModal = (modal: HTMLElement) => {
    modal.removeAttribute('open');
    (modal as any).open = false;
    if (typeof (modal as any).requestUpdate === 'function') {
      (modal as any).requestUpdate();
    }
    debug('Closed usa-modal');
  };

  const handler = (e: Event) => {
    const mouseEvent = e as MouseEvent;
    const target = mouseEvent.target as HTMLElement;

    // Case 1: Trigger click (inside or outside usa-modal)
    const trigger = target.closest('.usa-modal__trigger') ||
      target.closest('[data-open-modal]') ||
      target.closest('.usa-button[aria-controls]');

    if (trigger) {
      const modal = (trigger as HTMLElement).closest('usa-modal') as HTMLElement ||
        findModalByTrigger(trigger as HTMLElement);
      if (modal) {
        mouseEvent.preventDefault();
        mouseEvent.stopPropagation();
        openModal(modal);
        return;
      }
    }

    // Case 2: Close button click
    const closeButton = target.closest('[data-close-modal]') ||
      target.closest('.usa-modal__close');

    if (closeButton) {
      const modal = (closeButton as HTMLElement).closest('usa-modal') as HTMLElement;
      if (modal) {
        mouseEvent.preventDefault();
        mouseEvent.stopPropagation();
        closeModal(modal);
        return;
      }
    }

    // Case 3: Backdrop/overlay click (close unless force-action)
    const overlay = target.closest('.usa-modal__overlay');
    if (overlay && !target.closest('.usa-modal__main')) {
      const modal = (overlay as HTMLElement).closest('usa-modal') as HTMLElement;
      if (modal && !modal.hasAttribute('force-action')) {
        mouseEvent.preventDefault();
        mouseEvent.stopPropagation();
        closeModal(modal);
        return;
      }
    }
  };

  addTrackedDocumentListener(doc, 'click', handler, true);
}

// ============================================================================
// Conditional Field Handlers
// ============================================================================

/**
 * Apply conditional field visibility based on current checkbox/radio state.
 * Finds all elements with data-reveals/data-hides and sets visibility
 * of their target elements. Safe to call repeatedly.
 */
function applyConditionalFieldVisibility(doc: Document): void {
  const getTargets = (idString: string | null): HTMLElement[] => {
    if (!idString) return [];
    return idString.split(',')
      .map(id => id.trim())
      .filter(id => id)
      .map(id => doc.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
  };

  doc.querySelectorAll('[data-reveals], [data-hides]').forEach((trigger: Element) => {
    const revealsTargets = getTargets(trigger.getAttribute('data-reveals'));
    const hidesTargets = getTargets(trigger.getAttribute('data-hides'));
    if (revealsTargets.length === 0 && hidesTargets.length === 0) return;

    // Prefer the inner <input>'s runtime checked state over the outer
    // element's `checked` attribute. The attribute reflects design-time
    // state and doesn't update when users click in the canvas, whereas
    // the inner input tracks the actual runtime state.
    const input = trigger.querySelector('input') as HTMLInputElement | null;
    const isChecked = input ? input.checked : trigger.hasAttribute('checked');

    revealsTargets.forEach(t => {
      if (isChecked) {
        t.removeAttribute('hidden');
        t.style.display = '';
      } else {
        t.setAttribute('hidden', '');
        t.style.display = 'none';
      }
    });

    hidesTargets.forEach(t => {
      if (isChecked) {
        t.setAttribute('hidden', '');
        t.style.display = 'none';
      } else {
        t.removeAttribute('hidden');
        t.style.display = '';
      }
    });
  });
}

/**
 * Set up conditional fields handler in the canvas.
 * Attaches a delegated change listener for checkboxes/radios with
 * data-reveals/data-hides attributes and sets initial visibility.
 */
export function setupConditionalFieldsHandler(editor: EditorInstance): void {
  const doc = editor.Canvas?.getDocument?.();
  if (!doc) return;

  const handlerKey = 'conditionalFields';
  if (isDocumentHandled(doc, handlerKey)) return;
  markDocumentHandled(doc, handlerKey);

  const handler = (e: Event) => {
    const target = e.target as HTMLElement;
    const trigger = target.closest?.('[data-reveals], [data-hides]') as HTMLElement;
    if (!trigger) return;

    const tagName = trigger.tagName.toLowerCase();
    if (tagName !== 'usa-checkbox' && tagName !== 'usa-radio') return;

    // Re-apply all conditional visibility (handles radio groups correctly)
    applyConditionalFieldVisibility(doc);
    debug('Conditional field visibility updated');
  };

  addTrackedDocumentListener(doc, 'change', handler, true);

  // Set initial visibility state
  applyConditionalFieldVisibility(doc);
  debug('Conditional fields handler initialized');
}

/**
 * Set up a GrapesJS event watcher that re-applies conditional field
 * visibility when component attributes change (user edits traits panel).
 */
export function setupConditionalFieldsWatcher(
  editor: EditorInstance,
  registerListener: (event: string, handler: (...args: unknown[]) => void) => void
): void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const refresh = () => {
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      const doc = editor.Canvas?.getDocument?.();
      if (doc) {
        applyConditionalFieldVisibility(doc);
      }
    }, 150);
  };

  registerListener(GJS_EVENTS.COMPONENT_UPDATE_ATTRS, refresh);
  registerListener(GJS_EVENTS.COMPONENT_ADD, refresh);
  registerListener(GJS_EVENTS.COMPONENT_REMOVE, refresh);
}

// ============================================================================
// Aggregate Setup
// ============================================================================

/**
 * Re-initialize all interactive handlers for the current canvas document.
 *
 * Call this after the canvas frame is ready (e.g. after resource loading
 * completes on page switch). Each handler is idempotent — the WeakMap guard
 * prevents duplicate listeners on the same document.
 */
export function reinitInteractiveHandlers(editor: EditorInstance): void {
  setupPageLinkHandler(editor);
  setupBannerClickHandler(editor);
  setupAccordionClickHandler(editor);
  setupModalClickHandler(editor);
  setupConditionalFieldsHandler(editor);
}

/**
 * Set up all interactive component handlers on canvas:frame:load.
 *
 * Only registers on canvas:frame:load (not page:select) because page:select
 * fires before the new frame is ready. The consolidated page:select handler
 * in setupPageEventHandlers calls reinitInteractiveHandlers() after awaiting
 * frame readiness, which is the correct time to attach document listeners.
 */
export function setupAllInteractiveHandlers(
  editor: EditorInstance,
  registerListener: (event: string, handler: (...args: unknown[]) => void) => void
): void {
  registerListener(GJS_EVENTS.CANVAS_FRAME_LOAD, () => reinitInteractiveHandlers(editor));
}
