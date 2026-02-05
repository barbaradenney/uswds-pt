/**
 * Component Registry Modules
 *
 * Re-exports shared utilities for component definitions.
 */

export {
  // Types
  type TraitHandler,
  type UnifiedTrait,
  type ComponentRegistration,
  type RetryConfig,
  // Interval management
  cancelPendingSync,
  cleanupElementIntervals,
  cleanupAllIntervals,
  // Type coercion
  coerceBoolean,
  hasAttributeTrue,
  // Trait factories
  createAttributeTrait,
  createBooleanTrait,
  createInternalSyncTrait,
  // Debug logger
  debug,
} from './shared-utils.js';
