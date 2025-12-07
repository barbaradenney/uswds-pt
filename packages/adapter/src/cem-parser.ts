/**
 * CEM Parser
 * Parses Custom Elements Manifest and extracts component information
 */

import type {
  CEMManifest,
  CEMDeclaration,
  ParsedComponent,
} from '@uswds-pt/shared';
import { PATH_TO_CATEGORY } from './constants.js';

/**
 * Parse a Custom Elements Manifest and extract all component definitions
 */
export function parseCustomElementsManifest(manifest: CEMManifest): ParsedComponent[] {
  const components: ParsedComponent[] = [];

  for (const module of manifest.modules) {
    if (!module.declarations) continue;

    for (const declaration of module.declarations) {
      if (isCustomElement(declaration)) {
        const component = parseDeclaration(declaration, module.path);
        if (component) {
          components.push(component);
        }
      }
    }
  }

  return components;
}

/**
 * Check if a declaration is a custom element
 */
function isCustomElement(declaration: CEMDeclaration): boolean {
  return (
    declaration.kind === 'class' &&
    declaration.customElement === true &&
    typeof declaration.tagName === 'string' &&
    declaration.tagName.length > 0
  );
}

/**
 * Parse a single declaration into a ParsedComponent
 */
function parseDeclaration(
  declaration: CEMDeclaration,
  modulePath: string
): ParsedComponent | null {
  if (!declaration.tagName) return null;

  const category = extractCategory(modulePath);
  const packageName = extractPackageName(modulePath);

  return {
    tagName: declaration.tagName,
    className: declaration.name,
    description: declaration.description || '',
    category,
    packageName,
    attributes: declaration.attributes || [],
    slots: declaration.slots || [],
    events: declaration.events || [],
    cssProperties: declaration.cssProperties || [],
    superclass: declaration.superclass,
  };
}

/**
 * Extract the category from a module path
 * @example "packages/uswds-wc-actions/src/components/button/usa-button.ts" -> "actions"
 */
export function extractCategory(modulePath: string): string {
  for (const [pathSegment, category] of Object.entries(PATH_TO_CATEGORY)) {
    if (modulePath.includes(pathSegment)) {
      return category;
    }
  }
  return 'components';
}

/**
 * Extract the package name from a module path
 * @example "packages/uswds-wc-actions/src/..." -> "@uswds-wc/actions"
 */
function extractPackageName(modulePath: string): string {
  const match = modulePath.match(/uswds-wc-(\w+)/);
  if (match) {
    return `@uswds-wc/${match[1]}`;
  }
  return '@uswds-wc/core';
}

/**
 * Format a tag name into a human-readable label
 * @example "usa-button" -> "Button"
 * @example "usa-text-input" -> "Text Input"
 */
export function formatLabel(tagName: string): string {
  return tagName
    .replace(/^usa-/, '')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate search keywords from a component
 */
export function generateKeywords(component: ParsedComponent): string[] {
  const keywords: Set<string> = new Set();

  // Add tag name without prefix
  keywords.add(component.tagName.replace('usa-', ''));

  // Add category
  keywords.add(component.category);

  // Add words from description
  if (component.description) {
    const words = component.description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 3);

    words.slice(0, 5).forEach((word) => keywords.add(word));
  }

  // Add attribute names
  component.attributes.forEach((attr) => {
    keywords.add(attr.name);
  });

  return Array.from(keywords);
}

/**
 * Check if a component is a container (can have children)
 */
export function isContainer(component: ParsedComponent): boolean {
  // Components with slots can contain children
  return component.slots.length > 0;
}

/**
 * Get all unique categories from a list of components
 */
export function getCategories(components: ParsedComponent[]): string[] {
  const categories = new Set(components.map((c) => c.category));
  return Array.from(categories);
}
