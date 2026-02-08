/**
 * Tests for uswds-init.ts — initializeUSWDSComponents
 *
 * Uses jsdom (from vitest config). Custom elements aren't defined in jsdom,
 * so initializeUSWDSComponents hits the timeout/catch path then proceeds
 * with DOM manipulation, which is what we actually want to test.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initializeUSWDSComponents } from './uswds-init';

// Reduce the 5s timeout to make tests fast
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Helper: call initializeUSWDSComponents and advance past the 5s timeout
 */
async function initWithTimeout(container: HTMLElement | Document = document) {
  const promise = initializeUSWDSComponents(container);
  // Advance past the 5000ms timeout for whenDefined
  vi.advanceTimersByTime(5100);
  // Also advance past setTimeout calls used inside the function (150, 200, 300, 500ms)
  vi.advanceTimersByTime(600);
  await promise;
}

describe('initializeUSWDSComponents', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  // --- usa-header ---
  it('initializes usa-header properties from attributes', async () => {
    document.body.innerHTML = `
      <usa-header
        nav-count="2"
        nav1-label="Home"
        nav1-href="/home"
        nav2-label="About"
        nav2-href="/about"
        logo-text="My Agency"
        logo-href="/agency"
        extended
        show-search
        search-placeholder="Find it"
      ></usa-header>
    `;

    await initWithTimeout();

    const header = document.querySelector('usa-header') as any;
    expect(header.navItems).toEqual([
      { label: 'Home', href: '/home', current: undefined },
      { label: 'About', href: '/about', current: undefined },
    ]);
    expect(header.logoText).toBe('My Agency');
    expect(header.logoHref).toBe('/agency');
    expect(header.extended).toBe(true);
    expect(header.showSearch).toBe(true);
    expect(header.searchPlaceholder).toBe('Find it');
  });

  it('initializes usa-header secondary links', async () => {
    document.body.innerHTML = `
      <usa-header
        nav-count="1"
        nav1-label="Home"
        nav1-href="/"
        sec-count="2"
        sec1-label="Login"
        sec1-href="/login"
        sec2-label="Register"
        sec2-href="/register"
      ></usa-header>
    `;

    await initWithTimeout();

    const header = document.querySelector('usa-header') as any;
    expect(header.secondaryLinks).toEqual([
      { label: 'Login', href: '/login' },
      { label: 'Register', href: '/register' },
    ]);
  });

  // --- usa-footer ---
  it('initializes usa-footer properties', async () => {
    document.body.innerHTML = `
      <usa-footer
        variant="big"
        agency-name="GSA"
        agency-url="https://gsa.gov"
      ></usa-footer>
    `;

    await initWithTimeout();

    const footer = document.querySelector('usa-footer') as any;
    expect(footer.variant).toBe('big');
    expect(footer.agencyName).toBe('GSA');
    expect(footer.agencyUrl).toBe('https://gsa.gov');
  });

  // --- usa-select ---
  it('initializes usa-select with manual options (default mode)', async () => {
    document.body.innerHTML = `
      <usa-select option-count="2" option1-label="Red" option1-value="red" option2-label="Blue" option2-value="blue">
        <select></select>
      </usa-select>
    `;

    await initWithTimeout();

    const internalSelect = document.querySelector('usa-select select') as HTMLSelectElement;
    // Should have default "- Select -" + 2 options = 3
    expect(internalSelect.options.length).toBe(3);
    expect(internalSelect.options[0].textContent).toBe('- Select -');
    expect(internalSelect.options[1].value).toBe('red');
    expect(internalSelect.options[1].textContent).toBe('Red');
    expect(internalSelect.options[2].value).toBe('blue');
    expect(internalSelect.options[2].textContent).toBe('Blue');
  });

  it('initializes usa-select with yes-no preset', async () => {
    document.body.innerHTML = `
      <usa-select options-preset="yes-no">
        <select></select>
      </usa-select>
    `;

    await initWithTimeout();

    const internalSelect = document.querySelector('usa-select select') as HTMLSelectElement;
    // default + 2 options
    expect(internalSelect.options.length).toBe(3);
    expect(internalSelect.options[1].value).toBe('yes');
    expect(internalSelect.options[2].value).toBe('no');
  });

  it('initializes usa-select with months preset', async () => {
    document.body.innerHTML = `
      <usa-select options-preset="months">
        <select></select>
      </usa-select>
    `;

    await initWithTimeout();

    const internalSelect = document.querySelector('usa-select select') as HTMLSelectElement;
    // 1 default + 12 months = 13
    expect(internalSelect.options.length).toBe(13);
    expect(internalSelect.options[1].textContent).toBe('January');
    expect(internalSelect.options[12].textContent).toBe('December');
  });

  // --- checkbox duplicate ID fix ---
  it('fixes checkbox duplicate IDs', async () => {
    document.body.innerHTML = `
      <usa-checkbox id="agree-checkbox">
        <input type="checkbox" id="agree-checkbox">
        <label for="agree-checkbox">I agree</label>
      </usa-checkbox>
    `;

    await initWithTimeout();

    const input = document.querySelector('usa-checkbox input') as HTMLInputElement;
    const label = document.querySelector('usa-checkbox label') as HTMLLabelElement;
    expect(input.id).toBe('agree-checkbox-input');
    expect(label.getAttribute('for')).toBe('agree-checkbox-input');
  });

  // --- radio duplicate ID fix ---
  it('fixes radio duplicate IDs', async () => {
    document.body.innerHTML = `
      <usa-radio id="option-a">
        <input type="radio" id="option-a" name="choice">
        <label for="option-a">Option A</label>
      </usa-radio>
    `;

    await initWithTimeout();

    const input = document.querySelector('usa-radio input') as HTMLInputElement;
    const label = document.querySelector('usa-radio label') as HTMLLabelElement;
    expect(input.id).toBe('option-a-input');
    expect(label.getAttribute('for')).toBe('option-a-input');
  });

  // --- fieldset legend ---
  it('initializes fieldset legend from attribute', async () => {
    document.body.innerHTML = `
      <fieldset legend="Personal Info">
        <legend>Placeholder</legend>
      </fieldset>
    `;

    await initWithTimeout();

    const legend = document.querySelector('legend') as HTMLLegendElement;
    expect(legend.textContent).toBe('Personal Info');
  });

  // --- fieldset usa-form-group class ---
  it('adds usa-form-group class to fieldsets with usa-fieldset class', async () => {
    document.body.innerHTML = `
      <fieldset class="usa-fieldset">content</fieldset>
    `;

    await initWithTimeout();

    const fieldset = document.querySelector('fieldset') as HTMLFieldSetElement;
    expect(fieldset.classList.contains('usa-form-group')).toBe(true);
  });

  // --- empty/missing container ---
  it('handles empty container gracefully', async () => {
    const container = document.createElement('div');
    // Should not throw
    await initWithTimeout(container);
  });

  it('handles document as container', async () => {
    document.body.innerHTML = '<usa-footer variant="slim"></usa-footer>';
    // Should not throw
    await initWithTimeout(document);
    const footer = document.querySelector('usa-footer') as any;
    expect(footer.variant).toBe('slim');
  });

  // --- usa-button href resolution ---
  it('sets href property on usa-button with page-link', async () => {
    document.body.innerHTML = `
      <usa-button text="Go" page-link="page2" link-type="page" href="#"></usa-button>
    `;

    await initWithTimeout();

    const button = document.querySelector('usa-button') as any;
    expect(button.getAttribute('href')).toBe('#page-page2');
    expect(button.href).toBe('#page-page2');
  });

  it('normalizes external URL on usa-button', async () => {
    document.body.innerHTML = `
      <usa-button text="Visit" href="example.com" link-type="external"></usa-button>
    `;

    await initWithTimeout();

    const button = document.querySelector('usa-button') as any;
    expect(button.getAttribute('href')).toBe('https://example.com');
  });

  // --- usa-table ---
  it('initializes usa-table from attributes', async () => {
    document.body.innerHTML = `
      <usa-table
        caption="Test Table"
        col-count="2"
        row-count="2"
        header1="Name"
        header2="Age"
        row1-col1="Alice"
        row1-col2="30"
        row2-col1="Bob"
        row2-col2="25"
        striped
      ></usa-table>
    `;

    await initWithTimeout();

    const table = document.querySelector('usa-table') as HTMLElement;
    const innerTable = table.querySelector('table');
    expect(innerTable).toBeTruthy();
    expect(innerTable!.classList.contains('usa-table')).toBe(true);
    expect(innerTable!.classList.contains('usa-table--striped')).toBe(true);

    const caption = table.querySelector('caption');
    expect(caption?.textContent).toBe('Test Table');

    const headerCells = table.querySelectorAll('thead th');
    expect(headerCells.length).toBe(2);
    expect(headerCells[0].textContent).toBe('Name');
    expect(headerCells[1].textContent).toBe('Age');

    const bodyRows = table.querySelectorAll('tbody tr');
    expect(bodyRows.length).toBe(2);
    expect(bodyRows[0].querySelector('th')?.textContent).toBe('Alice');
    expect(bodyRows[0].querySelector('td')?.textContent).toBe('30');
  });
});
