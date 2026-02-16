/**
 * Layout Components
 *
 * Registers layout/structure components:
 * usa-accordion, usa-step-indicator, usa-process-list, usa-prose, usa-identifier
 */

import type { ComponentRegistration, UnifiedTrait, TraitValue } from './shared-utils.js';
import {
  coerceBoolean,
  hasAttributeTrue,
  triggerUpdate,
  traitStr,
} from './shared-utils.js';
import type { RegistryLike } from './shared-utils.js';
import type { GrapesComponentModel } from '../types.js';
import type { USWDSElement } from '@uswds-pt/shared';

export function registerLayoutComponents(registry: RegistryLike): void {

/**
 * Helper function to rebuild accordion items from individual traits
 */
function rebuildAccordionItems(element: HTMLElement, count: number): void {
  const items: Array<{ title: string; content: string; expanded?: boolean }> = [];
  for (let i = 1; i <= count; i++) {
    const title = element.getAttribute(`section${i}-title`) || `Section ${i}`;
    const content = element.getAttribute(`section${i}-content`) || `Content for section ${i}`;
    const expanded = hasAttributeTrue(element, `section${i}-expanded`);
    items.push({ title, content, expanded });
  }
  (element as USWDSElement).items = items;
  triggerUpdate(element);
}

/**
 * Helper to create an accordion section trait (title, content, or expanded)
 */
function createAccordionSectionTrait(
  sectionNum: number,
  traitType: 'title' | 'content' | 'expanded',
  _maxSections: number = 8
): UnifiedTrait {
  const attrName = `section${sectionNum}-${traitType}`;

  // Visibility function - only show if sectionNum <= section-count
  const visibleFn = (component: GrapesComponentModel) => {
    const count = parseInt((component.getAttributes?.() ?? {})['section-count'] || '3', 10);
    return sectionNum <= count;
  };

  if (traitType === 'expanded') {
    return {
      definition: {
        name: attrName,
        label: `Section ${sectionNum} Expanded`,
        type: 'checkbox',
        default: sectionNum === 1, // First section expanded by default
        visible: visibleFn,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isExpanded = coerceBoolean(value);
          element.setAttribute(attrName, String(isExpanded));
          const count = parseInt(element.getAttribute('section-count') || '3', 10);
          if (sectionNum <= count) {
            rebuildAccordionItems(element, count);
          }
        },
        getValue: (element: HTMLElement) => {
          const attrValue = element.getAttribute(attrName);
          if (attrValue !== null) {
            return attrValue === 'true';
          }
          return sectionNum === 1; // Default: first section expanded
        },
      },
    };
  }

  const label = traitType === 'title' ? `Section ${sectionNum} Title` : `Section ${sectionNum} Content`;
  const defaultValue = traitType === 'title' ? `Section ${sectionNum}` : `Content for section ${sectionNum}`;

  return {
    definition: {
      name: attrName,
      label,
      type: 'text',
      default: defaultValue,
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: TraitValue) => {
        element.setAttribute(attrName, traitStr(value));
        const count = parseInt(element.getAttribute('section-count') || '3', 10);
        if (sectionNum <= count) {
          rebuildAccordionItems(element, count);
        }
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) ?? defaultValue;
      },
    },
  };
}

/**
 * USA Accordion Component
 *
 * Expandable/collapsible content sections.
 */
registry.register({
  tagName: 'usa-accordion',
  droppable: false,

  traits: {
    // Number of sections
    'section-count': {
      definition: {
        name: 'section-count',
        label: 'Number of Sections',
        type: 'select',
        default: '3',
        options: [
          { id: '1', label: '1 Section' },
          { id: '2', label: '2 Sections' },
          { id: '3', label: '3 Sections' },
          { id: '4', label: '4 Sections' },
          { id: '5', label: '5 Sections' },
          { id: '6', label: '6 Sections' },
          { id: '7', label: '7 Sections' },
          { id: '8', label: '8 Sections' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const count = parseInt(traitStr(value, '3'), 10);
          element.setAttribute('section-count', String(count));
          rebuildAccordionItems(element, count);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('section-count') ?? '3';
        },
        onInit: (element: HTMLElement, value: TraitValue) => {
          setTimeout(() => {
            const count = parseInt(traitStr(value, '3'), 10);
            rebuildAccordionItems(element, count);
          }, 100);
        },
      },
    },

    // Multiselectable
    multiselectable: {
      definition: {
        name: 'multiselectable',
        label: 'Allow Multiple Open',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isMulti = coerceBoolean(value);
          if (isMulti) {
            element.setAttribute('multiselectable', '');
          } else {
            element.removeAttribute('multiselectable');
          }
          (element as USWDSElement).multiselectable = isMulti;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).multiselectable || element.hasAttribute('multiselectable');
        },
      },
    },

    // Bordered
    bordered: {
      definition: {
        name: 'bordered',
        label: 'Bordered Style',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isBordered = coerceBoolean(value);
          if (isBordered) {
            element.setAttribute('bordered', '');
          } else {
            element.removeAttribute('bordered');
          }
          (element as USWDSElement).bordered = isBordered;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).bordered || element.hasAttribute('bordered');
        },
      },
    },

    // Section traits
    'section1-title': createAccordionSectionTrait(1, 'title'),
    'section1-content': createAccordionSectionTrait(1, 'content'),
    'section1-expanded': createAccordionSectionTrait(1, 'expanded'),
    'section2-title': createAccordionSectionTrait(2, 'title'),
    'section2-content': createAccordionSectionTrait(2, 'content'),
    'section2-expanded': createAccordionSectionTrait(2, 'expanded'),
    'section3-title': createAccordionSectionTrait(3, 'title'),
    'section3-content': createAccordionSectionTrait(3, 'content'),
    'section3-expanded': createAccordionSectionTrait(3, 'expanded'),
    'section4-title': createAccordionSectionTrait(4, 'title'),
    'section4-content': createAccordionSectionTrait(4, 'content'),
    'section4-expanded': createAccordionSectionTrait(4, 'expanded'),
    'section5-title': createAccordionSectionTrait(5, 'title'),
    'section5-content': createAccordionSectionTrait(5, 'content'),
    'section5-expanded': createAccordionSectionTrait(5, 'expanded'),
    'section6-title': createAccordionSectionTrait(6, 'title'),
    'section6-content': createAccordionSectionTrait(6, 'content'),
    'section6-expanded': createAccordionSectionTrait(6, 'expanded'),
  },
});

/**
 * Helper function to rebuild step indicator steps from individual traits
 */
function rebuildStepIndicatorSteps(element: HTMLElement, count: number): void {
  const steps: Array<{ label: string; status?: 'complete' | 'current' | 'incomplete' }> = [];
  for (let i = 1; i <= count; i++) {
    const label = element.getAttribute(`step${i}-label`) || `Step ${i}`;
    const status = element.getAttribute(`step${i}-status`) as 'complete' | 'current' | 'incomplete' || 'incomplete';
    steps.push({ label, status });
  }
  (element as USWDSElement).steps = steps;
  triggerUpdate(element);
}

/**
 * Helper to create a step indicator step trait
 */
function createStepTrait(
  stepNum: number,
  traitType: 'label' | 'status'
): UnifiedTrait {
  const attrName = `step${stepNum}-${traitType}`;

  // Visibility function - only show if stepNum <= step-count
  const visibleFn = (component: GrapesComponentModel) => {
    const count = parseInt((component.getAttributes?.() ?? {})['step-count'] || '4', 10);
    return stepNum <= count;
  };

  if (traitType === 'status') {
    const defaultStatus = stepNum === 1 ? 'current' : 'incomplete';
    return {
      definition: {
        name: attrName,
        label: `Step ${stepNum} Status`,
        type: 'select',
        default: defaultStatus,
        options: [
          { id: 'incomplete', label: 'Incomplete' },
          { id: 'current', label: 'Current' },
          { id: 'complete', label: 'Complete' },
        ],
        visible: visibleFn,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          element.setAttribute(attrName, traitStr(value, 'incomplete'));
          const count = parseInt(element.getAttribute('step-count') || '4', 10);
          if (stepNum <= count) {
            rebuildStepIndicatorSteps(element, count);
          }
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute(attrName) ?? defaultStatus;
        },
      },
    };
  }

  const defaultLabel = `Step ${stepNum}`;
  return {
    definition: {
      name: attrName,
      label: `Step ${stepNum} Label`,
      type: 'text',
      default: defaultLabel,
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: TraitValue) => {
        element.setAttribute(attrName, traitStr(value));
        const count = parseInt(element.getAttribute('step-count') || '4', 10);
        if (stepNum <= count) {
          rebuildStepIndicatorSteps(element, count);
        }
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) ?? defaultLabel;
      },
    },
  };
}

/**
 * USA Step Indicator Component
 *
 * Shows progress through a multi-step process.
 */
registry.register({
  tagName: 'usa-step-indicator',
  droppable: false,

  traits: {
    // Number of steps
    'step-count': {
      definition: {
        name: 'step-count',
        label: 'Number of Steps',
        type: 'select',
        default: '4',
        options: [
          { id: '2', label: '2 Steps' },
          { id: '3', label: '3 Steps' },
          { id: '4', label: '4 Steps' },
          { id: '5', label: '5 Steps' },
          { id: '6', label: '6 Steps' },
          { id: '7', label: '7 Steps' },
          { id: '8', label: '8 Steps' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const count = parseInt(traitStr(value, '4'), 10);
          element.setAttribute('step-count', String(count));
          rebuildStepIndicatorSteps(element, count);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('step-count') ?? '4';
        },
        onInit: (element: HTMLElement, value: TraitValue) => {
          setTimeout(() => {
            const count = parseInt(traitStr(value, '4'), 10);
            rebuildStepIndicatorSteps(element, count);
          }, 100);
        },
      },
    },

    // Show labels
    'show-labels': {
      definition: {
        name: 'show-labels',
        label: 'Show Labels',
        type: 'checkbox',
        default: true,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const showLabels = coerceBoolean(value);
          if (showLabels) {
            element.setAttribute('show-labels', '');
          } else {
            element.removeAttribute('show-labels');
          }
          (element as USWDSElement).showLabels = showLabels;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).showLabels || element.hasAttribute('show-labels');
        },
      },
    },

    // Counters style
    counters: {
      definition: {
        name: 'counters',
        label: 'Counter Style',
        type: 'select',
        default: 'none',
        options: [
          { id: 'none', label: 'None' },
          { id: 'default', label: 'Numbers' },
          { id: 'sm', label: 'Small Numbers' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          if (value && value !== 'none') {
            element.setAttribute('counters', traitStr(value));
            (element as USWDSElement).counters = traitStr(value);
          } else {
            element.removeAttribute('counters');
            (element as USWDSElement).counters = '';
          }
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          const val = (element as USWDSElement).counters || element.getAttribute('counters') || '';
          return val || 'none';
        },
      },
    },

    // Centered
    centered: {
      definition: {
        name: 'centered',
        label: 'Center Align',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isCentered = coerceBoolean(value);
          if (isCentered) {
            element.setAttribute('centered', '');
          } else {
            element.removeAttribute('centered');
          }
          (element as USWDSElement).centered = isCentered;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).centered || element.hasAttribute('centered');
        },
      },
    },

    // Small variant
    small: {
      definition: {
        name: 'small',
        label: 'Small Size',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isSmall = coerceBoolean(value);
          if (isSmall) {
            element.setAttribute('small', '');
          } else {
            element.removeAttribute('small');
          }
          (element as USWDSElement).small = isSmall;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).small || element.hasAttribute('small');
        },
      },
    },

    // Step traits
    'step1-label': createStepTrait(1, 'label'),
    'step1-status': createStepTrait(1, 'status'),
    'step2-label': createStepTrait(2, 'label'),
    'step2-status': createStepTrait(2, 'status'),
    'step3-label': createStepTrait(3, 'label'),
    'step3-status': createStepTrait(3, 'status'),
    'step4-label': createStepTrait(4, 'label'),
    'step4-status': createStepTrait(4, 'status'),
    'step5-label': createStepTrait(5, 'label'),
    'step5-status': createStepTrait(5, 'status'),
    'step6-label': createStepTrait(6, 'label'),
    'step6-status': createStepTrait(6, 'status'),
  },
});

/**
 * Helper function to rebuild process list items from individual traits
 */
function rebuildProcessListItems(element: HTMLElement, count: number): void {
  const items: Array<{ heading: string; content: string }> = [];
  for (let i = 1; i <= count; i++) {
    const heading = element.getAttribute(`item${i}-heading`) || `Step ${i}`;
    const content = element.getAttribute(`item${i}-content`) || `Description for step ${i}`;
    items.push({ heading, content });
  }
  (element as USWDSElement).items = items;
  triggerUpdate(element);
}

/**
 * Helper to create a process list item trait
 */
function createProcessListItemTrait(
  itemNum: number,
  traitType: 'heading' | 'content'
): UnifiedTrait {
  const attrName = `item${itemNum}-${traitType}`;
  const label = traitType === 'heading' ? `Step ${itemNum} Heading` : `Step ${itemNum} Content`;
  const defaultValue = traitType === 'heading' ? `Step ${itemNum}` : `Description for step ${itemNum}`;

  // Visibility function - only show if itemNum <= item-count
  const visibleFn = (component: GrapesComponentModel) => {
    try {
      if (!component) return true;
      const count = parseInt((component.getAttributes?.() ?? {})['item-count'] || '3', 10);
      return itemNum <= count;
    } catch {
      return true;
    }
  };

  return {
    definition: {
      name: attrName,
      label,
      type: 'text',
      default: defaultValue,
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: TraitValue) => {
        element.setAttribute(attrName, traitStr(value));
        const count = parseInt(element.getAttribute('item-count') || '3', 10);
        if (itemNum <= count) {
          rebuildProcessListItems(element, count);
        }
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) ?? defaultValue;
      },
    },
  };
}

/**
 * USA Process List Component
 *
 * Displays a numbered list of steps in a process.
 */
registry.register({
  tagName: 'usa-process-list',
  droppable: false,

  traits: {
    // Number of items
    'item-count': {
      definition: {
        name: 'item-count',
        label: 'Number of Steps',
        type: 'select',
        default: '3',
        options: [
          { id: '1', label: '1 Step' },
          { id: '2', label: '2 Steps' },
          { id: '3', label: '3 Steps' },
          { id: '4', label: '4 Steps' },
          { id: '5', label: '5 Steps' },
          { id: '6', label: '6 Steps' },
          { id: '7', label: '7 Steps' },
          { id: '8', label: '8 Steps' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const count = parseInt(traitStr(value, '3'), 10);
          element.setAttribute('item-count', String(count));
          rebuildProcessListItems(element, count);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('item-count') ?? '3';
        },
        onInit: (element: HTMLElement, value: TraitValue) => {
          setTimeout(() => {
            const count = parseInt(traitStr(value, '3'), 10);
            rebuildProcessListItems(element, count);
          }, 100);
        },
      },
    },

    // Heading level
    'heading-level': {
      definition: {
        name: 'heading-level',
        label: 'Heading Level',
        type: 'select',
        default: 'h4',
        options: [
          { id: 'h2', label: 'H2' },
          { id: 'h3', label: 'H3' },
          { id: 'h4', label: 'H4' },
          { id: 'h5', label: 'H5' },
          { id: 'h6', label: 'H6' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const level = traitStr(value, 'h4');
          element.setAttribute('heading-level', level);
          (element as USWDSElement).headingLevel = level;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).headingLevel || element.getAttribute('heading-level') || 'h4';
        },
      },
    },

    // Item traits
    'item1-heading': createProcessListItemTrait(1, 'heading'),
    'item1-content': createProcessListItemTrait(1, 'content'),
    'item2-heading': createProcessListItemTrait(2, 'heading'),
    'item2-content': createProcessListItemTrait(2, 'content'),
    'item3-heading': createProcessListItemTrait(3, 'heading'),
    'item3-content': createProcessListItemTrait(3, 'content'),
    'item4-heading': createProcessListItemTrait(4, 'heading'),
    'item4-content': createProcessListItemTrait(4, 'content'),
    'item5-heading': createProcessListItemTrait(5, 'heading'),
    'item5-content': createProcessListItemTrait(5, 'content'),
    'item6-heading': createProcessListItemTrait(6, 'heading'),
    'item6-content': createProcessListItemTrait(6, 'content'),
  },
});

/**
 * USA Prose Component
 *
 * Typography wrapper for long-form content.
 */
registry.register({
  tagName: 'usa-prose',
  droppable: true, // Allow dropping content inside

  traits: {
    // Content (for slotted content)
    content: {
      definition: {
        name: 'content',
        label: 'Content',
        type: 'text',
        default: 'Enter your prose content here...',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const content = traitStr(value);
          // For prose, we update the innerHTML/textContent
          element.textContent = content;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return element.textContent || '';
        },
      },
    },
  },
});

/**
 * USA Identifier Component
 *
 * Agency identifier footer that displays parent agency info and required federal links.
 * Used at the bottom of government websites.
 */
registry.register({
  tagName: 'usa-identifier',
  droppable: false,

  traits: {
    // Domain name
    domain: {
      definition: {
        name: 'domain',
        label: 'Domain Name',
        type: 'text',
        default: 'domain.gov',
        placeholder: 'example.gov',
        category: { id: 'identity', label: 'Identity' },
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const domain = traitStr(value, 'domain.gov');
          element.setAttribute('domain', domain);
          (element as USWDSElement).domain = domain;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).domain || element.getAttribute('domain') || 'domain.gov';
        },
      },
    },

    // Parent Agency name
    'parent-agency': {
      definition: {
        name: 'parent-agency',
        label: 'Parent Agency',
        type: 'text',
        default: 'Parent Agency',
        placeholder: 'e.g., Department of Example',
        category: { id: 'identity', label: 'Identity' },
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const agency = traitStr(value, 'Parent Agency');
          element.setAttribute('parent-agency', agency);
          (element as USWDSElement).parentAgency = agency;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).parentAgency || element.getAttribute('parent-agency') || 'Parent Agency';
        },
      },
    },

    // Parent Agency URL
    'parent-agency-href': {
      definition: {
        name: 'parent-agency-href',
        label: 'Parent Agency URL',
        type: 'text',
        default: '#',
        placeholder: 'https://agency.gov',
        category: { id: 'identity', label: 'Identity' },
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const href = traitStr(value, '#');
          element.setAttribute('parent-agency-href', href);
          (element as USWDSElement).parentAgencyHref = href;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).parentAgencyHref || element.getAttribute('parent-agency-href') || '#';
        },
      },
    },

    // Masthead Logo Alt Text
    'masthead-logo-alt': {
      definition: {
        name: 'masthead-logo-alt',
        label: 'Logo Alt Text',
        type: 'text',
        default: '',
        placeholder: 'Agency logo',
        category: { id: 'identity', label: 'Identity' },
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const alt = traitStr(value);
          if (alt) {
            element.setAttribute('masthead-logo-alt', alt);
          } else {
            element.removeAttribute('masthead-logo-alt');
          }
          (element as USWDSElement).mastheadLogoAlt = alt;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).mastheadLogoAlt || element.getAttribute('masthead-logo-alt') || '';
        },
      },
    },

    // Show Required Links toggle
    'show-required-links': {
      definition: {
        name: 'show-required-links',
        label: 'Show Required Links',
        type: 'checkbox',
        default: true,
        category: { id: 'display', label: 'Display' },
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const show = value === true || value === 'true';
          if (show) {
            element.setAttribute('show-required-links', '');
          } else {
            element.removeAttribute('show-required-links');
          }
          (element as USWDSElement).showRequiredLinks = show;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).showRequiredLinks !== false;
        },
      },
    },

    // Show Logos toggle
    'show-logos': {
      definition: {
        name: 'show-logos',
        label: 'Show Logos',
        type: 'checkbox',
        default: true,
        category: { id: 'display', label: 'Display' },
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const show = value === true || value === 'true';
          if (show) {
            element.setAttribute('show-logos', '');
          } else {
            element.removeAttribute('show-logos');
          }
          (element as USWDSElement).showLogos = show;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).showLogos !== false;
        },
      },
    },
  },
});

// ============================================================================
}
