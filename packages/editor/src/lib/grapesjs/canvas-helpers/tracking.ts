/**
 * Canvas Helpers — Tracking Infrastructure
 *
 * Manages tracked timeouts and document event listeners for proper cleanup
 * when the editor is destroyed or the canvas iframe changes.
 */

import { createDebugLogger } from '@uswds-pt/shared';

const debug = createDebugLogger('Canvas');

// ============================================================================
// Timeout Management
// ============================================================================

/** Track active timeouts for cleanup */
export const activeTimeouts = new Set<ReturnType<typeof setTimeout>>();

/**
 * Create a tracked timeout that will be automatically cleaned up
 */
export function createTrackedTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout> {
  const timeoutId = setTimeout(() => {
    activeTimeouts.delete(timeoutId);
    callback();
  }, delay);
  activeTimeouts.add(timeoutId);
  return timeoutId;
}

/**
 * Clear all active timeouts
 */
export function clearAllTimeouts(): void {
  activeTimeouts.forEach((timeoutId) => {
    clearTimeout(timeoutId);
  });
  activeTimeouts.clear();
  debug('Cleared', activeTimeouts.size, 'active timeouts');
}

// ============================================================================
// Document Event Listener Management
// ============================================================================

interface TrackedListener {
  doc: Document;
  type: string;
  handler: EventListener;
  options?: boolean | AddEventListenerOptions;
}

/** Track document event listeners for cleanup */
const documentListeners: TrackedListener[] = [];

/**
 * Add a tracked event listener to a document
 */
export function addTrackedDocumentListener(
  doc: Document | null | undefined,
  type: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions
): void {
  // Validate document before adding listener
  if (!doc || typeof doc.addEventListener !== 'function') {
    debug('Cannot add listener: invalid document');
    return;
  }

  try {
    doc.addEventListener(type, handler, options);
    documentListeners.push({ doc, type, handler, options });
  } catch (err) {
    debug('Failed to add document listener:', err);
  }
}

/**
 * Remove all tracked document event listeners
 */
export function removeAllDocumentListeners(): void {
  let removed = 0;
  let skipped = 0;

  documentListeners.forEach(({ doc, type, handler, options }) => {
    // Check if document is still valid before trying to remove listener
    if (!doc || typeof doc.removeEventListener !== 'function') {
      skipped++;
      return;
    }

    try {
      doc.removeEventListener(type, handler, options);
      removed++;
    } catch {
      // Document may no longer be available (iframe destroyed, etc.)
      skipped++;
    }
  });

  const total = documentListeners.length;
  documentListeners.length = 0;
  debug('Document listeners cleanup: removed', removed, 'skipped', skipped, 'of', total);
}

// ============================================================================
// Document Handler Deduplication
// ============================================================================

// Track which documents have had handlers attached (using WeakMap to avoid memory leaks)
const handledDocs = new WeakMap<Document, Set<string>>();

export function isDocumentHandled(doc: Document, handlerKey: string): boolean {
  const handled = handledDocs.get(doc);
  return handled?.has(handlerKey) ?? false;
}

export function markDocumentHandled(doc: Document, handlerKey: string): void {
  let handled = handledDocs.get(doc);
  if (!handled) {
    handled = new Set();
    handledDocs.set(doc, handled);
  }
  handled.add(handlerKey);
}
