/**
 * Implicit Contracts Registry
 *
 * Centralizes magic strings used across multiple files.
 * Import from here instead of defining inline to prevent silent breakage.
 */

// ============================================================================
// Standard GrapesJS Events (commonly used across multiple files)
// ============================================================================

export const GJS_EVENTS = {
  // Component lifecycle
  COMPONENT_SELECTED: 'component:selected',
  COMPONENT_DESELECTED: 'component:deselected',
  COMPONENT_ADD: 'component:add',
  COMPONENT_REMOVE: 'component:remove',
  COMPONENT_UPDATE: 'component:update',
  COMPONENT_UPDATE_ATTRS: 'component:update:attributes',
  COMPONENT_MOUNT: 'component:mount',
  COMPONENT_DRAG_END: 'component:drag:end',

  // Canvas
  CANVAS_FRAME_LOAD: 'canvas:frame:load',

  // Pages
  PAGE_SELECT: 'page:select',
  PAGE_ADD: 'page:add',
  PAGE_REMOVE: 'page:remove',

  // Editor
  CHANGES_COUNT: 'change:changesCount',
  LOAD: 'load',
  DESTROY: 'destroy',

  // Commands
  RUN: 'run',
  STOP: 'stop',

  // Devices
  DEVICE_SELECT: 'device:select',

  // Symbols (native GrapesJS symbol system)
  SYMBOL_MAIN_ADD: 'symbol:main:add',
  SYMBOL_MAIN_UPDATE: 'symbol:main:update',
  SYMBOL_MAIN_REMOVE: 'symbol:main:remove',
  SYMBOL_INSTANCE_ADD: 'symbol:instance:add',
  SYMBOL_INSTANCE_REMOVE: 'symbol:instance:remove',
  SYMBOL: 'symbol',
} as const;

// ============================================================================
// Custom USWDS-PT Events (non-standard, fired by our code)
// ============================================================================

export const EDITOR_EVENTS = {
  /** Active state changed — fired from CanvasToolbar, listened in state-visibility */
  STATE_SELECT: 'state:select',
  /** Active user persona changed — fired from CanvasToolbar, listened in state-visibility */
  USER_SELECT: 'user:select',
  /** Org state definitions changed — synced from Editor.tsx to canvas helpers */
  STATES_UPDATE: 'states:update',
  /** Org user definitions changed — synced from Editor.tsx to canvas helpers */
  USERS_UPDATE: 'users:update',
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
