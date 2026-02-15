/**
 * Tests for checksum utilities — computeContentChecksum
 *
 * stableSerialize and computeChecksum are internal helpers;
 * they are indirectly covered via computeContentChecksum tests.
 */
import { describe, it, expect } from 'vitest';
import { computeContentChecksum } from './checksum';

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

  it('returns a 64-character hex string', async () => {
    const hash = await computeContentChecksum('<p>test</p>', {});
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('handles empty inputs', async () => {
    const hash = await computeContentChecksum('', {});
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('handles unicode content', async () => {
    const hash = await computeContentChecksum('Hello \u{1F600} World', {});
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
