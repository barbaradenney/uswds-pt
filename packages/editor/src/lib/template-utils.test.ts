/**
 * Tests for template-utils.ts — inferTemplateLabel
 */
import { describe, it, expect } from 'vitest';
import { inferTemplateLabel } from './template-utils';

describe('inferTemplateLabel', () => {
  // --- Primary: data-template attribute ---
  it('detects data-template="signed-in" → "Signed In"', () => {
    expect(inferTemplateLabel('<div data-template="signed-in">content</div>')).toBe('Signed In');
  });

  it('detects data-template="signed-out" → "Signed Out"', () => {
    expect(inferTemplateLabel('<div data-template="signed-out">content</div>')).toBe('Signed Out');
  });

  it('detects data-template="form" → "Form"', () => {
    expect(inferTemplateLabel('<div data-template="form">content</div>')).toBe('Form');
  });

  it('detects data-template="landing" → "Landing"', () => {
    expect(inferTemplateLabel('<div data-template="landing">content</div>')).toBe('Landing');
  });

  it('detects data-template="sign-in" → "Sign In"', () => {
    expect(inferTemplateLabel('<div data-template="sign-in">content</div>')).toBe('Sign In');
  });

  it('detects data-template="error" → "Error"', () => {
    expect(inferTemplateLabel('<div data-template="error">content</div>')).toBe('Error');
  });

  it('detects data-template="blank" → "Blank"', () => {
    expect(inferTemplateLabel('<div data-template="blank">content</div>')).toBe('Blank');
  });

  // --- Fallback: wrapper class ---
  it('detects signed-in-template class → "Signed In"', () => {
    expect(inferTemplateLabel('<div class="signed-in-template">content</div>')).toBe('Signed In');
  });

  it('detects blank-template class → "Blank"', () => {
    expect(inferTemplateLabel('<div class="blank-template">content</div>')).toBe('Blank');
  });

  it('detects form-starter-template class → "Form"', () => {
    expect(inferTemplateLabel('<div class="form-starter-template">content</div>')).toBe('Form');
  });

  it('detects landing-template class → "Landing"', () => {
    expect(inferTemplateLabel('<div class="landing-template">content</div>')).toBe('Landing');
  });

  // --- No match ---
  it('returns null for content without template markers', () => {
    expect(inferTemplateLabel('<div class="usa-prose"><h1>Hello</h1></div>')).toBeNull();
  });

  // --- Edge cases ---
  it('returns null for null input', () => {
    expect(inferTemplateLabel(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(inferTemplateLabel(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(inferTemplateLabel('')).toBeNull();
  });

  it('prefers data-template over class name', () => {
    const html = '<div data-template="form" class="signed-in-template">content</div>';
    expect(inferTemplateLabel(html)).toBe('Form');
  });
});
