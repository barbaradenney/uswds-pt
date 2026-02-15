/**
 * Unified USWDS Component Registry
 * Single source of truth for component traits (UI definitions + behavior handlers)
 *
 * Core types and trait factories are defined in ./components/shared-utils.ts
 * to reduce duplication and improve maintainability.
 *
 * Individual component registrations are split across focused modules in
 * ./components/ and wired in at the bottom of this file.
 */

import type { GrapesTrait } from './types.js';

// Import shared utilities from modular components
import {
  type TraitHandler,
  type TraitValue,
  type UnifiedTrait,
  type ComponentRegistration,
  type RetryConfig,
  coerceBoolean,
  hasAttributeTrue,
  createAttributeTrait,
  createBooleanTrait,
  createInternalSyncTrait,
} from './components/shared-utils.js';

// Import component registration functions
import { registerFormComponents } from './components/form-components.js';
import { registerDataComponents } from './components/data-components.js';
import { registerFeedbackComponents } from './components/feedback-components.js';
import { registerLayoutComponents } from './components/layout-components.js';
import { registerNavigationComponents } from './components/navigation-components.js';
import { registerPatternComponents } from './components/pattern-components.js';

// Re-export types for external use
export type { TraitHandler, TraitValue, UnifiedTrait, ComponentRegistration, RetryConfig };

// Re-export utilities for external use
export { coerceBoolean, hasAttributeTrue, createAttributeTrait, createBooleanTrait, createInternalSyncTrait };

// Re-export interval cleanup functions for external use
export { cleanupElementIntervals, cleanupAllIntervals } from './components/shared-utils.js';

// ============================================================================
// Component Registry
// ============================================================================

/**
 * Global component registry - single source of truth.
 * Components are registered via modular register*() functions below.
 */
class ComponentRegistry {
  private components = new Map<string, ComponentRegistration>();

  /**
   * Register a component with type-safe traits
   */
  register(registration: ComponentRegistration): void {
    this.components.set(registration.tagName, registration);
  }

  /**
   * Get component registration by tag name
   */
  get(tagName: string): ComponentRegistration | undefined {
    return this.components.get(tagName);
  }

  /**
   * Get all registered components
   */
  getAll(): ComponentRegistration[] {
    return Array.from(this.components.values());
  }

  /**
   * Extract trait definitions for GrapesJS (UI only)
   * Note: Function-based properties (like 'visible') are stripped as they can't be serialized
   */
  getTraitDefinitions(tagName: string): GrapesTrait[] {
    const component = this.components.get(tagName);
    if (!component) return [];

    return Object.entries(component.traits).map(([name, trait]) => {
      // Create a clean copy of the definition without function properties
      const cleanDefinition: Record<string, unknown> = { name };

      for (const [key, value] of Object.entries(trait.definition)) {
        // Skip function-based properties that can't be serialized
        if (typeof value !== 'function') {
          cleanDefinition[key] = value;
        }
      }

      return cleanDefinition as unknown as GrapesTrait;
    });
  }

  /**
   * Extract trait handlers for WebComponentTraitManager (behavior only)
   */
  getTraitHandlers(tagName: string): Record<string, TraitHandler> {
    const component = this.components.get(tagName);
    if (!component) return {};

    const handlers: Record<string, TraitHandler> = {};
    for (const [name, trait] of Object.entries(component.traits)) {
      handlers[name] = trait.handler;
    }
    return handlers;
  }

  /**
   * Extract trait default values (for initialization)
   */
  getTraitDefaults(tagName: string): Record<string, unknown> {
    const component = this.components.get(tagName);
    if (!component) return {};

    const defaults: Record<string, unknown> = {};
    for (const [name, trait] of Object.entries(component.traits)) {
      if (trait.definition.default !== undefined) {
        defaults[name] = trait.definition.default;
      }
    }
    return defaults;
  }
}

export const componentRegistry = new ComponentRegistry();

// ============================================================================
// Register all USWDS components from modular files
// ============================================================================

// Form inputs (button, text-input, textarea, checkbox, radio, select, combo-box,
// date-picker, time-picker, file-input, range-slider) + structure (form, section,
// fieldset, usa-link) + UI (button-group, search, breadcrumb, pagination, side-nav)
registerFormComponents(componentRegistry);

// Data display: card, tag, table, icon, list, collection, summary-box
registerDataComponents(componentRegistry);

// Feedback: alert, banner, site-alert, modal, tooltip
registerFeedbackComponents(componentRegistry);

// Layout: accordion, step-indicator, process-list, prose, identifier
registerLayoutComponents(componentRegistry);

// Navigation: header, footer, in-page-navigation, language-selector,
// character-count, memorable-date
registerNavigationComponents(componentRegistry);

// Form Patterns: name, address, phone, email, date-of-birth, ssn
registerPatternComponents(componentRegistry);
