/**
 * Component Defaults Factory
 *
 * Provides reusable default configurations for GrapesJS component types.
 * Reduces boilerplate and ensures consistency across component definitions.
 */

/**
 * Base defaults that apply to most interactive components
 */
export const baseDefaults = {
  draggable: true,
  removable: true,
  copyable: true,
  selectable: true,
  hoverable: true,
} as const;

/**
 * Defaults for container components that can receive dropped content
 */
export const containerDefaults = {
  ...baseDefaults,
  droppable: true,
  resizable: true,
} as const;

/**
 * Defaults for leaf components that cannot contain children
 */
export const leafDefaults = {
  ...baseDefaults,
  droppable: false,
} as const;

/**
 * Defaults for text-editable components
 */
export const textDefaults = {
  ...leafDefaults,
  editable: true,
  textable: true,
} as const;

/**
 * Defaults for structural components that shouldn't be moved/deleted by users
 */
export const structuralDefaults = {
  draggable: false,
  droppable: true,
  removable: false,
  copyable: false,
  selectable: true,
  hoverable: true,
} as const;

/**
 * Create component defaults with a specific tag name and name
 */
export function createContainerDefaults(tagName: string, name: string) {
  return {
    tagName,
    name,
    ...containerDefaults,
  };
}

/**
 * Create leaf component defaults
 */
export function createLeafDefaults(tagName: string, name: string) {
  return {
    tagName,
    name,
    ...leafDefaults,
  };
}

/**
 * Create text component defaults
 */
export function createTextDefaults(tagName: string, name: string) {
  return {
    tagName,
    name,
    ...textDefaults,
  };
}
