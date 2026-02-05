/**
 * Card Component Types
 *
 * Registers GrapesJS component types for USWDS card layouts:
 * - card-container: Outer card wrapper with usa-card class
 * - card-inner-container: Inner container (usa-card__container)
 * - card-body: Body content area (usa-card__body)
 */

import { containerDefaults, structuralDefaults } from '../component-defaults';

interface ComponentsAPI {
  addType(name: string, config: unknown): void;
}

/**
 * Register card container component types
 */
export function registerCardComponents(Components: ComponentsAPI): void {
  // Card container - a droppable USWDS card that can contain any content
  Components.addType('card-container', {
    extend: 'default',
    isComponent: (el: HTMLElement) => el.classList?.contains('uswds-card-container'),
    model: {
      defaults: {
        tagName: 'div',
        type: 'card-container',
        name: 'Card Container',
        ...containerDefaults,
        classes: ['usa-card', 'uswds-card-container'],
      },
    },
  });

  // Card inner container
  Components.addType('card-inner-container', {
    extend: 'default',
    isComponent: (el: HTMLElement) => el.classList?.contains('usa-card__container'),
    model: {
      defaults: {
        tagName: 'div',
        type: 'card-inner-container',
        name: 'Card Inner Container',
        ...structuralDefaults,
        classes: ['usa-card__container'],
      },
    },
  });

  // Card body
  Components.addType('card-body', {
    extend: 'default',
    isComponent: (el: HTMLElement) => el.classList?.contains('usa-card__body'),
    model: {
      defaults: {
        tagName: 'div',
        type: 'card-body',
        name: 'Card Body',
        ...structuralDefaults,
        classes: ['usa-card__body'],
      },
    },
  });
}
