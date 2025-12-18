/**
 * Component configurations for USWDS Web Components
 * Defines how each component's traits should interact with the web component
 */

import { ComponentConfig, WebComponentTraitManager } from './WebComponentTraitManager';

/**
 * Configuration for usa-button component
 */
export const usaButtonConfig: ComponentConfig = {
  tagName: 'usa-button',
  traits: {
    text: {
      onChange: (element, value) => {
        console.log('USWDS-PT: text onChange called with:', value);

        // Set the attribute (like href does)
        element.setAttribute('text', value || '');

        // Also update the button textContent (synchronously)
        const button = element.querySelector('button');
        if (button) {
          button.textContent = value || '';
          console.log('USWDS-PT: Set button textContent to:', value);
        }
      },
      getValue: (element) => {
        // Read from attribute first (source of truth), then button textContent as fallback
        return element.getAttribute('text') || '';
      },
    },

    variant: {
      onChange: (element, value) => {
        WebComponentTraitManager.setAttribute(element, 'variant', value);
      },
      getValue: (element) => {
        return element.getAttribute('variant') || 'default';
      },
    },

    size: {
      onChange: (element, value) => {
        console.log('USWDS-PT: size onChange called with:', value, 'type:', typeof value);
        if (value && value !== 'default') {
          WebComponentTraitManager.setAttribute(element, 'size', value);
          console.log('USWDS-PT: Set size attribute to:', value);
        } else {
          element.removeAttribute('size');
          console.log('USWDS-PT: Removed size attribute (value was:', value, ')');
        }
      },
      getValue: (element) => {
        return element.getAttribute('size') || 'default';
      },
    },

    disabled: {
      onChange: (element, value) => {
        const isDisabled = value === true || value === 'true' || value === '';

        // Set on the web component
        WebComponentTraitManager.setBooleanAttribute(element, 'disabled', isDisabled);

        // Since USWDS-WC uses Light DOM, we can access the internal button directly
        const button = element.querySelector('button');
        if (button) {
          if (isDisabled) {
            button.setAttribute('disabled', '');
            button.disabled = true;
          } else {
            button.removeAttribute('disabled');
            button.disabled = false;
          }
        }
      },
      getValue: (element) => {
        return element.hasAttribute('disabled');
      },
      onInit: (element, value) => {
        const isDisabled = value === true || value === 'true' || value === '';
        if (isDisabled) {
          WebComponentTraitManager.setBooleanAttribute(element, 'disabled', true);
        }
      },
    },

    href: {
      onChange: (element, value) => {
        if (value && value.trim() !== '') {
          WebComponentTraitManager.setAttribute(element, 'href', value);
        } else {
          element.removeAttribute('href');
        }
      },
      getValue: (element) => {
        return element.getAttribute('href') || '';
      },
    },
  },
};

/**
 * Get all component configurations
 */
export function getAllComponentConfigs(): ComponentConfig[] {
  return [
    usaButtonConfig,
    // Add more component configs here as you uncomment them in DEFAULT_CONTENT
    // usaTextInputConfig,
    // usaSelectConfig,
    // etc.
  ];
}
