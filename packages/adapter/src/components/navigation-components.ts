/**
 * Navigation Components (barrel)
 *
 * Re-exports and aggregates all navigation-related component registrations:
 * - Header components (usa-header)
 * - Footer components (usa-footer)
 * - Smaller navigation components (usa-in-page-navigation, usa-language-selector,
 *   usa-character-count, usa-memorable-date)
 */

import type { ComponentRegistration, TraitValue, UnifiedTrait } from './shared-utils.js';
import { triggerUpdate, traitStr } from './shared-utils.js';
import type { RegistryLike } from './shared-utils.js';
import type { GrapesComponentModel } from '../types.js';
import type { USWDSElement } from '@uswds-pt/shared';

/**
 * Language selector default values per slot.
 * Index 0 is unused so that slot numbers (1-5) align with array indices.
 */
const LANGUAGE_DEFAULTS: Array<{ label: string; value: string }> = [
  { label: '', value: '' },         // placeholder index 0
  { label: 'English', value: 'en' },
  { label: 'Español', value: 'es' },
  { label: 'Français', value: 'fr' },
  { label: '中文', value: 'zh' },
  { label: 'العربية', value: 'ar' },
];

/**
 * Create a pair of label/value traits for a single language slot.
 *
 * Slots 4+ include a `visible` callback that hides the trait unless the
 * user has set `lang-count` high enough.
 */
function createLanguageTraits(count: number): Record<string, UnifiedTrait> {
  const traits: Record<string, UnifiedTrait> = {};

  for (let i = 1; i <= count; i++) {
    const defaults = LANGUAGE_DEFAULTS[i];
    const needsVisibility = i >= 4;

    const visible = needsVisibility
      ? (component: GrapesComponentModel) => {
          try {
            return parseInt((component?.getAttributes?.() ?? {})['lang-count'] || '3', 10) >= i;
          } catch {
            return false;
          }
        }
      : undefined;

    traits[`lang${i}-label`] = {
      definition: {
        name: `lang${i}-label`,
        label: `Language ${i} Label`,
        type: 'text',
        default: defaults.label,
        ...(visible ? { visible } : {}),
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          element.setAttribute(`lang${i}-label`, traitStr(value, defaults.label));
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => element.getAttribute(`lang${i}-label`) || defaults.label,
      },
    };

    traits[`lang${i}-value`] = {
      definition: {
        name: `lang${i}-value`,
        label: `Language ${i} Value`,
        type: 'text',
        default: defaults.value,
        ...(visible ? { visible } : {}),
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          element.setAttribute(`lang${i}-value`, traitStr(value, defaults.value));
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => element.getAttribute(`lang${i}-value`) || defaults.value,
      },
    };
  }

  return traits;
}
import { registerHeaderComponents } from './header-components.js';
import { registerFooterComponents } from './footer-components.js';

export function registerNavigationComponents(registry: RegistryLike): void {
  // Header: usa-header with navigation, search, skip link, logo
  registerHeaderComponents(registry);

  // Footer: usa-footer with agency info, sections, contact details
  registerFooterComponents(registry);

  // Remaining smaller navigation/utility components are registered inline below.

/**
 * USA In-Page Navigation Component
 *
 * Sidebar table of contents that links to headings on the page.
 */
registry.register({
  tagName: 'usa-in-page-navigation',
  droppable: false,

  traits: {
    'nav-title': {
      definition: {
        name: 'nav-title',
        label: 'Title',
        type: 'text',
        default: 'On this page',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value, 'On this page');
          element.setAttribute('nav-title', text);
          (element as USWDSElement).navTitle = text;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).navTitle || element.getAttribute('nav-title') || 'On this page';
        },
      },
    },

    'heading-level': {
      definition: {
        name: 'heading-level',
        label: 'Heading Level',
        type: 'select',
        default: 'h2',
        options: [
          { id: 'h2', label: 'H2' },
          { id: 'h3', label: 'H3' },
          { id: 'h4', label: 'H4' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const level = traitStr(value, 'h2');
          element.setAttribute('heading-level', level);
          (element as USWDSElement).headingLevel = level;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).headingLevel || element.getAttribute('heading-level') || 'h2';
        },
      },
    },
  },
});

/**
 * USA Language Selector Component
 *
 * Allows users to switch between languages.
 */
registry.register({
  tagName: 'usa-language-selector',
  droppable: false,

  traits: {
    variant: {
      definition: {
        name: 'variant',
        label: 'Variant',
        type: 'select',
        default: 'default',
        options: [
          { id: 'default', label: 'Default' },
          { id: 'unstyled', label: 'Unstyled' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const variant = traitStr(value, 'default');
          element.setAttribute('variant', variant);
          (element as USWDSElement).variant = variant;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).variant || element.getAttribute('variant') || 'default';
        },
      },
    },

    'lang-count': {
      definition: {
        name: 'lang-count',
        label: 'Number of Languages',
        type: 'select',
        default: '3',
        options: [
          { id: '2', label: '2' },
          { id: '3', label: '3' },
          { id: '4', label: '4' },
          { id: '5', label: '5' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          element.setAttribute('lang-count', traitStr(value, '3'));
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('lang-count') || '3';
        },
      },
    },

    ...createLanguageTraits(5),
  },
});

/**
 * USA Character Count Component
 *
 * Text input or textarea with a character count indicator.
 */
registry.register({
  tagName: 'usa-character-count',
  droppable: false,

  traits: {
    label: {
      definition: {
        name: 'label',
        label: 'Label',
        type: 'text',
        default: 'Message',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value, 'Message');
          element.setAttribute('label', text);
          (element as USWDSElement).label = text;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).label || element.getAttribute('label') || 'Message';
        },
      },
    },

    maxlength: {
      definition: {
        name: 'maxlength',
        label: 'Max Characters',
        type: 'number',
        default: 200,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const maxlen = parseInt(traitStr(value, '200'), 10) || 200;
          element.setAttribute('maxlength', String(maxlen));
          (element as USWDSElement).maxlength = maxlen;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return parseInt(element.getAttribute('maxlength') || '200', 10);
        },
      },
    },

    name: {
      definition: {
        name: 'name',
        label: 'Field Name',
        type: 'text',
        default: '',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          element.setAttribute('name', traitStr(value));
          (element as USWDSElement).name = traitStr(value);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('name') || '';
        },
      },
    },

    hint: {
      definition: {
        name: 'hint',
        label: 'Hint Text',
        type: 'text',
        default: '',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          element.setAttribute('hint', traitStr(value));
          (element as USWDSElement).hint = traitStr(value);
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).hint || element.getAttribute('hint') || '';
        },
      },
    },
  },
});

/**
 * USA Memorable Date Component
 *
 * A date input pattern using separate month, day, and year fields.
 */
registry.register({
  tagName: 'usa-memorable-date',
  droppable: false,

  traits: {
    legend: {
      definition: {
        name: 'legend',
        label: 'Legend',
        type: 'text',
        default: 'Date of birth',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value, 'Date of birth');
          element.setAttribute('legend', text);
          (element as USWDSElement).legend = text;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).legend || element.getAttribute('legend') || 'Date of birth';
        },
      },
    },

    hint: {
      definition: {
        name: 'hint',
        label: 'Hint Text',
        type: 'text',
        default: 'For example: January 19 2000',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value);
          element.setAttribute('hint', text);
          (element as USWDSElement).hint = text;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).hint || element.getAttribute('hint') || '';
        },
      },
    },
  },
});

}
