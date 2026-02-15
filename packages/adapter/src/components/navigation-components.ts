/**
 * Navigation Components (barrel)
 *
 * Re-exports and aggregates all navigation-related component registrations:
 * - Header components (usa-header)
 * - Footer components (usa-footer)
 * - Smaller navigation components (usa-in-page-navigation, usa-language-selector,
 *   usa-character-count, usa-memorable-date)
 */

import type { ComponentRegistration, TraitValue } from './shared-utils.js';
import { traitStr } from './shared-utils.js';
import type { GrapesComponentModel } from '../types.js';
import type { USWDSElement } from '@uswds-pt/shared';
import { registerHeaderComponents } from './header-components.js';
import { registerFooterComponents } from './footer-components.js';

/**
 * Registry interface to avoid circular imports.
 */
interface RegistryLike {
  register(registration: ComponentRegistration): void;
}

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
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
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
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
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
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
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
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('lang-count') || '3';
        },
      },
    },

    'lang1-label': {
      definition: { name: 'lang1-label', label: 'Language 1 Label', type: 'text', default: 'English' },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => { element.setAttribute('lang1-label', traitStr(value, 'English')); if (typeof (element as USWDSElement).requestUpdate === 'function') { (element as USWDSElement).requestUpdate?.(); } },
        getValue: (element: HTMLElement) => element.getAttribute('lang1-label') || 'English',
      },
    },
    'lang1-value': {
      definition: { name: 'lang1-value', label: 'Language 1 Value', type: 'text', default: 'en' },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => { element.setAttribute('lang1-value', traitStr(value, 'en')); if (typeof (element as USWDSElement).requestUpdate === 'function') { (element as USWDSElement).requestUpdate?.(); } },
        getValue: (element: HTMLElement) => element.getAttribute('lang1-value') || 'en',
      },
    },
    'lang2-label': {
      definition: { name: 'lang2-label', label: 'Language 2 Label', type: 'text', default: 'Español' },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => { element.setAttribute('lang2-label', traitStr(value, 'Español')); if (typeof (element as USWDSElement).requestUpdate === 'function') { (element as USWDSElement).requestUpdate?.(); } },
        getValue: (element: HTMLElement) => element.getAttribute('lang2-label') || 'Español',
      },
    },
    'lang2-value': {
      definition: { name: 'lang2-value', label: 'Language 2 Value', type: 'text', default: 'es' },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => { element.setAttribute('lang2-value', traitStr(value, 'es')); if (typeof (element as USWDSElement).requestUpdate === 'function') { (element as USWDSElement).requestUpdate?.(); } },
        getValue: (element: HTMLElement) => element.getAttribute('lang2-value') || 'es',
      },
    },
    'lang3-label': {
      definition: { name: 'lang3-label', label: 'Language 3 Label', type: 'text', default: 'Français' },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => { element.setAttribute('lang3-label', traitStr(value, 'Français')); if (typeof (element as USWDSElement).requestUpdate === 'function') { (element as USWDSElement).requestUpdate?.(); } },
        getValue: (element: HTMLElement) => element.getAttribute('lang3-label') || 'Français',
      },
    },
    'lang3-value': {
      definition: { name: 'lang3-value', label: 'Language 3 Value', type: 'text', default: 'fr' },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => { element.setAttribute('lang3-value', traitStr(value, 'fr')); if (typeof (element as USWDSElement).requestUpdate === 'function') { (element as USWDSElement).requestUpdate?.(); } },
        getValue: (element: HTMLElement) => element.getAttribute('lang3-value') || 'fr',
      },
    },

    'lang4-label': {
      definition: {
        name: 'lang4-label', label: 'Language 4 Label', type: 'text', default: '中文',
        visible: (component: GrapesComponentModel) => {
          try { return parseInt((component?.getAttributes?.() ?? {})['lang-count'] || '3', 10) >= 4; } catch { return false; }
        },
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => { element.setAttribute('lang4-label', traitStr(value, '中文')); if (typeof (element as USWDSElement).requestUpdate === 'function') { (element as USWDSElement).requestUpdate?.(); } },
        getValue: (element: HTMLElement) => element.getAttribute('lang4-label') || '中文',
      },
    },
    'lang4-value': {
      definition: {
        name: 'lang4-value', label: 'Language 4 Value', type: 'text', default: 'zh',
        visible: (component: GrapesComponentModel) => {
          try { return parseInt((component?.getAttributes?.() ?? {})['lang-count'] || '3', 10) >= 4; } catch { return false; }
        },
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => { element.setAttribute('lang4-value', traitStr(value, 'zh')); if (typeof (element as USWDSElement).requestUpdate === 'function') { (element as USWDSElement).requestUpdate?.(); } },
        getValue: (element: HTMLElement) => element.getAttribute('lang4-value') || 'zh',
      },
    },
    'lang5-label': {
      definition: {
        name: 'lang5-label', label: 'Language 5 Label', type: 'text', default: 'العربية',
        visible: (component: GrapesComponentModel) => {
          try { return parseInt((component?.getAttributes?.() ?? {})['lang-count'] || '3', 10) >= 5; } catch { return false; }
        },
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => { element.setAttribute('lang5-label', traitStr(value, 'العربية')); if (typeof (element as USWDSElement).requestUpdate === 'function') { (element as USWDSElement).requestUpdate?.(); } },
        getValue: (element: HTMLElement) => element.getAttribute('lang5-label') || 'العربية',
      },
    },
    'lang5-value': {
      definition: {
        name: 'lang5-value', label: 'Language 5 Value', type: 'text', default: 'ar',
        visible: (component: GrapesComponentModel) => {
          try { return parseInt((component?.getAttributes?.() ?? {})['lang-count'] || '3', 10) >= 5; } catch { return false; }
        },
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => { element.setAttribute('lang5-value', traitStr(value, 'ar')); if (typeof (element as USWDSElement).requestUpdate === 'function') { (element as USWDSElement).requestUpdate?.(); } },
        getValue: (element: HTMLElement) => element.getAttribute('lang5-value') || 'ar',
      },
    },
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
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
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
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
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
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
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
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
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
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).hint || element.getAttribute('hint') || '';
        },
      },
    },
  },
});

}
