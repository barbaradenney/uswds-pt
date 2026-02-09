/**
 * Trait Generator
 * Generates GrapesJS traits (property panels) from component attributes
 */

import type { CEMAttribute, ParsedComponent } from '@uswds-pt/shared';
import type { GrapesTrait } from './types.js';

/**
 * Generate traits for a component
 */
export function generateTraits(component: ParsedComponent): GrapesTrait[] {
  const traits: GrapesTrait[] = [];

  // Generate traits from attributes
  for (const attr of component.attributes) {
    const trait = mapAttributeToTrait(attr);
    if (trait) {
      traits.push(trait);
    }
  }

  // Generate traits for named slots
  for (const slot of component.slots) {
    if (slot.name && slot.name !== '' && slot.name !== 'default') {
      traits.push({
        name: `slot-${slot.name}`,
        label: formatSlotLabel(slot.name),
        type: 'text',
        placeholder: slot.description || `Content for ${slot.name} slot`,
        category: { id: 'slots', label: 'Slots' },
      });
    }
  }

  return traits;
}

/**
 * Map a CEM attribute to a GrapesJS trait
 */
export function mapAttributeToTrait(attr: CEMAttribute): GrapesTrait | null {
  const typeText = attr.type?.text || 'string';

  // Skip internal/private attributes
  if (attr.name.startsWith('_') || attr.name.startsWith('data-')) {
    return null;
  }

  // Handle union types (enums)
  if (isUnionType(typeText)) {
    return createSelectTrait(attr, typeText);
  }

  // Handle boolean
  if (typeText === 'boolean') {
    return createCheckboxTrait(attr);
  }

  // Handle number
  if (typeText === 'number') {
    return createNumberTrait(attr);
  }

  // Default to text
  return createTextTrait(attr);
}

/**
 * Check if a type is a union type (e.g., "'primary' | 'secondary'")
 */
function isUnionType(typeText: string): boolean {
  return typeText.includes("'") && typeText.includes('|');
}

/**
 * Create a select trait from a union type
 */
function createSelectTrait(attr: CEMAttribute, typeText: string): GrapesTrait {
  const options = parseUnionType(typeText);

  return {
    name: attr.name,
    label: formatLabel(attr.name),
    type: 'select',
    default: parseDefault(attr.default),
    options: options.map((opt) => ({
      id: opt,
      label: formatLabel(opt),
    })),
    category: { id: 'properties', label: 'Properties' },
  };
}

/**
 * Create a checkbox trait for boolean attributes
 */
function createCheckboxTrait(attr: CEMAttribute): GrapesTrait {
  return {
    name: attr.name,
    label: formatLabel(attr.name),
    type: 'checkbox',
    default: attr.default === 'true',
    category: { id: 'properties', label: 'Properties' },
  };
}

/**
 * Create a number trait
 */
function createNumberTrait(attr: CEMAttribute): GrapesTrait {
  const trait: GrapesTrait = {
    name: attr.name,
    label: formatLabel(attr.name),
    type: 'number',
    category: { id: 'properties', label: 'Properties' },
  };

  if (attr.default) {
    trait.default = parseInt(attr.default, 10);
  }

  // Add min/max hints based on attribute name
  if (attr.name.includes('page') || attr.name.includes('step')) {
    trait.min = 1;
  }
  if (attr.name.includes('max')) {
    trait.min = 0;
  }

  return trait;
}

/**
 * Create a text trait
 */
function createTextTrait(attr: CEMAttribute): GrapesTrait {
  return {
    name: attr.name,
    label: formatLabel(attr.name),
    type: 'text',
    default: parseDefault(attr.default),
    placeholder: attr.description,
    category: { id: 'properties', label: 'Properties' },
  };
}

/**
 * Parse a union type string into an array of values
 * @example "'primary' | 'secondary' | 'outline'" -> ['primary', 'secondary', 'outline']
 */
function parseUnionType(typeText: string): string[] {
  return typeText
    .split('|')
    .map((s) => s.trim().replace(/'/g, '').replace(/"/g, ''))
    .filter((s) => s.length > 0 && s !== 'undefined' && s !== 'null');
}

/**
 * Parse a default value from CEM format
 */
function parseDefault(defaultStr?: string): string | undefined {
  if (!defaultStr) return undefined;

  // Remove surrounding quotes
  if (defaultStr.startsWith("'") && defaultStr.endsWith("'")) {
    return defaultStr.slice(1, -1);
  }
  if (defaultStr.startsWith('"') && defaultStr.endsWith('"')) {
    return defaultStr.slice(1, -1);
  }

  // Handle undefined/null
  if (defaultStr === 'undefined' || defaultStr === 'null') {
    return undefined;
  }

  return defaultStr;
}

/**
 * Format an attribute name into a human-readable label
 */
function formatLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1') // Add space before capitals
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

/**
 * Format a slot name into a human-readable label
 */
function formatSlotLabel(name: string): string {
  return `${formatLabel(name)} Content`;
}

/**
 * Group traits by category
 */
export function groupTraitsByCategory(traits: GrapesTrait[]): Record<string, GrapesTrait[]> {
  const grouped: Record<string, GrapesTrait[]> = {};

  for (const trait of traits) {
    const category = trait.category?.id || 'other';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(trait);
  }

  return grouped;
}

/**
 * Get trait type based on attribute name conventions
 */
export function inferTraitType(attrName: string, _typeText: string): string {
  // URL/href attributes
  if (attrName === 'href' || attrName === 'src' || attrName.endsWith('-url')) {
    return 'text'; // Could be 'link' if GrapesJS supports it
  }

  // Color attributes
  if (attrName.includes('color')) {
    return 'color';
  }

  // Date attributes
  if (attrName.includes('date')) {
    return 'text'; // Could be 'date' with custom trait type
  }

  // Size/dimension attributes
  if (['width', 'height', 'size', 'min', 'max', 'step'].includes(attrName)) {
    return 'number';
  }

  return 'text';
}
