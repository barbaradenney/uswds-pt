import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, formatRelativeTime } from './date';

describe('formatDate', () => {
  it('should format a Date object', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const result = formatDate(date);
    expect(result).toMatch(/Jan 15, 2024/);
  });

  it('should format a date string', () => {
    const result = formatDate('2024-01-15T10:30:00Z');
    expect(result).toMatch(/Jan 15, 2024/);
  });

  it('should return Invalid Date for invalid inputs', () => {
    const result = formatDate('invalid-date');
    expect(result).toBe('Invalid Date');
  });
});

describe('formatDateTime', () => {
  it('should format a date with time', () => {
    const date = new Date('2024-01-15T15:30:00Z');
    const result = formatDateTime(date);
    expect(result).toMatch(/Jan 15, 2024/);
    expect(result).toMatch(/\d{1,2}:\d{2}/); // matches time format
  });
});

describe('formatRelativeTime', () => {
  it('should return "just now" for current time', () => {
    const now = new Date();
    const result = formatRelativeTime(now);
    expect(result).toBe('just now');
  });

  it('should format hours ago', () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const result = formatRelativeTime(twoHoursAgo);
    expect(result).toBe('2 hours ago');
  });

  it('should format days ago', () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(threeDaysAgo);
    expect(result).toBe('3 days ago');
  });

  it('should format future times', () => {
    const now = new Date();
    const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(inTwoDays);
    expect(result).toBe('in 2 days');
  });

  it('should handle singular forms', () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(oneDayAgo);
    expect(result).toBe('1 day ago');
  });
});
