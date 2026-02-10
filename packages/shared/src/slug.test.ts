import { describe, it, expect } from 'vitest';
import { toBranchSlug } from './slug';

describe('toBranchSlug', () => {
  it('converts a simple name to lowercase kebab-case', () => {
    expect(toBranchSlug('Contact Form')).toBe('contact-form');
  });

  it('strips special characters', () => {
    expect(toBranchSlug('Hello World! @#$%')).toBe('hello-world');
  });

  it('collapses multiple spaces into single hyphens', () => {
    expect(toBranchSlug('my   prototype   name')).toBe('my-prototype-name');
  });

  it('collapses multiple hyphens', () => {
    expect(toBranchSlug('test---name')).toBe('test-name');
  });

  it('trims leading/trailing hyphens', () => {
    expect(toBranchSlug('-leading-')).toBe('leading');
  });

  it('handles empty string by returning "prototype"', () => {
    expect(toBranchSlug('')).toBe('prototype');
  });

  it('handles whitespace-only string by returning "prototype"', () => {
    expect(toBranchSlug('   ')).toBe('prototype');
  });

  it('handles special-chars-only string by returning "prototype"', () => {
    expect(toBranchSlug('!@#$%')).toBe('prototype');
  });

  it('truncates to 200 characters', () => {
    const longName = 'a'.repeat(300);
    expect(toBranchSlug(longName).length).toBeLessThanOrEqual(200);
  });

  it('preserves numbers', () => {
    expect(toBranchSlug('Version 2 Test')).toBe('version-2-test');
  });

  it('preserves hyphens in input', () => {
    expect(toBranchSlug('my-existing-name')).toBe('my-existing-name');
  });

  it('handles null/undefined input by returning "prototype"', () => {
    expect(toBranchSlug(null as any)).toBe('prototype');
    expect(toBranchSlug(undefined as any)).toBe('prototype');
  });

  it('trims trailing hyphen after truncation', () => {
    // 'a-' repeated 101 times = 202 chars, sliced to 200 ends on '-'
    const input = 'a-'.repeat(101);
    const result = toBranchSlug(input);
    expect(result.length).toBeLessThanOrEqual(200);
    expect(result).not.toMatch(/-$/);
  });
});
