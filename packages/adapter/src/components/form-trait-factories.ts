/**
 * Form Trait Factories
 *
 * Shared factory functions for creating common form-related traits
 * such as hint text, error messages, and radio hint text.
 */

import type { UnifiedTrait } from './shared-utils.js';

/**
 * Create a hint trait for form inputs (text-input, textarea, select, etc.)
 * Uses the usa-hint class pattern
 */
export function createFormHintTrait(): UnifiedTrait {
  return {
    definition: {
      name: 'hint',
      label: 'Help Text',
      type: 'text',
      default: '',
      placeholder: 'Optional help text',
    },
    handler: {
      onChange: (element: HTMLElement, value: any) => {
        const hintText = value?.trim() || '';
        if (hintText) {
          element.setAttribute('hint', hintText);
        } else {
          element.removeAttribute('hint');
        }
        // The web component should handle rendering the hint
        if (typeof (element as any).requestUpdate === 'function') {
          (element as any).requestUpdate();
        }
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute('hint') || '';
      },
    },
  };
}

/**
 * Create a hint trait for radio buttons (similar to checkbox pattern)
 */
export function createRadioHintTrait(): UnifiedTrait {
  return {
    definition: {
      name: 'hint',
      label: 'Help Text',
      type: 'text',
      default: '',
      placeholder: 'Optional help text',
    },
    handler: {
      onChange: (element: HTMLElement, value: any) => {
        const hintText = value?.trim() || '';
        element.setAttribute('hint', hintText);

        // Find the label inside the radio
        const label = element.querySelector('.usa-radio__label');
        if (!label) return;

        // Find or manage the description span
        let descSpan = label.querySelector('.usa-radio__label-description');

        if (hintText) {
          if (!descSpan) {
            descSpan = document.createElement('span');
            descSpan.className = 'usa-radio__label-description';
            label.appendChild(descSpan);
          }
          descSpan.textContent = hintText;
        } else {
          descSpan?.remove();
        }
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute('hint') || '';
      },
      onInit: (element: HTMLElement, value: any) => {
        const hintText = value?.trim() || element.getAttribute('hint') || '';
        if (hintText) {
          setTimeout(() => {
            const label = element.querySelector('.usa-radio__label');
            if (label && !label.querySelector('.usa-radio__label-description')) {
              const descSpan = document.createElement('span');
              descSpan.className = 'usa-radio__label-description';
              descSpan.textContent = hintText;
              label.appendChild(descSpan);
            }
          }, 100);
        }
      },
    },
  };
}

/**
 * Create an error-message trait for form components
 */
export function createErrorMessageTrait(): UnifiedTrait {
  return {
    definition: {
      name: 'error-message',
      label: 'Error Message',
      type: 'text',
      default: '',
      placeholder: 'Error message to display',
    },
    handler: {
      onChange: (element: HTMLElement, value: any) => {
        const errorMsg = value?.trim() || '';
        if (errorMsg) {
          element.setAttribute('error-message', errorMsg);
        } else {
          element.removeAttribute('error-message');
        }
        // The web component should handle rendering the error message
        if (typeof (element as any).requestUpdate === 'function') {
          (element as any).requestUpdate();
        }
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute('error-message') || '';
      },
    },
  };
}
