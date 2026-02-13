/**
 * Shared types for GrapesJS setup modules
 */

import type { EditorInstance } from '../../../types/grapesjs';

/**
 * Function signature for registering editor event listeners with automatic cleanup tracking.
 */
export type RegisterListener = (
  editor: EditorInstance,
  event: string,
  handler: (...args: unknown[]) => void
) => void;

export type { EditorInstance };
