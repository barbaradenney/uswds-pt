import { describe, it, expect } from 'vitest';
import { parseMultiPageHtml, parseAIResponse, autoSplitFormHtml } from './ai-client';

describe('parseMultiPageHtml', () => {
  it('returns null when no delimiters are found', () => {
    const html = '<usa-button text="Click me"></usa-button>';
    expect(parseMultiPageHtml(html)).toBeNull();
  });

  it('parses two pages with correct name and html', () => {
    const html = `<!-- PAGE: Home -->
<div>Home content</div>

<!-- PAGE: Contact -->
<div>Contact content</div>`;

    const result = parseMultiPageHtml(html);
    expect(result).toHaveLength(2);
    expect(result![0].name).toBe('Home');
    expect(result![0].html).toBe('<div>Home content</div>');
    expect(result![1].name).toBe('Contact');
    expect(result![1].html).toBe('<div>Contact content</div>');
  });

  it('parses three pages', () => {
    const html = `<!-- PAGE: Step 1 -->
<h1>Step 1</h1>
<!-- PAGE: Step 2 -->
<h1>Step 2</h1>
<!-- PAGE: Review -->
<h1>Review</h1>`;

    const result = parseMultiPageHtml(html);
    expect(result).toHaveLength(3);
    expect(result![0].name).toBe('Step 1');
    expect(result![1].name).toBe('Step 2');
    expect(result![2].name).toBe('Review');
  });

  it('handles extra whitespace in delimiters', () => {
    const html = `<!--   PAGE:   Home   -->
<div>Home</div>

<!--  PAGE:  About  -->
<div>About</div>`;

    const result = parseMultiPageHtml(html);
    expect(result).toHaveLength(2);
    expect(result![0].name).toBe('Home');
    expect(result![1].name).toBe('About');
  });

  it('skips empty page sections', () => {
    const html = `<!-- PAGE: Home -->
<div>Home</div>

<!-- PAGE: Empty -->

<!-- PAGE: Contact -->
<div>Contact</div>`;

    const result = parseMultiPageHtml(html);
    expect(result).toHaveLength(2);
    expect(result![0].name).toBe('Home');
    expect(result![1].name).toBe('Contact');
  });

  it('ignores content before first delimiter', () => {
    const html = `Some preamble text that leaked in
<div>stray content</div>

<!-- PAGE: Home -->
<div>Actual home content</div>`;

    const result = parseMultiPageHtml(html);
    expect(result).toHaveLength(1);
    expect(result![0].name).toBe('Home');
    expect(result![0].html).toBe('<div>Actual home content</div>');
  });

  it('returns a single-element array for one page with delimiter', () => {
    const html = `<!-- PAGE: Home -->
<div>Home only</div>`;

    const result = parseMultiPageHtml(html);
    expect(result).toHaveLength(1);
    expect(result![0].name).toBe('Home');
    expect(result![0].html).toBe('<div>Home only</div>');
  });

  it('returns null when all page sections are empty', () => {
    const html = `<!-- PAGE: Empty1 -->
<!-- PAGE: Empty2 -->`;

    const result = parseMultiPageHtml(html);
    expect(result).toBeNull();
  });

  it('preserves page-link attributes in page html', () => {
    const html = `<!-- PAGE: Personal Info -->
<div>
  <usa-button text="Continue" page-link="Review"></usa-button>
</div>

<!-- PAGE: Review -->
<div>
  <usa-button text="Back" variant="outline" page-link="Personal Info"></usa-button>
</div>`;

    const result = parseMultiPageHtml(html);
    expect(result).toHaveLength(2);
    expect(result![0].html).toContain('page-link="Review"');
    expect(result![1].html).toContain('page-link="Personal Info"');
  });

  it('preserves btn{N}-page-link attributes on button-group', () => {
    const html = `<!-- PAGE: Step 1 -->
<usa-button-group btn-count="2" btn1-text="Back" btn1-variant="outline" btn2-text="Continue" btn2-page-link="Step 2"></usa-button-group>

<!-- PAGE: Step 2 -->
<usa-button-group btn-count="2" btn1-text="Back" btn1-page-link="Step 1" btn1-variant="outline" btn2-text="Submit"></usa-button-group>`;

    const result = parseMultiPageHtml(html);
    expect(result).toHaveLength(2);
    expect(result![0].html).toContain('btn2-page-link="Step 2"');
    expect(result![1].html).toContain('btn1-page-link="Step 1"');
  });
});

describe('parseAIResponse', () => {
  it('sets pages when HTML has multi-page delimiters', () => {
    const raw = `Here are your pages:

\`\`\`html
<!-- PAGE: Home -->
<div>Home</div>

<!-- PAGE: About -->
<div>About</div>
\`\`\`

Let me know if you need changes.`;

    const result = parseAIResponse(raw);
    expect(result.html).toContain('<!-- PAGE: Home -->');
    expect(result.pages).toHaveLength(2);
    expect(result.pages![0].name).toBe('Home');
    expect(result.pages![1].name).toBe('About');
    expect(result.explanation).toContain('Here are your pages:');
  });

  it('sets pages to null when HTML has no delimiters', () => {
    const raw = `Here is a button:

\`\`\`html
<usa-button text="Click me"></usa-button>
\`\`\``;

    const result = parseAIResponse(raw);
    expect(result.html).toBe('<usa-button text="Click me"></usa-button>');
    expect(result.pages).toBeNull();
  });

  it('sets pages to null when no code fence at all', () => {
    const raw = 'I can help you with that. Just ask for specific components.';
    const result = parseAIResponse(raw);
    expect(result.html).toBe('');
    expect(result.pages).toBeNull();
  });
});

describe('autoSplitFormHtml', () => {
  it('returns null when there are no headings or fieldsets', () => {
    const html = '<usa-text-input label="Name" name="name"></usa-text-input>';
    expect(autoSplitFormHtml(html)).toBeNull();
  });

  it('returns null when there is only one h1', () => {
    const html = `<h1>Personal Info</h1>
<usa-text-input label="Name" name="name"></usa-text-input>`;
    expect(autoSplitFormHtml(html)).toBeNull();
  });

  it('splits on multiple h1 headings', () => {
    const html = `<h1>Personal Info</h1>
<usa-text-input label="Name" name="name"></usa-text-input>

<h1>Contact Info</h1>
<usa-text-input label="Email" name="email" type="email"></usa-text-input>

<h1>Review</h1>
<p>Please review your answers.</p>`;

    const result = autoSplitFormHtml(html);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(3);
    expect(result![0].name).toBe('Personal Info');
    expect(result![1].name).toBe('Contact Info');
    expect(result![2].name).toBe('Review');
  });

  it('unwraps outer max-width wrapper before splitting', () => {
    const html = `<div style="max-width: 40rem;">
<h1>Step 1</h1>
<p>Content A</p>
<h1>Step 2</h1>
<p>Content B</p>
</div>`;

    const result = autoSplitFormHtml(html);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result![0].name).toBe('Step 1');
    expect(result![1].name).toBe('Step 2');
  });

  it('injects usa-step-indicator on each page', () => {
    const html = `<h1>Personal Info</h1>
<p>Fields here</p>
<h1>Contact Info</h1>
<p>More fields</p>`;

    const result = autoSplitFormHtml(html)!;
    expect(result).toHaveLength(2);

    // First page: step1 current, step2 incomplete
    expect(result[0].html).toContain('usa-step-indicator');
    expect(result[0].html).toContain('step1-status="current"');
    expect(result[0].html).toContain('step2-status="incomplete"');

    // Second page: step1 complete, step2 current
    expect(result[1].html).toContain('usa-step-indicator');
    expect(result[1].html).toContain('step1-status="complete"');
    expect(result[1].html).toContain('step2-status="current"');
  });

  it('adds Back/Continue navigation buttons with page-link', () => {
    const html = `<h1>Step A</h1>
<p>Content A</p>
<h1>Step B</h1>
<p>Content B</p>
<h1>Step C</h1>
<p>Content C</p>`;

    const result = autoSplitFormHtml(html)!;
    expect(result).toHaveLength(3);

    // First page: no Back, has Continue → Step B
    expect(result[0].html).not.toContain('text="Back"');
    expect(result[0].html).toContain('page-link="Step B"');
    expect(result[0].html).toContain('text="Continue"');

    // Middle page: Back → Step A, Continue → Step C
    expect(result[1].html).toContain('page-link="Step A"');
    expect(result[1].html).toContain('text="Back"');
    expect(result[1].html).toContain('page-link="Step C"');
    expect(result[1].html).toContain('text="Continue"');

    // Last page: Back → Step B, Submit (no Continue)
    expect(result[2].html).toContain('page-link="Step B"');
    expect(result[2].html).toContain('text="Back"');
    expect(result[2].html).toContain('text="Submit"');
    expect(result[2].html).not.toContain('text="Continue"');
  });

  it('wraps each page in max-width container', () => {
    const html = `<h1>Page One</h1>
<p>A</p>
<h1>Page Two</h1>
<p>B</p>`;

    const result = autoSplitFormHtml(html)!;
    for (const page of result) {
      expect(page.html).toMatch(/^<div style="max-width: 40rem;">/);
      expect(page.html).toMatch(/<\/div>$/);
    }
  });

  it('prepends content before first h1 to the first page', () => {
    const html = `<p>Introduction text before any heading</p>
<h1>Personal Info</h1>
<usa-text-input label="Name" name="name"></usa-text-input>
<h1>Contact Info</h1>
<usa-text-input label="Email" name="email"></usa-text-input>`;

    const result = autoSplitFormHtml(html)!;
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Personal Info');
    // The preamble should be in the first page content
    expect(result[0].html).toContain('Introduction text before any heading');
  });

  it('falls back to fieldset/legend splitting when fewer than 2 h1s', () => {
    const html = `<fieldset><legend>Your Name</legend>
<usa-text-input label="First name" name="first"></usa-text-input>
</fieldset>
<fieldset><legend>Your Address</legend>
<usa-text-input label="Street" name="street"></usa-text-input>
</fieldset>`;

    const result = autoSplitFormHtml(html);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result![0].name).toBe('Your Name');
    expect(result![1].name).toBe('Your Address');
  });

  it('caps at 5 pages — merges overflow into last page', () => {
    const headings = Array.from({ length: 7 }, (_, i) => `<h1>Section ${i + 1}</h1>\n<p>Content ${i + 1}</p>`);
    const html = headings.join('\n');

    const result = autoSplitFormHtml(html)!;
    expect(result).toHaveLength(5);
    expect(result[0].name).toBe('Section 1');
    expect(result[4].name).toBe('Section 5');
    // Last page should contain merged content from sections 5, 6, 7
    expect(result[4].html).toContain('Section 6');
    expect(result[4].html).toContain('Section 7');
  });

  it('strips HTML tags from heading text for page names', () => {
    const html = `<h1><span class="bold">Personal</span> Info</h1>
<p>Content A</p>
<h1>Contact <em>Details</em></h1>
<p>Content B</p>`;

    const result = autoSplitFormHtml(html)!;
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Personal Info');
    expect(result[1].name).toBe('Contact Details');
  });

  it('skips headings with empty text after stripping tags', () => {
    const html = `<h1>  </h1>
<p>Orphan content</p>
<h1>Real Page</h1>
<p>Content A</p>
<h1>Another Page</h1>
<p>Content B</p>`;

    const result = autoSplitFormHtml(html)!;
    // The empty h1 should be skipped; only 2 valid pages
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Real Page');
    expect(result[1].name).toBe('Another Page');
  });

  it('includes h1 in each enriched page for proper page titles', () => {
    const html = `<h1>Step 1</h1>
<p>Content</p>
<h1>Step 2</h1>
<p>More content</p>`;

    const result = autoSplitFormHtml(html)!;
    // Each page should have an <h1> with the page name re-inserted
    expect(result[0].html).toContain('<h1>Step 1</h1>');
    expect(result[1].html).toContain('<h1>Step 2</h1>');
  });

  it('step indicator has correct step-count', () => {
    const html = `<h1>A</h1><p>a</p><h1>B</h1><p>b</p><h1>C</h1><p>c</p>`;
    const result = autoSplitFormHtml(html)!;
    for (const page of result) {
      expect(page.html).toContain('step-count="3"');
    }
  });
});
