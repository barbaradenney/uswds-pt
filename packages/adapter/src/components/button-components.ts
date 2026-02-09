/**
 * Button Components
 *
 * Registers the usa-button component.
 */

import type { ComponentRegistration } from './shared-utils.js';
import {
  createAttributeTrait,
  createBooleanTrait,
} from './shared-utils.js';
import { createPageLinkTraits } from './page-link-traits.js';

/**
 * Registry interface to avoid circular imports.
 * Component files receive this instead of the concrete ComponentRegistry class.
 */
interface RegistryLike {
  register(registration: ComponentRegistration): void;
}

export function registerButtonComponents(registry: RegistryLike): void {

/**
 * USA Button Component
 *
 * Example of declarative component registration using trait factories.
 * Adding a new component is now just 10-20 lines of configuration.
 */
registry.register({
  tagName: 'usa-button',
  droppable: false,

  traits: {
    // Text content - usa-button uses slot content, not a text attribute
    // We need a custom handler that:
    // 1. Updates the DOM inner element
    // 2. Updates the GrapesJS component model for persistence across page switches
    text: {
      definition: {
        name: 'text',
        label: 'Button Text',
        type: 'text',
        default: 'Click me',
      },
      handler: {
        onChange: (element: HTMLElement, value: any, _oldValue?: any, component?: any) => {
          const textValue = value || 'Click me';

          // Store as attribute for trait panel persistence
          element.setAttribute('text', textValue);

          // Update the GrapesJS component attributes model (for persistence)
          // NOTE: We DON'T modify component.components() here because it breaks
          // the web component rendering in the canvas. The export transform in
          // export.ts handles converting the text attribute to slot content.
          if (component) {
            try {
              const attrs = component.get('attributes') || {};
              if (attrs.text !== textValue) {
                component.set('attributes', { ...attrs, text: textValue });
              }
            } catch (_e) {
              // Ignore errors during attribute sync
            }
          }

          // Find the inner button or anchor element and update its text (for editor display)
          const updateInnerElement = () => {
            const inner = element.querySelector('button, a');
            if (inner) {
              inner.textContent = textValue;
              return true;
            }
            return false;
          };

          // Try immediately
          if (updateInnerElement()) return;

          // Retry with increasing delays for async Lit rendering
          let attempts = 0;
          const maxAttempts = 30;
          const intervalId = setInterval(() => {
            attempts++;
            if (updateInnerElement() || attempts >= maxAttempts) {
              clearInterval(intervalId);
            }
          }, 100);
        },
        getValue: (element: HTMLElement) => {
          // First check the attribute (our stored value)
          const attrValue = element.getAttribute('text');
          if (attrValue) return attrValue;

          // Fallback: get from inner element
          const inner = element.querySelector('button, a');
          if (inner) return inner.textContent || 'Click me';

          return 'Click me';
        },
      },
    },

    // Variant - simple attribute (removes 'default')
    variant: createAttributeTrait('variant', {
      label: 'Variant',
      type: 'select',
      default: 'default',
      removeDefaults: ['default', ''],
      options: [
        { id: 'default', label: 'Default' },
        { id: 'secondary', label: 'Secondary' },
        { id: 'accent-cool', label: 'Accent Cool' },
        { id: 'accent-warm', label: 'Accent Warm' },
        { id: 'base', label: 'Base' },
        { id: 'outline', label: 'Outline' },
        { id: 'inverse', label: 'Inverse' },
        { id: 'unstyled', label: 'Unstyled' },
      ],
    }),

    // Size - simple attribute (removes 'default')
    size: createAttributeTrait('size', {
      label: 'Size',
      type: 'select',
      default: 'default',
      removeDefaults: ['default', ''],
      options: [
        { id: 'default', label: 'Default' },
        { id: 'big', label: 'Big' },
      ],
    }),

    // Disabled - boolean with internal sync
    disabled: createBooleanTrait('disabled', {
      label: 'Disabled',
      default: false,
      syncToInternal: 'button',
    }),

    // Page link traits - link to pages or external URLs
    ...createPageLinkTraits(),
  },
});

}
