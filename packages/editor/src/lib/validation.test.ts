import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidString, validateName, validateEmail } from './validation';

describe('isValidEmail', () => {
  it('should accept valid email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('user.name@example.com')).toBe(true);
    expect(isValidEmail('user+tag@example.com')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('invalid@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
  });

  it('should handle null and undefined', () => {
    expect(isValidEmail(null as unknown as string)).toBe(false);
    expect(isValidEmail(undefined as unknown as string)).toBe(false);
  });
});

describe('isValidString', () => {
  it('should accept valid strings', () => {
    expect(isValidString('hello')).toBe(true);
    expect(isValidString('a')).toBe(true);
    expect(isValidString('  trimmed  ')).toBe(true);
  });

  it('should reject empty or whitespace-only strings', () => {
    expect(isValidString('')).toBe(false);
    expect(isValidString('   ')).toBe(false);
  });

  it('should respect minLength', () => {
    expect(isValidString('ab', 2)).toBe(true);
    expect(isValidString('a', 2)).toBe(false);
  });

  it('should respect maxLength', () => {
    expect(isValidString('hello', 1, 10)).toBe(true);
    expect(isValidString('hello world!', 1, 5)).toBe(false);
  });
});

describe('validateName', () => {
  it('should return null for valid names', () => {
    expect(validateName('My Team')).toBe(null);
    expect(validateName('Team 1')).toBe(null);
  });

  it('should return error for empty names', () => {
    expect(validateName('')).toBe('Name is required');
    expect(validateName('   ')).toBe('Name is required');
  });

  it('should return error for short names', () => {
    expect(validateName('a')).toBe('Name must be at least 2 characters');
  });

  it('should return error for long names', () => {
    expect(validateName('A'.repeat(101))).toBe('Name must be less than 100 characters');
  });
});

describe('validateEmail', () => {
  it('should return null for valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(null);
  });

  it('should return error for empty emails', () => {
    expect(validateEmail('')).toBe('Email is required');
  });

  it('should return error for invalid emails', () => {
    expect(validateEmail('invalid')).toBe('Please enter a valid email address');
  });
});
