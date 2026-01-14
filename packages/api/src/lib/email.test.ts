import { describe, it, expect } from 'vitest';
import { normalizeEmail, isValidEmail } from './email';

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

describe('isValidEmail', () => {
  it('should accept valid email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('user.name@example.com')).toBe(true);
    expect(isValidEmail('user+tag@example.com')).toBe(true);
    expect(isValidEmail('user@subdomain.example.com')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('invalid@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
  });

  it('should reject null/undefined', () => {
    expect(isValidEmail(null as unknown as string)).toBe(false);
    expect(isValidEmail(undefined as unknown as string)).toBe(false);
  });
});
