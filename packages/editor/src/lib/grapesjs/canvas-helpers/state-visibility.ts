/**
 * Canvas Helpers — State & User Visibility
 *
 * Applies visual dimming to components that are hidden in the currently
 * active state or user persona. Uses AND logic: a component must pass
 * both state and user checks to be fully visible.
 */

import { createDebugLogger } from '@uswds-pt/shared';
import type { EditorInstance } from '../../../types/grapesjs';

const debug = createDebugLogger('Canvas');

/**
 * Apply state + user visibility dimming to canvas components.
 * Uses AND logic: component must pass both state and user checks to be visible.
 * - State pass: no active state, OR no `data-states`, OR ID matches
 * - User pass: no active user, OR no `data-users`, OR ID matches
 * Component is dimmed if !(statePass && userPass).
 */
export function applyStateVisibility(editor: EditorInstance, activeStateId: string | null): void {
  const doc = editor.Canvas?.getDocument?.();
  if (!doc) return;

  const wrapper = editor.DomComponents?.getWrapper?.();
  if (!wrapper) return;

  const activeUserId: string | null = (editor as any).__activeUserId ?? null;

  const walkComponent = (comp: any) => {
    const el = comp.getEl?.();
    const attrs = comp.getAttributes?.() || {};

    // State pass
    const dataStates = attrs['data-states'] || '';
    const statePass = activeStateId === null || !dataStates ||
      dataStates.split(',').map((s: string) => s.trim()).includes(activeStateId);

    // User pass
    const dataUsers = attrs['data-users'] || '';
    const userPass = activeUserId === null || !dataUsers ||
      dataUsers.split(',').map((s: string) => s.trim()).includes(activeUserId);

    if (el?.classList) {
      if (statePass && userPass) {
        el.classList.remove('gjs-state-dimmed');
      } else {
        el.classList.add('gjs-state-dimmed');
      }
    }

    const children = comp.components?.();
    if (children) {
      children.forEach((child: any) => walkComponent(child));
    }
  };

  walkComponent(wrapper);
}

/**
 * Set up a watcher that re-applies state visibility when the active state
 * changes or when components are added/removed/page-switched.
 */
export function setupStateVisibilityWatcher(
  editor: EditorInstance,
  registerListener: (event: string, handler: (...args: unknown[]) => void) => void
): void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const refresh = () => {
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      const activeStateId = (editor as any).__activeStateId ?? null;
      applyStateVisibility(editor, activeStateId);
    }, 150);
  };

  // Re-apply when active state changes
  registerListener('state:select', () => {
    // Immediate apply for state switch (no debounce)
    const activeStateId = (editor as any).__activeStateId ?? null;
    applyStateVisibility(editor, activeStateId);
  });

  // Re-apply when active user changes
  registerListener('user:select', () => {
    const activeStateId = (editor as any).__activeStateId ?? null;
    applyStateVisibility(editor, activeStateId);
  });

  // Re-apply on structural changes (debounced)
  registerListener('component:add', refresh);
  registerListener('component:remove', refresh);
  registerListener('page:select', refresh);

  // Re-apply when component attributes change (covers checkbox trait
  // toggling data-states / data-users). Uses the narrower
  // `component:update:attributes` event instead of `component:update`
  // to avoid excessive tree-walks on every model change.
  registerListener('component:update:attributes', refresh);
}
