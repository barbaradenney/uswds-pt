/**
 * Tests for checksum utilities — stableSerialize and computeChecksum
 */
import { describe, it, expect } from 'vitest';
import { stableSerialize, computeChecksum, computeContentChecksum } from './checksum';

describe('stableSerialize', () => {
  it('sorts top-level keys', () => {
    const a = stableSerialize({ z: 1, a: 2 });
    const b = stableSerialize({ a: 2, z: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"z":1}');
  });

  it('sorts nested object keys', () => {
    const a = stableSerialize({ outer: { z: 1, a: 2 } });
    const b = stableSerialize({ outer: { a: 2, z: 1 } });
    expect(a).toBe(b);
  });

  it('preserves array order', () => {
    const result = stableSerialize([3, 1, 2]);
    expect(result).toBe('[3,1,2]');
  });

  it('handles null values', () => {
    const result = stableSerialize({ a: null, b: 1 });
    expect(result).toBe('{"a":null,"b":1}');
  });

  it('handles empty objects and arrays', () => {
    expect(stableSerialize({})).toBe('{}');
    expect(stableSerialize([])).toBe('[]');
  });

  it('handles primitive values', () => {
    expect(stableSerialize('hello')).toBe('"hello"');
    expect(stableSerialize(42)).toBe('42');
    expect(stableSerialize(true)).toBe('true');
    expect(stableSerialize(null)).toBe('null');
  });

  it('handles deeply nested objects with consistent ordering', () => {
    const a = stableSerialize({
      pages: [{ id: '1', frames: [{ component: { z: 1, a: 2 } }] }],
      styles: [],
    });
    const b = stableSerialize({
      styles: [],
      pages: [{ id: '1', frames: [{ component: { a: 2, z: 1 } }] }],
    });
    expect(a).toBe(b);
  });
});

describe('computeChecksum', () => {
  it('returns a 64-character hex string', async () => {
    const hash = await computeChecksum('hello world');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('same input produces same hash', async () => {
    const hash1 = await computeChecksum('test data');
    const hash2 = await computeChecksum('test data');
    expect(hash1).toBe(hash2);
  });

  it('different input produces different hash', async () => {
    const hash1 = await computeChecksum('hello');
    const hash2 = await computeChecksum('world');
    expect(hash1).not.toBe(hash2);
  });

  it('handles empty string', async () => {
    const hash = await computeChecksum('');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('handles unicode content', async () => {
    const hash = await computeChecksum('Hello \u{1F600} World');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('computeContentChecksum', () => {
  it('produces consistent checksums for same content', async () => {
    const html = '<div>Hello</div>';
    const grapesData = { pages: [{ id: '1' }], styles: [] };

    const hash1 = await computeContentChecksum(html, grapesData);
    const hash2 = await computeContentChecksum(html, grapesData);
    expect(hash1).toBe(hash2);
  });

  it('produces same checksum regardless of property order', async () => {
    const html = '<div>Hello</div>';
    const data1 = { styles: [], pages: [{ id: '1' }] };
    const data2 = { pages: [{ id: '1' }], styles: [] };

    const hash1 = await computeContentChecksum(html, data1);
    const hash2 = await computeContentChecksum(html, data2);
    expect(hash1).toBe(hash2);
  });

  it('different content produces different checksums', async () => {
    const html1 = '<div>Hello</div>';
    const html2 = '<div>World</div>';
    const data = { pages: [] };

    const hash1 = await computeContentChecksum(html1, data);
    const hash2 = await computeContentChecksum(html2, data);
    expect(hash1).not.toBe(hash2);
  });
});
