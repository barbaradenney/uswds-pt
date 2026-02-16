/**
 * Data Display Components
 *
 * Barrel module that delegates to per-component files:
 * - card-components.ts — usa-card
 * - table-components.ts — usa-table
 * - list-components.ts — usa-list, usa-collection
 * - tag-icon-components.ts — usa-tag, usa-icon, usa-summary-box
 */

import type { RegistryLike } from './shared-utils.js';
import { registerCardComponents } from './card-components.js';
import { registerTableComponents } from './table-components.js';
import { registerListComponents } from './list-components.js';
import { registerTagIconComponents } from './tag-icon-components.js';

export function registerDataComponents(registry: RegistryLike): void {
  registerCardComponents(registry);
  registerTableComponents(registry);
  registerListComponents(registry);
  registerTagIconComponents(registry);
}
