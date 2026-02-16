/**
 * Feedback Components
 *
 * Registers feedback/notification components:
 * usa-alert, usa-banner, usa-site-alert, usa-modal, usa-tooltip
 */

import type { ComponentRegistration, TraitValue } from './shared-utils.js';
import {
  coerceBoolean,
  triggerUpdate,
  traitStr,
} from './shared-utils.js';
import type { RegistryLike } from './shared-utils.js';
import type { USWDSElement } from '@uswds-pt/shared';

export function registerFeedbackComponents(registry: RegistryLike): void {

/**
 * USA Alert Component
 *
 * Displays important messages to the user with different severity levels.
 */
registry.register({
  tagName: 'usa-alert',
  droppable: false,

  traits: {
    // Variant/type
    variant: {
      definition: {
        name: 'variant',
        label: 'Type',
        type: 'select',
        default: 'info',
        options: [
          { id: 'info', label: 'Info' },
          { id: 'success', label: 'Success' },
          { id: 'warning', label: 'Warning' },
          { id: 'error', label: 'Error' },
          { id: 'emergency', label: 'Emergency' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const variant = traitStr(value, 'info');
          element.setAttribute('variant', variant);
          (element as USWDSElement).variant = variant;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).variant || element.getAttribute('variant') || 'info';
        },
      },
    },

    // Heading
    heading: {
      definition: {
        name: 'heading',
        label: 'Heading',
        type: 'text',
        default: 'Alert heading',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value);
          element.setAttribute('heading', text);
          (element as USWDSElement).heading = text;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).heading || element.getAttribute('heading') || '';
        },
      },
    },

    // Text content
    text: {
      definition: {
        name: 'text',
        label: 'Message',
        type: 'textarea',
        default: 'This is an alert message.',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value);
          element.setAttribute('text', text);
          (element as USWDSElement).text = text;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).text || element.getAttribute('text') || '';
        },
      },
    },

    // Slim variant
    slim: {
      definition: {
        name: 'slim',
        label: 'Slim Style',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('slim', '');
          } else {
            element.removeAttribute('slim');
          }
          (element as USWDSElement).slim = isEnabled;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).slim || element.hasAttribute('slim');
        },
      },
    },

    // No icon
    'no-icon': {
      definition: {
        name: 'no-icon',
        label: 'Hide Icon',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('no-icon', '');
          } else {
            element.removeAttribute('no-icon');
          }
          (element as USWDSElement).noIcon = isEnabled;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).noIcon || element.hasAttribute('no-icon');
        },
      },
    },
  },
});

/**
 * USA Banner Component
 *
 * Official government website banner - required on all .gov websites.
 */
registry.register({
  tagName: 'usa-banner',
  droppable: false,

  traits: {
    // Header text
    'header-text': {
      definition: {
        name: 'header-text',
        label: 'Header Text',
        type: 'text',
        default: 'An official website of the United States government',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value, 'An official website of the United States government');
          element.setAttribute('header-text', text);
          (element as USWDSElement).headerText = text;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).headerText || element.getAttribute('header-text') || 'An official website of the United States government';
        },
      },
    },

    // Action text
    'action-text': {
      definition: {
        name: 'action-text',
        label: 'Action Text',
        type: 'text',
        default: "Here's how you know",
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value, "Here's how you know");
          element.setAttribute('action-text', text);
          (element as USWDSElement).actionText = text;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).actionText || element.getAttribute('action-text') || "Here's how you know";
        },
      },
    },

    // Expanded
    expanded: {
      definition: {
        name: 'expanded',
        label: 'Expanded',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('expanded', '');
          } else {
            element.removeAttribute('expanded');
          }
          (element as USWDSElement).expanded = isEnabled;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).expanded || element.hasAttribute('expanded');
        },
      },
    },
  },
});

/**
 * USA Site Alert Component
 *
 * Site-wide alert for important announcements.
 */
registry.register({
  tagName: 'usa-site-alert',
  droppable: false,

  traits: {
    // Type/variant
    type: {
      definition: {
        name: 'type',
        label: 'Type',
        type: 'select',
        default: 'info',
        options: [
          { id: 'info', label: 'Info' },
          { id: 'emergency', label: 'Emergency' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const type = traitStr(value, 'info');
          element.setAttribute('type', type);
          (element as USWDSElement).type = type;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).type || element.getAttribute('type') || 'info';
        },
      },
    },

    // Heading
    heading: {
      definition: {
        name: 'heading',
        label: 'Heading',
        type: 'text',
        default: 'Site Alert',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value);
          element.setAttribute('heading', text);
          (element as USWDSElement).heading = text;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).heading || element.getAttribute('heading') || '';
        },
      },
    },

    // Content
    content: {
      definition: {
        name: 'content',
        label: 'Content',
        type: 'textarea',
        default: 'This is a site-wide alert message.',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value);
          element.setAttribute('content', text);
          (element as USWDSElement).content = text;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).content || element.getAttribute('content') || '';
        },
      },
    },

    // Slim
    slim: {
      definition: {
        name: 'slim',
        label: 'Slim Style',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('slim', '');
          } else {
            element.removeAttribute('slim');
          }
          (element as USWDSElement).slim = isEnabled;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).slim || element.hasAttribute('slim');
        },
      },
    },
  },
});

/**
 * USA Modal Component
 *
 * Dialog/modal window for focused user interactions.
 */
registry.register({
  tagName: 'usa-modal',
  droppable: false,

  traits: {
    // Modal ID (for linking with buttons)
    id: {
      definition: {
        name: 'id',
        label: 'Modal ID',
        type: 'text',
        default: 'my-modal',
        placeholder: 'Unique ID for the modal',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const id = traitStr(value, 'my-modal');
          element.id = id;
        },
        getValue: (element: HTMLElement) => {
          return element.id || 'my-modal';
        },
      },
    },

    // Heading
    heading: {
      definition: {
        name: 'heading',
        label: 'Heading',
        type: 'text',
        default: 'Modal Title',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value);
          element.setAttribute('heading', text);
          (element as USWDSElement).heading = text;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).heading || element.getAttribute('heading') || '';
        },
      },
    },

    // Description
    description: {
      definition: {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        default: 'Modal content goes here.',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value);
          element.setAttribute('description', text);
          (element as USWDSElement).description = text;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).description || element.getAttribute('description') || '';
        },
      },
    },

    // Trigger type (button, link, or icon)
    'trigger-type': {
      definition: {
        name: 'trigger-type',
        label: 'Trigger Type',
        type: 'select',
        default: 'button',
        options: [
          { id: 'button', label: 'Button' },
          { id: 'link', label: 'Link' },
          { id: 'icon', label: 'Icon' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const type = traitStr(value, 'button');
          element.setAttribute('trigger-type', type);
          (element as USWDSElement).triggerType = type;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).triggerType || element.getAttribute('trigger-type') || 'button';
        },
      },
    },

    // Trigger text
    'trigger-text': {
      definition: {
        name: 'trigger-text',
        label: 'Trigger Text',
        type: 'text',
        default: 'Open Modal',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value, 'Open Modal');
          element.setAttribute('trigger-text', text);
          (element as USWDSElement).triggerText = text;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).triggerText || element.getAttribute('trigger-text') || 'Open Modal';
        },
      },
    },

    // Trigger icon (for icon trigger type)
    'trigger-icon': {
      definition: {
        name: 'trigger-icon',
        label: 'Trigger Icon',
        type: 'select',
        default: 'info',
        options: [
          { id: 'info', label: 'Info' },
          { id: 'help', label: 'Help' },
          { id: 'settings', label: 'Settings' },
          { id: 'more_vert', label: 'More (Vertical)' },
          { id: 'more_horiz', label: 'More (Horizontal)' },
          { id: 'launch', label: 'Launch' },
          { id: 'open_in_new', label: 'Open in New' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const icon = traitStr(value, 'info');
          element.setAttribute('trigger-icon', icon);
          (element as USWDSElement).triggerIcon = icon;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).triggerIcon || element.getAttribute('trigger-icon') || 'info';
        },
      },
    },

    // Show trigger
    'show-trigger': {
      definition: {
        name: 'show-trigger',
        label: 'Show Trigger',
        type: 'checkbox',
        default: true,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('show-trigger', '');
          } else {
            element.removeAttribute('show-trigger');
          }
          (element as USWDSElement).showTrigger = isEnabled;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).showTrigger !== false;
        },
      },
    },

    // Large variant
    large: {
      definition: {
        name: 'large',
        label: 'Large Size',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('large', '');
          } else {
            element.removeAttribute('large');
          }
          (element as USWDSElement).large = isEnabled;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).large || element.hasAttribute('large');
        },
      },
    },

    // Force action
    'force-action': {
      definition: {
        name: 'force-action',
        label: 'Force Action',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('force-action', '');
          } else {
            element.removeAttribute('force-action');
          }
          (element as USWDSElement).forceAction = isEnabled;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).forceAction || element.hasAttribute('force-action');
        },
      },
    },

    // Primary button text
    'primary-button-text': {
      definition: {
        name: 'primary-button-text',
        label: 'Primary Button',
        type: 'text',
        default: 'Continue',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value, 'Continue');
          element.setAttribute('primary-button-text', text);
          (element as USWDSElement).primaryButtonText = text;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).primaryButtonText || 'Continue';
        },
      },
    },

    // Secondary button text
    'secondary-button-text': {
      definition: {
        name: 'secondary-button-text',
        label: 'Secondary Button',
        type: 'text',
        default: 'Cancel',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value, 'Cancel');
          element.setAttribute('secondary-button-text', text);
          (element as USWDSElement).secondaryButtonText = text;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).secondaryButtonText || 'Cancel';
        },
      },
    },

    // Show secondary button
    'show-secondary-button': {
      definition: {
        name: 'show-secondary-button',
        label: 'Show Secondary Button',
        type: 'checkbox',
        default: true,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('show-secondary-button', '');
          } else {
            element.removeAttribute('show-secondary-button');
          }
          (element as USWDSElement).showSecondaryButton = isEnabled;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).showSecondaryButton !== false;
        },
      },
    },
  },
});

/**
 * USA Tooltip Component
 *
 * Displays additional information on hover.
 */
registry.register({
  tagName: 'usa-tooltip',
  droppable: false,

  traits: {
    // Tooltip text
    text: {
      definition: {
        name: 'text',
        label: 'Tooltip Text',
        type: 'text',
        default: 'Helpful information',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value);
          element.setAttribute('text', text);
          (element as USWDSElement).text = text;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).text || element.getAttribute('text') || '';
        },
      },
    },

    // Trigger type
    'trigger-type': {
      definition: {
        name: 'trigger-type',
        label: 'Trigger Type',
        type: 'select',
        default: 'text',
        options: [
          { id: 'text', label: 'Text' },
          { id: 'button', label: 'Button' },
          { id: 'link', label: 'Link' },
          { id: 'icon', label: 'Icon' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const type = traitStr(value, 'text');
          element.setAttribute('trigger-type', type);
          (element as USWDSElement).triggerType = type;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).triggerType || element.getAttribute('trigger-type') || 'text';
        },
      },
    },

    // Label (trigger text)
    label: {
      definition: {
        name: 'label',
        label: 'Trigger Label',
        type: 'text',
        default: 'Hover me',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value, 'Hover me');
          element.setAttribute('label', text);
          (element as USWDSElement).label = text;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).label || element.getAttribute('label') || 'Hover me';
        },
      },
    },

    // Trigger icon (for icon trigger type)
    'trigger-icon': {
      definition: {
        name: 'trigger-icon',
        label: 'Trigger Icon',
        type: 'select',
        default: 'info',
        options: [
          { id: 'info', label: 'Info' },
          { id: 'help', label: 'Help' },
          { id: 'info_outline', label: 'Info Outline' },
          { id: 'help_outline', label: 'Help Outline' },
          { id: 'error', label: 'Error' },
          { id: 'warning', label: 'Warning' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const icon = traitStr(value, 'info');
          element.setAttribute('trigger-icon', icon);
          (element as USWDSElement).triggerIcon = icon;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).triggerIcon || element.getAttribute('trigger-icon') || 'info';
        },
      },
    },

    // Position
    position: {
      definition: {
        name: 'position',
        label: 'Position',
        type: 'select',
        default: 'top',
        options: [
          { id: 'top', label: 'Top' },
          { id: 'bottom', label: 'Bottom' },
          { id: 'left', label: 'Left' },
          { id: 'right', label: 'Right' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const position = traitStr(value, 'top');
          element.setAttribute('position', position);
          (element as USWDSElement).position = position;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).position || element.getAttribute('position') || 'top';
        },
      },
    },
  },
});
}
