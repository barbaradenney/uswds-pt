import { describe, it, expect } from 'vitest';
import { normalizeEmail } from './email';

describe('normalizeEmail', () => {
  it('should lowercase email addresses', () => {
    expect(normalizeEmail('User@Example.COM')).toBe('user@example.com');
  });

  it('should trim whitespace', () => {
    expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com');
  });

  it('should handle empty strings', () => {
    expect(normalizeEmail('')).toBe('');
  });

  it('should handle null/undefined gracefully', () => {
    expect(normalizeEmail(null as unknown as string)).toBe('');
    expect(normalizeEmail(undefined as unknown as string)).toBe('');
  });
});
