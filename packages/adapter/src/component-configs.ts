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

        // Wait for web component to render if needed
        const updateButton = () => {
          const button = element.querySelector('button');
          if (button) {
            button.textContent = value || '';
            element.setAttribute('text', value || '');
            console.log('USWDS-PT: Set button textContent to:', value);
          } else {
            console.warn('USWDS-PT: No button element found inside usa-button');
          }
        };

        // If using Lit, wait for updateComplete
        if (typeof (element as any).updateComplete === 'object') {
          (element as any).updateComplete.then(updateButton);
        } else {
          updateButton();
        }
      },
      getValue: (element) => {
        const button = element.querySelector('button');
        return button?.textContent || element.getAttribute('text') || '';
      },
      onInit: (element, value) => {
        console.log('USWDS-PT: text onInit called with:', value);

        // Wait for web component to render before setting initial text
        const initButton = () => {
          const button = element.querySelector('button');
          if (button) {
            button.textContent = value || 'Click me';
            element.setAttribute('text', value || 'Click me');
            console.log('USWDS-PT: Initialized button text to:', value || 'Click me');
          } else {
            // If button still not found, try again after a short delay
            setTimeout(() => {
              const btn = element.querySelector('button');
              if (btn) {
                btn.textContent = value || 'Click me';
                element.setAttribute('text', value || 'Click me');
                console.log('USWDS-PT: Initialized button text (delayed) to:', value || 'Click me');
              }
            }, 100);
          }
        };

        // If using Lit, wait for updateComplete
        if (typeof (element as any).updateComplete === 'object') {
          (element as any).updateComplete.then(initButton);
        } else {
          // Otherwise use requestAnimationFrame to wait for next render
          requestAnimationFrame(initButton);
        }
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
