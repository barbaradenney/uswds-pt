/**
 * Component Registration Smoke Tests
 *
 * Validates that the component registry produces valid block definitions
 * and trait structures for representative USWDS components.
 */

import { describe, it, expect } from 'vitest';
import { componentRegistry } from '../component-registry-v2';
import type { ComponentRegistration, UnifiedTrait } from '../components/shared-utils';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Assert that a component registration has the required shape.
 */
function assertValidRegistration(reg: ComponentRegistration | undefined, tagName: string): asserts reg is ComponentRegistration {
  expect(reg).toBeDefined();
  expect(reg!.tagName).toBe(tagName);
  expect(reg!.traits).toBeDefined();
  expect(typeof reg!.traits).toBe('object');
}

/**
 * Assert that a trait definition has the minimum required fields.
 */
function assertValidTraitDefinition(trait: UnifiedTrait, expectedName: string): void {
  // Definition shape
  expect(trait.definition).toBeDefined();
  expect(trait.definition.name).toBe(expectedName);
  expect(trait.definition.label).toBeTruthy();
  expect(typeof trait.definition.label).toBe('string');
  expect(trait.definition.type).toBeTruthy();
  expect(typeof trait.definition.type).toBe('string');

  // Handler shape
  expect(trait.handler).toBeDefined();
  expect(typeof trait.handler.onChange).toBe('function');
  // getValue is optional but common
}

/**
 * Assert that a select-type trait has valid options.
 */
function assertValidSelectTrait(trait: UnifiedTrait): void {
  expect(trait.definition.type).toBe('select');
  expect(Array.isArray(trait.definition.options)).toBe(true);
  expect(trait.definition.options!.length).toBeGreaterThan(0);
  for (const option of trait.definition.options!) {
    expect(option.id).toBeTruthy();
    expect(option.label).toBeTruthy();
  }
}

/**
 * Assert that a checkbox-type trait has correct defaults.
 */
function assertValidCheckboxTrait(trait: UnifiedTrait): void {
  expect(trait.definition.type).toBe('checkbox');
  expect(typeof trait.definition.default).toBe('boolean');
}

// ============================================================================
// Registry-level Tests
// ============================================================================

describe('Component Registry', () => {
  it('should have registered components', () => {
    const all = componentRegistry.getAll();
    expect(all.length).toBeGreaterThan(0);
  });

  it('should return undefined for unregistered components', () => {
    expect(componentRegistry.get('non-existent-component')).toBeUndefined();
  });

  it('should return empty trait definitions for unregistered components', () => {
    expect(componentRegistry.getTraitDefinitions('non-existent')).toEqual([]);
  });

  it('should return empty trait handlers for unregistered components', () => {
    expect(componentRegistry.getTraitHandlers('non-existent')).toEqual({});
  });

  it('should return empty trait defaults for unregistered components', () => {
    expect(componentRegistry.getTraitDefaults('non-existent')).toEqual({});
  });
});

// ============================================================================
// usa-button
// ============================================================================

describe('usa-button registration', () => {
  const reg = componentRegistry.get('usa-button');

  it('should be registered with correct tag name', () => {
    assertValidRegistration(reg, 'usa-button');
  });

  it('should not be droppable (leaf component)', () => {
    expect(reg!.droppable).toBe(false);
  });

  it('should have traits with valid definitions', () => {
    const traitNames = Object.keys(reg!.traits);
    expect(traitNames.length).toBeGreaterThan(0);

    for (const name of traitNames) {
      assertValidTraitDefinition(reg!.traits[name], name);
    }
  });

  it('should have a variant/style select trait', () => {
    // usa-button may use "variant" or "style" for its appearance options
    const variantTrait = reg!.traits['variant'] || reg!.traits['style'];
    expect(variantTrait).toBeDefined();
    if (variantTrait) {
      assertValidSelectTrait(variantTrait);
    }
  });

  it('should produce GrapesJS-compatible trait definitions', () => {
    const traitDefs = componentRegistry.getTraitDefinitions('usa-button');
    expect(traitDefs.length).toBeGreaterThan(0);

    for (const def of traitDefs) {
      expect(def.name).toBeTruthy();
      // Functions should be stripped from definitions
      for (const value of Object.values(def)) {
        expect(typeof value).not.toBe('function');
      }
    }
  });

  it('should produce trait handlers', () => {
    const handlers = componentRegistry.getTraitHandlers('usa-button');
    expect(Object.keys(handlers).length).toBeGreaterThan(0);

    for (const handler of Object.values(handlers)) {
      expect(typeof handler.onChange).toBe('function');
    }
  });
});

// ============================================================================
// usa-card
// ============================================================================

describe('usa-card registration', () => {
  const reg = componentRegistry.get('usa-card');

  it('should be registered with correct tag name', () => {
    assertValidRegistration(reg, 'usa-card');
  });

  it('should have heading and text traits', () => {
    expect(reg!.traits['heading']).toBeDefined();
    assertValidTraitDefinition(reg!.traits['heading'], 'heading');
    expect(reg!.traits['heading'].definition.type).toBe('text');

    expect(reg!.traits['text']).toBeDefined();
    assertValidTraitDefinition(reg!.traits['text'], 'text');
  });

  it('should have default values for heading and text', () => {
    expect(reg!.traits['heading'].definition.default).toBeTruthy();
    expect(reg!.traits['text'].definition.default).toBeTruthy();
  });

  it('should produce trait defaults', () => {
    const defaults = componentRegistry.getTraitDefaults('usa-card');
    expect(defaults).toBeDefined();
    expect(defaults['heading']).toBeTruthy();
  });

  it('trait handler should read/write heading attribute', () => {
    const handler = reg!.traits['heading'].handler;

    // Create a test element
    const el = document.createElement('usa-card');

    // onChange should set attribute
    handler.onChange(el, 'My Card Title');
    expect(el.getAttribute('heading')).toBe('My Card Title');

    // getValue should read it back
    if (handler.getValue) {
      const value = handler.getValue(el);
      expect(value).toBe('My Card Title');
    }
  });
});

// ============================================================================
// usa-alert
// ============================================================================

describe('usa-alert registration', () => {
  const reg = componentRegistry.get('usa-alert');

  it('should be registered with correct tag name', () => {
    assertValidRegistration(reg, 'usa-alert');
  });

  it('should not be droppable', () => {
    expect(reg!.droppable).toBe(false);
  });

  it('should have variant trait with select type', () => {
    const variant = reg!.traits['variant'];
    expect(variant).toBeDefined();
    assertValidTraitDefinition(variant, 'variant');
    assertValidSelectTrait(variant);

    // Should include standard alert variants
    const optionIds = variant.definition.options!.map(o => o.id);
    expect(optionIds).toContain('info');
    expect(optionIds).toContain('success');
    expect(optionIds).toContain('warning');
    expect(optionIds).toContain('error');
  });

  it('should have heading and text traits', () => {
    expect(reg!.traits['heading']).toBeDefined();
    assertValidTraitDefinition(reg!.traits['heading'], 'heading');

    expect(reg!.traits['text']).toBeDefined();
    assertValidTraitDefinition(reg!.traits['text'], 'text');
  });

  it('should have slim checkbox trait', () => {
    const slim = reg!.traits['slim'];
    expect(slim).toBeDefined();
    assertValidTraitDefinition(slim, 'slim');
    assertValidCheckboxTrait(slim);
    expect(slim.definition.default).toBe(false);
  });

  it('should have no-icon checkbox trait', () => {
    const noIcon = reg!.traits['no-icon'];
    expect(noIcon).toBeDefined();
    assertValidTraitDefinition(noIcon, 'no-icon');
    assertValidCheckboxTrait(noIcon);
    expect(noIcon.definition.default).toBe(false);
  });

  it('trait handler should toggle slim attribute', () => {
    const handler = reg!.traits['slim'].handler;
    const el = document.createElement('usa-alert');

    handler.onChange(el, true);
    expect(el.hasAttribute('slim')).toBe(true);

    handler.onChange(el, false);
    expect(el.hasAttribute('slim')).toBe(false);
  });

  it('trait handler should set variant attribute', () => {
    const handler = reg!.traits['variant'].handler;
    const el = document.createElement('usa-alert');

    handler.onChange(el, 'error');
    expect(el.getAttribute('variant')).toBe('error');

    if (handler.getValue) {
      expect(handler.getValue(el)).toBe('error');
    }
  });
});

// ============================================================================
// usa-text-input
// ============================================================================

describe('usa-text-input registration', () => {
  const reg = componentRegistry.get('usa-text-input');

  it('should be registered with correct tag name', () => {
    assertValidRegistration(reg, 'usa-text-input');
  });

  it('should have a label trait', () => {
    const label = reg!.traits['label'];
    expect(label).toBeDefined();
    assertValidTraitDefinition(label, 'label');
  });

  it('should have traits with valid definitions', () => {
    for (const [name, trait] of Object.entries(reg!.traits)) {
      assertValidTraitDefinition(trait, name);
    }
  });

  it('should produce GrapesJS-compatible trait definitions', () => {
    const traitDefs = componentRegistry.getTraitDefinitions('usa-text-input');
    expect(traitDefs.length).toBeGreaterThan(0);

    for (const def of traitDefs) {
      expect(def.name).toBeTruthy();
    }
  });
});

// ============================================================================
// usa-accordion
// ============================================================================

describe('usa-accordion registration', () => {
  const reg = componentRegistry.get('usa-accordion');

  it('should be registered with correct tag name', () => {
    assertValidRegistration(reg, 'usa-accordion');
  });

  it('should have traits with valid definitions', () => {
    const traitNames = Object.keys(reg!.traits);
    expect(traitNames.length).toBeGreaterThan(0);

    for (const name of traitNames) {
      assertValidTraitDefinition(reg!.traits[name], name);
    }
  });

  it('should produce trait definitions and handlers that match', () => {
    const traitDefs = componentRegistry.getTraitDefinitions('usa-accordion');
    const handlers = componentRegistry.getTraitHandlers('usa-accordion');

    // Every definition should have a handler
    for (const def of traitDefs) {
      expect(handlers[def.name as string]).toBeDefined();
      expect(typeof handlers[def.name as string].onChange).toBe('function');
    }
  });
});

// ============================================================================
// Cross-component Structural Tests
// ============================================================================

describe('cross-component structural validation', () => {
  const testComponents = ['usa-button', 'usa-card', 'usa-alert', 'usa-text-input', 'usa-accordion'];

  for (const tagName of testComponents) {
    describe(`${tagName}`, () => {
      it('should have trait definitions count matching trait handlers count', () => {
        const defs = componentRegistry.getTraitDefinitions(tagName);
        const handlers = componentRegistry.getTraitHandlers(tagName);
        expect(defs.length).toBe(Object.keys(handlers).length);
      });

      it('should have trait definition names matching handler keys', () => {
        const defs = componentRegistry.getTraitDefinitions(tagName);
        const handlers = componentRegistry.getTraitHandlers(tagName);
        const defNames = new Set(defs.map(d => d.name));
        const handlerNames = new Set(Object.keys(handlers));
        expect(defNames).toEqual(handlerNames);
      });

      it('should produce serializable trait definitions (no functions)', () => {
        const defs = componentRegistry.getTraitDefinitions(tagName);
        for (const def of defs) {
          // Ensure all values are serializable (no functions)
          const json = JSON.stringify(def);
          expect(json).toBeTruthy();
          // Round-trip should work
          const parsed = JSON.parse(json);
          expect(parsed.name).toBe(def.name);
        }
      });
    });
  }
});
