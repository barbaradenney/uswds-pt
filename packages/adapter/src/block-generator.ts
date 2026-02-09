/**
 * Block Generator
 * Generates GrapesJS blocks from parsed components
 */

import type { ParsedComponent } from '@uswds-pt/shared';
import type { GrapesBlock, GrapesBlockContent } from './types.js';
import { COMPONENT_ICONS, DEFAULT_CONTENT, BLOCK_CATEGORIES } from './constants/index.js';
import { formatLabel, generateKeywords } from './cem-parser.js';

/**
 * Generate GrapesJS blocks for all components
 */
export function generateBlocks(components: ParsedComponent[]): GrapesBlock[] {
  return components.map((component) => generateBlock(component));
}

/**
 * Generate a single GrapesJS block from a component
 */
export function generateBlock(component: ParsedComponent): GrapesBlock {
  const icon = getComponentIcon(component.tagName);
  const content = getBlockContent(component);
  const _keywords = generateKeywords(component);

  return {
    id: component.tagName,
    label: formatLabel(component.tagName),
    category: getCategoryLabel(component.category),
    media: icon,
    content,
    select: true,
    activate: true,
  };
}

/**
 * Get the SVG icon for a component
 */
function getComponentIcon(tagName: string): string {
  return COMPONENT_ICONS[tagName] || COMPONENT_ICONS['default'];
}

/**
 * Get the category label from category ID
 */
function getCategoryLabel(categoryId: string): string {
  const category = BLOCK_CATEGORIES.find((c) => c.id === categoryId);
  return category?.label || categoryId;
}

/**
 * Get the block content (what gets dropped on the canvas)
 */
function getBlockContent(component: ParsedComponent): GrapesBlockContent {
  // Check for custom default content
  const customContent = DEFAULT_CONTENT[component.tagName];

  if (customContent) {
    // For complex content with nested HTML, return as string
    return {
      type: component.tagName,
      tagName: component.tagName,
      components: parseContentString(customContent, component.tagName),
    };
  }

  // Generate basic content from component definition
  return {
    type: component.tagName,
    tagName: component.tagName,
    attributes: getDefaultAttributes(component),
    components: getDefaultSlotContent(component),
  };
}

/**
 * Parse an HTML content string into GrapesJS content format
 */
function parseContentString(
  html: string,
  _tagName: string
): GrapesBlockContent[] | string {
  // For simple content, we can return the HTML string
  // GrapesJS will parse it when dropped
  const trimmed = html.trim();

  // Check if it's a single element matching the tagName
  if (trimmed.startsWith(`<${_tagName}`) && trimmed.endsWith(`</${_tagName}>`)) {
    // Extract inner content
    const match = trimmed.match(new RegExp(`<${_tagName}[^>]*>([\\s\\S]*)<\\/${_tagName}>`));
    if (match) {
      return match[1].trim();
    }
  }

  return trimmed;
}

/**
 * Get default attributes from component definition
 */
function getDefaultAttributes(component: ParsedComponent): Record<string, string> {
  const attrs: Record<string, string> = {};

  for (const attr of component.attributes) {
    // Only include attributes with meaningful defaults
    if (attr.default && attr.default !== "''" && attr.default !== 'false' && attr.default !== 'undefined') {
      attrs[attr.name] = parseDefaultValue(attr.default);
    }
  }

  return attrs;
}

/**
 * Parse a default value from CEM format
 */
function parseDefaultValue(defaultStr: string): string {
  // Remove surrounding quotes
  if (defaultStr.startsWith("'") && defaultStr.endsWith("'")) {
    return defaultStr.slice(1, -1);
  }
  if (defaultStr.startsWith('"') && defaultStr.endsWith('"')) {
    return defaultStr.slice(1, -1);
  }
  return defaultStr;
}

/**
 * Get default content for component slots
 */
function getDefaultSlotContent(component: ParsedComponent): string {
  // Check if component has a default slot
  const defaultSlot = component.slots.find((slot) => slot.name === '' || slot.name === 'default');

  if (defaultSlot) {
    // Provide sensible default content based on component type
    const defaults: Record<string, string> = {
      'usa-button': 'Button',
      'usa-link': 'Link text',
      'usa-tag': 'Tag',
      'usa-prose': '<p>Content with proper typography.</p>',
    };

    return defaults[component.tagName] || 'Content';
  }

  return '';
}

/**
 * Generate block categories configuration for GrapesJS
 */
export function generateBlockCategories(): Array<{
  id: string;
  label: string;
  open: boolean;
  order: number;
}> {
  return BLOCK_CATEGORIES.map((cat) => ({
    id: cat.id,
    label: cat.label,
    open: cat.open,
    order: cat.order,
  }));
}

/**
 * Group blocks by category
 */
export function groupBlocksByCategory(
  blocks: GrapesBlock[]
): Record<string, GrapesBlock[]> {
  const grouped: Record<string, GrapesBlock[]> = {};

  for (const block of blocks) {
    const category = block.category;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(block);
  }

  return grouped;
}
