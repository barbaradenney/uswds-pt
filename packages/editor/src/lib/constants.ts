/**
 * Named timing constants used across the editor package.
 *
 * Centralizes magic numbers to make their purpose clear and
 * ensure consistent values when the same delay is used in multiple files.
 */

// ============================================================================
// Autosave
// ============================================================================

/** Debounce delay after last content change before autosave fires (ms) */
export const AUTOSAVE_DEBOUNCE_MS = 5000;

/** Maximum wait before forcing an autosave regardless of debounce (ms) */
export const AUTOSAVE_MAX_WAIT_MS = 30000;

/** How long the autosave status message stays visible after save/error (ms) */
export const AUTOSAVE_STATUS_RESET_MS = 5000;

// ============================================================================
// Crash Recovery
// ============================================================================

/** Debounce delay for IndexedDB recovery snapshot writes (ms) */
export const SNAPSHOT_DEBOUNCE_MS = 3000;

// ============================================================================
// UI Feedback
// ============================================================================

/** How long the "Copied!" feedback stays visible (ms) */
export const COPY_FEEDBACK_MS = 2000;

/** How long copy-error feedback stays visible (ms) */
export const COPY_ERROR_FEEDBACK_MS = 3000;

/** How long the "Draft backed up" badge is shown in the header (ms) */
export const DRAFT_BADGE_DISPLAY_MS = 2000;

// ============================================================================
// Connection
// ============================================================================

/** How long "just reconnected" status stays active after coming back online (ms) */
export const CONNECTION_RECONNECT_DELAY_MS = 3000;

// ============================================================================
// Canvas & Resources
// ============================================================================

/** Debounce delay for batching rapid canvas update requests (ms) */
export const CANVAS_UPDATE_DEBOUNCE_MS = 100;

/** Short delay after an action before triggering follow-up side effects (ms) */
export const POST_ACTION_DELAY_MS = 50;

/** Polling interval when waiting for custom elements to register (ms) */
export const RESOURCE_SETTLE_MS = 100;

/** Delay between retries when polling for the canvas document to become ready (ms) */
export const CANVAS_RETRY_DELAY_MS = 200;

/** Timeout for a single resource (CSS/JS) load before it is considered failed (ms) */
export const RESOURCE_LOAD_TIMEOUT_MS = 10000;

// ============================================================================
// USWDS Web Component Initialization
// ============================================================================

/**
 * Maximum time to wait for custom element definitions (whenDefined) before
 * proceeding anyway.  Used both in the in-canvas initializer (uswds-init.ts)
 * and the resource loader (resource-loader.ts).
 */
export const WC_DEFINITION_TIMEOUT_MS = 5000;

/**
 * Staggered retry delays for USWDS web-component render initialization.
 * After the first synchronous attempt, code retries at SHORT, MEDIUM, then
 * LONG intervals to give the custom element time to render its Light DOM.
 *
 * NOTE: init-script.ts embeds equivalent values as inline JS in exported HTML
 * and cannot import these constants.  Keep the two in sync manually.
 */
export const WC_RENDER_RETRY_SHORT_MS = 100;
export const WC_RENDER_RETRY_MEDIUM_MS = 200;
export const WC_RENDER_RETRY_LONG_MS = 500;

/** Retry delays for usa-button anchor conversion (slightly different cadence) */
export const BUTTON_CONVERT_RETRY_MS = 150;
export const BUTTON_CONVERT_RETRY_LATE_MS = 300;

/** Retry delays for usa-select option population */
export const SELECT_POPULATE_RETRY_MS = 100;
export const SELECT_POPULATE_RETRY_LATE_MS = 300;

// ============================================================================
// Save Queue
// ============================================================================

/** Delay before processing the next item in the save queue (ms) */
export const SAVE_QUEUE_PROCESS_DELAY_MS = 100;

// ============================================================================
// Preview / Export
// ============================================================================

/** Delay before revoking a blob URL so the new tab has time to load (ms) */
export const BLOB_URL_REVOKE_DELAY_MS = 1000;

// ============================================================================
// AI Copilot
// ============================================================================

/** Polling interval when waiting for the AI copilot panel DOM element (ms) */
export const AI_PANEL_CHECK_INTERVAL_MS = 500;

/** Maximum time to poll for the AI copilot panel before giving up (ms) */
export const AI_PANEL_CHECK_TIMEOUT_MS = 10000;

// ============================================================================
// Editor Header
// ============================================================================

/** Minimum gap between consecutive "Draft backed up" badge displays (ms) */
export const DRAFT_BADGE_MIN_GAP_MS = 30000;

// ============================================================================
// localStorage Keys
// ============================================================================

/**
 * Centralized localStorage key names used by the editor package.
 *
 * The debug key (`uswds_pt_debug`) lives in `@uswds-pt/shared` as
 * `DEBUG_STORAGE_KEY` because it is consumed by multiple packages.
 */
export const STORAGE_KEYS = {
  /** JWT auth token */
  TOKEN: 'uswds_pt_token',
  /** Cached user profile JSON */
  USER: 'uswds_pt_user',
  /** Demo-mode prototype list */
  PROTOTYPES: 'uswds_pt_prototypes',
  /** Currently selected team ID */
  CURRENT_TEAM: 'uswds_pt_current_team',
} as const;

/**
 * Centralized sessionStorage key names used by the editor package.
 */
export const SESSION_KEYS = {
  /** Whether AI copilot was activated via URL secret (survives page reloads) */
  AI_ENABLED: 'uswds_pt_ai_enabled',
} as const;
