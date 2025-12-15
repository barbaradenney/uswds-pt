import { describe, it, expect } from 'vitest';
import { DEFAULT_CONTENT, COMPONENT_ICONS } from '../constants';
import { COMPONENT_TRAITS } from '../component-traits';
import type { ComponentTraitConfig } from '../component-traits';

describe('Configuration Validation', () => {
  describe('DEFAULT_CONTENT', () => {
    it('should have valid content for each component', () => {
      Object.entries(DEFAULT_CONTENT).forEach(([tagName, content]) => {
        // Check that content is a non-empty string
        expect(content).toBeTruthy();
        expect(typeof content).toBe('string');
      });
    });

    it('should match COMPONENT_TRAITS entries', () => {
      const contentKeys = Object.keys(DEFAULT_CONTENT);
      const traitKeys = COMPONENT_TRAITS.map(c => c.tagName);

      // Every component in DEFAULT_CONTENT should have matching traits
      contentKeys.forEach(key => {
        expect(traitKeys).toContain(key);
      });
    });
  });

  describe('COMPONENT_TRAITS', () => {
    it('should have valid trait configurations', () => {
      COMPONENT_TRAITS.forEach((config: ComponentTraitConfig) => {
        // Should have a tag name
        expect(config.tagName).toBeTruthy();
        expect(typeof config.tagName).toBe('string');

        // Should have traits array
        expect(Array.isArray(config.traits)).toBe(true);
        expect(config.traits.length).toBeGreaterThan(0);

        // Each trait should have required fields
        config.traits.forEach(trait => {
          expect(trait.name).toBeTruthy();
          expect(trait.label).toBeTruthy();
          expect(trait.type).toBeTruthy();
          expect(['text', 'number', 'checkbox', 'select', 'color', 'textarea']).toContain(trait.type);

          // Select traits should have options
          if (trait.type === 'select') {
            expect(Array.isArray(trait.options)).toBe(true);
            expect(trait.options!.length).toBeGreaterThan(0);
            trait.options!.forEach(option => {
              expect(option.id).toBeDefined();
              expect(option.label).toBeDefined();
            });
          }
        });
      });
    });

    it('should have matching entries in DEFAULT_CONTENT', () => {
      const contentKeys = Object.keys(DEFAULT_CONTENT);
      const traitKeys = COMPONENT_TRAITS.map(c => c.tagName);

      // Every component with traits should have default content
      traitKeys.forEach(key => {
        expect(contentKeys).toContain(key);
      });
    });
  });

  describe('COMPONENT_ICONS', () => {
    it('should have icons for all components in DEFAULT_CONTENT', () => {
      Object.keys(DEFAULT_CONTENT).forEach(tagName => {
        // Should have either a specific icon or fall back to default
        const hasIcon = tagName in COMPONENT_ICONS || 'default' in COMPONENT_ICONS;
        expect(hasIcon).toBe(true);
      });
    });

    it('should have valid SVG content', () => {
      Object.values(COMPONENT_ICONS).forEach(icon => {
        // Check that icon is an SVG string
        expect(icon).toContain('<svg');
        expect(icon).toContain('</svg>');
        expect(icon).toContain('viewBox');
      });
    });
  });

  describe('usa-button configuration', () => {
    it('should have complete configuration for usa-button', () => {
      // Check DEFAULT_CONTENT
      expect(DEFAULT_CONTENT['usa-button']).toBeDefined();
      expect(DEFAULT_CONTENT['usa-button']).toBe('Click me');

      // Check COMPONENT_TRAITS
      const buttonTraits = COMPONENT_TRAITS.find(c => c.tagName === 'usa-button');
      expect(buttonTraits).toBeDefined();
      expect(buttonTraits!.traits.length).toBeGreaterThan(0);

      // Check for expected traits
      const traitNames = buttonTraits!.traits.map(t => t.name);
      expect(traitNames).toContain('text');
      expect(traitNames).toContain('variant');
      expect(traitNames).toContain('size');
      expect(traitNames).toContain('disabled');
      expect(traitNames).toContain('href');

      // Check COMPONENT_ICONS
      const hasIcon = 'usa-button' in COMPONENT_ICONS || 'default' in COMPONENT_ICONS;
      expect(hasIcon).toBe(true);
    });

    it('should have valid variant options', () => {
      const buttonTraits = COMPONENT_TRAITS.find(c => c.tagName === 'usa-button');
      const variantTrait = buttonTraits!.traits.find(t => t.name === 'variant');

      expect(variantTrait).toBeDefined();
      expect(variantTrait!.type).toBe('select');
      expect(variantTrait!.options).toBeDefined();
      expect(variantTrait!.options!.length).toBeGreaterThan(0);

      // Check for expected variant options
      const variantIds = variantTrait!.options!.map(o => o.id);
      expect(variantIds).toContain('default');
      expect(variantIds).toContain('secondary');
      expect(variantIds).toContain('outline');
    });
  });
});
