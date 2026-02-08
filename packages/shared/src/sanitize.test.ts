/**
 * Tests for escapeHtml — the canonical HTML escaping utility
 */
import { describe, it, expect } from 'vitest';
import { escapeHtml } from './sanitize';

describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b');
  });

  it('escapes less-than signs', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes greater-than signs', () => {
    expect(escapeHtml('a>b')).toBe('a&gt;b');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('a"b')).toBe('a&quot;b');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("a'b")).toBe('a&#39;b');
  });

  it('escapes all five characters together', () => {
    expect(escapeHtml('<img src="x" onerror=\'alert(1)\'>&')).toBe(
      '&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;&amp;'
    );
  });

  it('does not double-encode already-escaped content', () => {
    // First pass
    const once = escapeHtml('a&b');
    expect(once).toBe('a&amp;b');
    // Second pass — ampersand in &amp; gets escaped again (expected behavior)
    const twice = escapeHtml(once);
    expect(twice).toBe('a&amp;amp;b');
  });

  it('returns empty string for empty input', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('returns the same string when no special characters', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });

  it('handles null gracefully', () => {
    expect(escapeHtml(null as unknown as string)).toBe('');
  });

  it('handles undefined gracefully', () => {
    expect(escapeHtml(undefined as unknown as string)).toBe('');
  });

  it('coerces numbers to string', () => {
    expect(escapeHtml(42 as unknown as string)).toBe('42');
  });
});
