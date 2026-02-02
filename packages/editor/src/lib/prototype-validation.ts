/**
 * Prototype Data Validation
 *
 * Utilities for validating prototype data structures before save/load operations.
 */

import type { Prototype } from '@uswds-pt/shared';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a prototype object
 */
export function validatePrototype(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Prototype must be an object'], warnings };
  }

  const proto = data as Record<string, unknown>;

  // Required string fields
  if (typeof proto.id !== 'string' || !proto.id) {
    errors.push('Prototype must have a valid id');
  }
  if (typeof proto.slug !== 'string' || !proto.slug) {
    errors.push('Prototype must have a valid slug');
  }
  if (typeof proto.name !== 'string') {
    errors.push('Prototype must have a name');
  }

  // htmlContent should be a string (can be empty)
  if (proto.htmlContent !== undefined && typeof proto.htmlContent !== 'string') {
    errors.push('htmlContent must be a string');
  }

  // grapesData should be an object if present
  if (proto.grapesData !== undefined && proto.grapesData !== null) {
    const grapesResult = validateGrapesData(proto.grapesData);
    errors.push(...grapesResult.errors);
    warnings.push(...grapesResult.warnings);
  }

  // teamId should be a string
  if (typeof proto.teamId !== 'string') {
    errors.push('Prototype must have a teamId');
  }

  // Check for potentially large data
  if (typeof proto.htmlContent === 'string' && proto.htmlContent.length > 5_000_000) {
    warnings.push('htmlContent is very large (>5MB), may cause performance issues');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate GrapesJS project data structure
 */
export function validateGrapesData(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('grapesData must be an object');
    return { valid: false, errors, warnings };
  }

  const gjs = data as Record<string, unknown>;

  // Check for pages array
  if (gjs.pages !== undefined) {
    if (!Array.isArray(gjs.pages)) {
      errors.push('grapesData.pages must be an array');
    } else if (gjs.pages.length === 0) {
      warnings.push('grapesData.pages is empty');
    } else {
      // Validate each page
      gjs.pages.forEach((page: unknown, index: number) => {
        if (!page || typeof page !== 'object') {
          errors.push(`grapesData.pages[${index}] must be an object`);
        }
      });
    }
  }

  // Check for styles array
  if (gjs.styles !== undefined && !Array.isArray(gjs.styles)) {
    errors.push('grapesData.styles must be an array');
  }

  // Check for assets array
  if (gjs.assets !== undefined && !Array.isArray(gjs.assets)) {
    errors.push('grapesData.assets must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate data before saving
 * Returns cleaned/normalized data if valid, throws if invalid
 */
export function validateAndPrepareForSave(data: {
  name: string;
  htmlContent: string;
  grapesData: unknown;
}): { name: string; htmlContent: string; grapesData: unknown } {
  // Validate name
  if (typeof data.name !== 'string') {
    throw new Error('Prototype name is required');
  }
  const name = data.name.trim() || 'Untitled Prototype';

  // Validate htmlContent
  if (typeof data.htmlContent !== 'string') {
    throw new Error('HTML content must be a string');
  }
  const htmlContent = data.htmlContent;

  // Validate grapesData
  if (data.grapesData === undefined || data.grapesData === null) {
    throw new Error('Editor data is required');
  }

  const grapesResult = validateGrapesData(data.grapesData);
  if (!grapesResult.valid) {
    throw new Error(`Invalid editor data: ${grapesResult.errors.join(', ')}`);
  }

  return { name, htmlContent, grapesData: data.grapesData };
}

/**
 * Check if loaded prototype data is usable
 */
export function isPrototypeUsable(proto: Prototype | null | undefined): proto is Prototype {
  if (!proto) return false;
  if (!proto.id || !proto.slug) return false;
  return true;
}

/**
 * Sanitize prototype for display (remove any potentially harmful content)
 */
export function sanitizePrototypeForDisplay(proto: Prototype): Prototype {
  return {
    ...proto,
    // Ensure name doesn't contain problematic characters
    name: proto.name?.replace(/[<>]/g, '') || 'Untitled',
  };
}
