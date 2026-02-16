/**
 * Form Components (barrel)
 *
 * Re-exports and aggregates all form-related component registrations:
 * - Form input components (usa-button, usa-text-input, usa-textarea, etc.)
 * - Structure components (form, section, fieldset, usa-link)
 * - UI components (usa-button-group, usa-search, usa-breadcrumb, etc.)
 */

import type { ComponentRegistration } from './shared-utils.js';
import type { RegistryLike } from './shared-utils.js';
import { registerFormInputComponents } from './form-input-components.js';
import { registerStructureComponents } from './structure-components.js';
import { registerUIComponents } from './ui-components.js';

export function registerFormComponents(registry: RegistryLike): void {
  registerFormInputComponents(registry);
  registerStructureComponents(registry);
  registerUIComponents(registry);
}
