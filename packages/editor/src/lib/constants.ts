/**
 * Named timing constants used across the editor package.
 *
 * Centralizes magic numbers to make their purpose clear and
 * ensure consistent values when the same delay is used in multiple files.
 *
 * NOTE: Only export constants that are actually imported by other files.
 * Timing values used in only one file should stay local to that file.
 */

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

/** Minimum gap between consecutive "Draft backed up" badge displays (ms) */
export const DRAFT_BADGE_MIN_GAP_MS = 30000;

// ============================================================================
// Preview / Export
// ============================================================================

/** Delay before revoking a blob URL so the new tab has time to load (ms) */
export const BLOB_URL_REVOKE_DELAY_MS = 1000;

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
