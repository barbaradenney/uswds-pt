/**
 * Form Input Components
 *
 * Orchestrator module that registers all core form input components by
 * delegating to per-category sub-modules:
 *
 * - button-components: usa-button
 * - text-input-components: usa-text-input, usa-textarea
 * - selection-components: usa-checkbox, usa-radio, usa-select, usa-combo-box
 * - date-time-components: usa-date-picker, usa-time-picker
 * - file-range-components: usa-file-input, usa-range-slider
 */

import type { ComponentRegistration } from './shared-utils.js';
import { registerButtonComponents } from './button-components.js';
import { registerTextInputComponents } from './text-input-components.js';
import { registerSelectionComponents } from './selection-components.js';
import { registerDateTimeComponents } from './date-time-components.js';
import { registerFileRangeComponents } from './file-range-components.js';

/**
 * Registry interface to avoid circular imports.
 * Component files receive this instead of the concrete ComponentRegistry class.
 */
interface RegistryLike {
  register(registration: ComponentRegistration): void;
}

export function registerFormInputComponents(registry: RegistryLike): void {
  registerButtonComponents(registry);
  registerTextInputComponents(registry);
  registerSelectionComponents(registry);
  registerDateTimeComponents(registry);
  registerFileRangeComponents(registry);
}
