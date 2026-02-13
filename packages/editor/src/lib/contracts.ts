/**
 * Implicit Contracts Registry
 *
 * Centralizes magic strings used across multiple files.
 * Import from here instead of defining inline to prevent silent breakage.
 */

// ============================================================================
// Custom GrapesJS Events (non-standard, fired by our code)
// ============================================================================

export const EDITOR_EVENTS = {
  /** Active state changed — fired from CanvasToolbar, listened in state-visibility */
  STATE_SELECT: 'state:select',
  /** Active user persona changed — fired from CanvasToolbar, listened in state-visibility */
  USER_SELECT: 'user:select',
} as const;

// ============================================================================
// Editor Properties (attached to editor instance, read by canvas helpers)
// ============================================================================

export const EDITOR_PROPS = {
  ACTIVE_STATE_ID: '__activeStateId',
  ACTIVE_USER_ID: '__activeUserId',
} as const;

// ============================================================================
// DOM Data Attributes (used in canvas, export, and traits)
// ============================================================================

export const DATA_ATTRS = {
  /** Comma-separated state IDs for visibility gating */
  STATES: 'data-states',
  /** Comma-separated user persona IDs for visibility gating */
  USERS: 'data-users',
  /** Page wrapper ID in exported multi-page documents */
  PAGE_ID: 'data-page-id',
  /** Page display name in exported multi-page documents */
  PAGE_NAME: 'data-page-name',
} as const;

// ============================================================================
// CSS Classes (used across canvas helpers, resource-loader, export)
// ============================================================================

export const CSS_CLASSES = {
  /** Applied to components hidden by state/user visibility rules */
  STATE_DIMMED: 'gjs-state-dimmed',
} as const;
