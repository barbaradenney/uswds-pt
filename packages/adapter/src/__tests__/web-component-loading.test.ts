import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CDN_URLS, USWDS_WC_BUNDLE_VERSION, USWDS_VERSION } from '../constants';

describe('Web Component Loading', () => {
  describe('CDN URLs', () => {
    it('should have valid CDN URL structure', () => {
      expect(CDN_URLS.uswdsCss).toBeTruthy();
      expect(CDN_URLS.uswdsWcJs).toBeTruthy();
      expect(CDN_URLS.uswdsWcCss).toBeTruthy();

      // Should use HTTPS
      expect(CDN_URLS.uswdsCss).toMatch(/^https:\/\//);
      expect(CDN_URLS.uswdsWcJs).toMatch(/^https:\/\//);
      expect(CDN_URLS.uswdsWcCss).toMatch(/^https:\/\//);
    });

    it('should include correct version numbers', () => {
      expect(CDN_URLS.uswdsCss).toContain(USWDS_VERSION);
      expect(CDN_URLS.uswdsWcJs).toContain(USWDS_WC_BUNDLE_VERSION);
      expect(CDN_URLS.uswdsWcCss).toContain(USWDS_WC_BUNDLE_VERSION);
    });

    it('should use jsdelivr CDN for USWDS-WC bundle', () => {
      expect(CDN_URLS.uswdsWcJs).toContain('cdn.jsdelivr.net');
      expect(CDN_URLS.uswdsWcCss).toContain('cdn.jsdelivr.net');
    });

    it('should point to correct file extensions', () => {
      expect(CDN_URLS.uswdsCss).toMatch(/\.css$/);
      expect(CDN_URLS.uswdsWcJs).toMatch(/\.js$/);
      expect(CDN_URLS.uswdsWcCss).toMatch(/\.css$/);
    });
  });

  describe('Script and Style Loading', () => {
    let testContainer: HTMLDivElement;

    beforeEach(() => {
      testContainer = document.createElement('div');
      document.body.appendChild(testContainer);
    });

    afterEach(() => {
      document.body.removeChild(testContainer);
    });

    it('should create valid link elements for CSS', () => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = CDN_URLS.uswdsCss;

      expect(link.rel).toBe('stylesheet');
      expect(link.href).toContain('uswds');
      expect(link.href).toContain('.css');
    });

    it('should create valid script elements for JS', () => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = CDN_URLS.uswdsWcJs;

      expect(script.type).toBe('module');
      expect(script.src).toContain('uswds-wc');
      expect(script.src).toContain('.js');
    });

    it('should allow creating usa-button element', () => {
      const button = document.createElement('usa-button');
      testContainer.appendChild(button);

      expect(button.tagName.toLowerCase()).toBe('usa-button');
      expect(testContainer.contains(button)).toBe(true);
    });

    it('should allow setting attributes on usa-button', () => {
      const button = document.createElement('usa-button');
      button.setAttribute('variant', 'secondary');
      button.setAttribute('size', 'big');
      button.setAttribute('disabled', '');
      button.textContent = 'Test Button';

      expect(button.getAttribute('variant')).toBe('secondary');
      expect(button.getAttribute('size')).toBe('big');
      expect(button.hasAttribute('disabled')).toBe(true);
      expect(button.textContent).toBe('Test Button');
    });
  });

  describe('Document Fragment Testing', () => {
    it('should parse usa-button HTML correctly', () => {
      const template = document.createElement('template');
      template.innerHTML = '<usa-button>Click me</usa-button>';

      const button = template.content.querySelector('usa-button');
      expect(button).not.toBeNull();
      expect(button?.tagName.toLowerCase()).toBe('usa-button');
      expect(button?.textContent).toBe('Click me');
    });

    it('should parse usa-button with attributes', () => {
      const template = document.createElement('template');
      template.innerHTML = '<usa-button variant="secondary" size="big">Click me</usa-button>';

      const button = template.content.querySelector('usa-button');
      expect(button?.getAttribute('variant')).toBe('secondary');
      expect(button?.getAttribute('size')).toBe('big');
    });

    it('should handle multiple usa-button elements', () => {
      const template = document.createElement('template');
      template.innerHTML = `
        <usa-button>Button 1</usa-button>
        <usa-button variant="outline">Button 2</usa-button>
      `;

      const buttons = template.content.querySelectorAll('usa-button');
      expect(buttons.length).toBe(2);
      expect(buttons[0].textContent).toBe('Button 1');
      expect(buttons[1].getAttribute('variant')).toBe('outline');
    });
  });

  describe('Version Configuration', () => {
    it('should have valid version numbers', () => {
      // Semantic versioning pattern
      const semverPattern = /^\d+\.\d+\.\d+$/;

      expect(USWDS_VERSION).toMatch(semverPattern);
      expect(USWDS_WC_BUNDLE_VERSION).toMatch(semverPattern);
    });

    it('should use compatible versions', () => {
      // USWDS should be 3.x
      expect(USWDS_VERSION).toMatch(/^3\./);

      // USWDS-WC should be 2.x
      expect(USWDS_WC_BUNDLE_VERSION).toMatch(/^2\./);
    });
  });
});
