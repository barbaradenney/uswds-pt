import { describe, it, expect, beforeEach, vi } from 'vitest';
import { COMPONENT_TRAITS, registerComponentTraits } from '../component-traits';

describe('Component Registration', () => {
  let mockEditor: any;
  let mockComponents: any;
  let registeredTypes: Map<string, any>;

  beforeEach(() => {
    registeredTypes = new Map();

    // Mock Components API
    mockComponents = {
      addType: vi.fn((tagName: string, config: any) => {
        registeredTypes.set(tagName, config);
      }),
    };

    // Mock editor
    mockEditor = {
      Components: mockComponents,
      on: vi.fn(),
    };
  });

  describe('registerComponentTraits', () => {
    it('should register all component types', () => {
      registerComponentTraits(mockEditor);

      // Should call addType for each component
      expect(mockComponents.addType).toHaveBeenCalledTimes(COMPONENT_TRAITS.length);

      // Should register each component
      COMPONENT_TRAITS.forEach(config => {
        expect(registeredTypes.has(config.tagName)).toBe(true);
      });
    });

    it('should register usa-button component type', () => {
      registerComponentTraits(mockEditor);

      expect(registeredTypes.has('usa-button')).toBe(true);

      const buttonConfig = registeredTypes.get('usa-button');
      expect(buttonConfig).toBeDefined();
      expect(buttonConfig.isComponent).toBeDefined();
      expect(buttonConfig.model).toBeDefined();
      expect(buttonConfig.model.defaults).toBeDefined();
    });

    it('should set correct defaults for usa-button', () => {
      registerComponentTraits(mockEditor);

      const buttonConfig = registeredTypes.get('usa-button');
      const defaults = buttonConfig.model.defaults;

      expect(defaults.tagName).toBe('usa-button');
      expect(defaults.draggable).toBe(true);
      expect(defaults.droppable).toBe(false);
      expect(Array.isArray(defaults.traits)).toBe(true);
      expect(defaults.traits.length).toBeGreaterThan(0);
    });

    it('should include all expected traits for usa-button', () => {
      registerComponentTraits(mockEditor);

      const buttonConfig = registeredTypes.get('usa-button');
      const traits = buttonConfig.model.defaults.traits;
      const traitNames = traits.map((t: any) => t.name);

      expect(traitNames).toContain('text');
      expect(traitNames).toContain('variant');
      expect(traitNames).toContain('size');
      expect(traitNames).toContain('disabled');
      expect(traitNames).toContain('href');
    });

    it('should have valid isComponent function for usa-button', () => {
      registerComponentTraits(mockEditor);

      const buttonConfig = registeredTypes.get('usa-button');
      const { isComponent } = buttonConfig;

      // Create mock HTML elements
      const buttonElement = { tagName: 'USA-BUTTON' };
      const divElement = { tagName: 'DIV' };

      expect(isComponent(buttonElement)).toBe(true);
      expect(isComponent(divElement)).toBe(false);
    });

    it('should handle DomComponents API (alias)', () => {
      // Test with DomComponents instead of Components
      const mockDomComponents = {
        addType: vi.fn(),
      };

      const editorWithDomComponents = {
        DomComponents: mockDomComponents,
        on: vi.fn(),
      };

      registerComponentTraits(editorWithDomComponents);

      expect(mockDomComponents.addType).toHaveBeenCalled();
    });

    it('should handle missing Components API gracefully', () => {
      const editorWithoutComponents = {
        on: vi.fn(),
      };

      // Should not throw
      expect(() => {
        registerComponentTraits(editorWithoutComponents);
      }).not.toThrow();
    });

    it('should register options-json event handler', () => {
      registerComponentTraits(mockEditor);

      expect(mockEditor.on).toHaveBeenCalledWith(
        'component:update:options-json',
        expect.any(Function)
      );
    });
  });

  describe('Component trait structure', () => {
    it('should have valid trait types', () => {
      registerComponentTraits(mockEditor);

      const buttonConfig = registeredTypes.get('usa-button');
      const traits = buttonConfig.model.defaults.traits;

      traits.forEach((trait: any) => {
        expect(['text', 'number', 'checkbox', 'select', 'color', 'textarea']).toContain(trait.type);
      });
    });

    it('should have valid select trait options', () => {
      registerComponentTraits(mockEditor);

      const buttonConfig = registeredTypes.get('usa-button');
      const traits = buttonConfig.model.defaults.traits;
      const selectTraits = traits.filter((t: any) => t.type === 'select');

      selectTraits.forEach((trait: any) => {
        expect(Array.isArray(trait.options)).toBe(true);
        expect(trait.options.length).toBeGreaterThan(0);

        trait.options.forEach((option: any) => {
          expect(option.id).toBeDefined();
          expect(option.label).toBeDefined();
        });
      });
    });
  });
});
