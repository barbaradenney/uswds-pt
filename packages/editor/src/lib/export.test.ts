/**
 * Tests for export.ts — cleanExport, generateFullDocument, generateMultiPageDocument
 */
import { describe, it, expect } from 'vitest';
import { cleanExport, generateFullDocument, generateMultiPageDocument } from './export';

// ---------------------------------------------------------------------------
// cleanExport
// ---------------------------------------------------------------------------
describe('cleanExport', () => {
  it('returns empty string for empty/whitespace input', () => {
    expect(cleanExport('')).toBe('');
    expect(cleanExport('   ')).toBe('');
    expect(cleanExport(undefined as any)).toBe('');
    expect(cleanExport(null as any)).toBe('');
  });

  it('removes data-gjs-* attributes', () => {
    const input = '<div data-gjs-type="wrapper" data-gjs-highlightable="true">Hello</div>';
    const result = cleanExport(input, { formatOutput: false });
    expect(result).not.toContain('data-gjs-');
    expect(result).toContain('Hello');
  });

  it('removes data-highlightable attributes', () => {
    const input = '<div data-highlightable="">Content</div>';
    const result = cleanExport(input, { formatOutput: false });
    expect(result).not.toContain('data-highlightable');
    expect(result).toContain('Content');
  });

  it('removes data-uswds-pt-id attributes', () => {
    const input = '<div data-uswds-pt-id="abc123">Content</div>';
    const result = cleanExport(input, { formatOutput: false });
    expect(result).not.toContain('data-uswds-pt-id');
  });

  it('removes GrapesJS classes', () => {
    const input = '<div class="my-class gjs-selected gjs-hovered">Content</div>';
    const result = cleanExport(input, { formatOutput: false });
    expect(result).toContain('class="my-class"');
    expect(result).not.toContain('gjs-selected');
    expect(result).not.toContain('gjs-hovered');
  });

  it('removes entire class attribute when only GrapesJS classes remain', () => {
    const input = '<div class="gjs-selected gjs-dashed">Content</div>';
    const result = cleanExport(input, { formatOutput: false });
    expect(result).not.toContain('class=');
  });

  it('removes empty class="" attributes', () => {
    const input = '<div class="">Content</div>';
    const result = cleanExport(input, { formatOutput: false });
    expect(result).not.toContain('class=""');
  });

  it('removes empty style="" attributes', () => {
    const input = '<div style="">Content</div>';
    const result = cleanExport(input, { formatOutput: false });
    expect(result).not.toContain('style=""');
  });

  it('removes empty id="" attributes', () => {
    const input = '<div id="">Content</div>';
    const result = cleanExport(input, { formatOutput: false });
    expect(result).not.toContain('id=""');
  });

  it('removes generated IDs (letter + alphanumeric with digit, 3-7 chars)', () => {
    const input = '<div id="i1a2b">Content</div>';
    const result = cleanExport(input, { formatOutput: false });
    expect(result).not.toContain('id="i1a2b"');
  });

  it('preserves meaningful IDs like "my-form"', () => {
    const input = '<div id="my-form">Content</div>';
    const result = cleanExport(input, { formatOutput: false });
    expect(result).toContain('id="my-form"');
  });

  it('preserves IDs like "select" (all letters, no digits)', () => {
    const input = '<div id="select">Content</div>';
    const result = cleanExport(input, { formatOutput: false });
    expect(result).toContain('id="select"');
  });

  it('removes USWDS JS script tags', () => {
    const input = '<div>Content</div><script src="https://cdn.example.com/uswds.min.js"></script>';
    const result = cleanExport(input, { formatOutput: false });
    expect(result).not.toContain('uswds.min.js');
    expect(result).not.toContain('<script');
  });

  it('removes uswds.js script tags (non-minified)', () => {
    const input = '<div>Hello</div><script src="/assets/uswds.js"></script>';
    const result = cleanExport(input, { formatOutput: false });
    expect(result).not.toContain('uswds.js');
  });

  it('handles fixButtonSlotContent — moves text attr to slot', () => {
    const input = '<usa-button text="Submit">Click me</usa-button>';
    const result = cleanExport(input, { formatOutput: false });
    expect(result).toContain('>Submit</usa-button>');
  });

  it('handles already-clean HTML', () => {
    const input = '<div class="usa-prose"><h1>Hello</h1></div>';
    const result = cleanExport(input, { formatOutput: false });
    expect(result).toContain('<div class="usa-prose">');
    expect(result).toContain('<h1>Hello</h1>');
  });

  it('handles nested elements with mixed GrapesJS artifacts', () => {
    const input = '<div data-gjs-type="wrapper" class="gjs-selected outer"><span id="a1b2c" data-highlightable="">Text</span></div>';
    const result = cleanExport(input, { formatOutput: false });
    expect(result).not.toContain('data-gjs-');
    expect(result).not.toContain('gjs-selected');
    expect(result).not.toContain('data-highlightable');
    expect(result).not.toContain('id="a1b2c"');
    expect(result).toContain('Text');
  });

  it('respects removeGrapesAttributes: false option', () => {
    const input = '<div data-gjs-type="wrapper">Content</div>';
    const result = cleanExport(input, { removeGrapesAttributes: false, formatOutput: false });
    expect(result).toContain('data-gjs-type');
  });

  it('respects removeEmptyAttributes: false option', () => {
    // style="" is preserved when removeEmptyAttributes is false
    const input = '<div style="">Content</div>';
    const result = cleanExport(input, { removeEmptyAttributes: false, formatOutput: false });
    expect(result).toContain('style=""');
  });
});

// ---------------------------------------------------------------------------
// generateFullDocument
// ---------------------------------------------------------------------------
describe('generateFullDocument', () => {
  it('wraps content in <!DOCTYPE html> with USWDS CDN links', () => {
    const result = generateFullDocument('<p>Hello</p>');
    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('<html lang="en">');
    expect(result).toContain('uswds');
    expect(result).toContain('<p>Hello</p>');
  });

  it('uses provided title', () => {
    const result = generateFullDocument('<p>Test</p>', { title: 'My Page' });
    expect(result).toContain('<title>My Page</title>');
  });

  it('uses provided lang', () => {
    const result = generateFullDocument('<p>Test</p>', { lang: 'es' });
    expect(result).toContain('<html lang="es">');
  });

  it('includes init script', () => {
    const result = generateFullDocument('<p>Test</p>');
    expect(result).toContain('<script type="module">');
    expect(result).toContain('initializeComponents');
  });

  it('includes conditional fields script when data-reveals present', () => {
    const result = generateFullDocument('<usa-checkbox data-reveals="section1"></usa-checkbox>');
    expect(result).toContain('Conditional field');
  });

  it('includes conditional fields script when data-hides present', () => {
    const result = generateFullDocument('<usa-checkbox data-hides="section1"></usa-checkbox>');
    expect(result).toContain('Conditional field');
  });

  it('skips conditional fields script when not needed', () => {
    const result = generateFullDocument('<p>No conditionals</p>');
    expect(result).not.toContain('Conditional field');
  });

  it('handles empty content', () => {
    const result = generateFullDocument('');
    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('Add your content here');
  });

  it('escapes title to prevent XSS', () => {
    const result = generateFullDocument('<p>Test</p>', { title: '<script>alert(1)</script>' });
    expect(result).not.toContain('<script>alert(1)</script>');
    expect(result).toContain('&lt;script&gt;');
  });
});

// ---------------------------------------------------------------------------
// generateMultiPageDocument
// ---------------------------------------------------------------------------
describe('generateMultiPageDocument', () => {
  const samplePages = [
    { id: 'page-1', name: 'Home', html: '<h1>Home</h1>' },
    { id: 'page-2', name: 'About', html: '<h1>About</h1>' },
  ];

  it('wraps each page in data-page-id container', () => {
    const result = generateMultiPageDocument(samplePages);
    expect(result).toContain('data-page-id="page-1"');
    expect(result).toContain('data-page-id="page-2"');
  });

  it('includes data-page-name attributes', () => {
    const result = generateMultiPageDocument(samplePages);
    expect(result).toContain('data-page-name="Home"');
    expect(result).toContain('data-page-name="About"');
  });

  it('includes page navigation script', () => {
    const result = generateMultiPageDocument(samplePages);
    expect(result).toContain('initPageNavigation');
    expect(result).toContain('showPage');
  });

  it('includes init script', () => {
    const result = generateMultiPageDocument(samplePages);
    expect(result).toContain('initializeComponents');
  });

  it('cleans HTML of each page', () => {
    const pages = [
      { id: 'p1', name: 'Page 1', html: '<div data-gjs-type="wrapper" class="gjs-selected">Content</div>' },
    ];
    const result = generateMultiPageDocument(pages);
    expect(result).not.toContain('data-gjs-type');
    expect(result).not.toContain('gjs-selected');
    expect(result).toContain('Content');
  });

  it('includes conditional fields script when any page uses it', () => {
    const pages = [
      { id: 'p1', name: 'Page 1', html: '<p>No conditionals</p>' },
      { id: 'p2', name: 'Page 2', html: '<usa-checkbox data-reveals="target"></usa-checkbox>' },
    ];
    const result = generateMultiPageDocument(pages);
    expect(result).toContain('Conditional field');
  });

  it('skips conditional fields script when no pages need it', () => {
    const result = generateMultiPageDocument(samplePages);
    expect(result).not.toContain('Conditional field');
  });

  it('uses provided title and lang', () => {
    const result = generateMultiPageDocument(samplePages, { title: 'Multi', lang: 'fr' });
    expect(result).toContain('<title>Multi</title>');
    expect(result).toContain('<html lang="fr">');
  });
});
