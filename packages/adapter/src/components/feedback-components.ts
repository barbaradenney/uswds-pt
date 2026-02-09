/**
 * Feedback Components
 *
 * Registers feedback/notification components:
 * usa-alert, usa-banner, usa-site-alert, usa-modal, usa-tooltip
 */

import type { ComponentRegistration } from './shared-utils.js';
import {
  coerceBoolean,
} from './shared-utils.js';

/**
 * Registry interface to avoid circular imports.
 */
interface RegistryLike {
  register(registration: ComponentRegistration): void;
}

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
        onChange: (element: HTMLElement, value: any) => {
          const variant = value || 'info';
          element.setAttribute('variant', variant);
          (element as any).variant = variant;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).variant || element.getAttribute('variant') || 'info';
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
        onChange: (element: HTMLElement, value: any) => {
          const text = value || '';
          element.setAttribute('heading', text);
          (element as any).heading = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).heading || element.getAttribute('heading') || '';
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
        onChange: (element: HTMLElement, value: any) => {
          const text = value || '';
          element.setAttribute('text', text);
          (element as any).text = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).text || element.getAttribute('text') || '';
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
        onChange: (element: HTMLElement, value: any) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('slim', '');
          } else {
            element.removeAttribute('slim');
          }
          (element as any).slim = isEnabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).slim || element.hasAttribute('slim');
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
        onChange: (element: HTMLElement, value: any) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('no-icon', '');
          } else {
            element.removeAttribute('no-icon');
          }
          (element as any).noIcon = isEnabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).noIcon || element.hasAttribute('no-icon');
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
        onChange: (element: HTMLElement, value: any) => {
          const text = value || 'An official website of the United States government';
          element.setAttribute('header-text', text);
          (element as any).headerText = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).headerText || element.getAttribute('header-text') || 'An official website of the United States government';
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
        onChange: (element: HTMLElement, value: any) => {
          const text = value || "Here's how you know";
          element.setAttribute('action-text', text);
          (element as any).actionText = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).actionText || element.getAttribute('action-text') || "Here's how you know";
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
        onChange: (element: HTMLElement, value: any) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('expanded', '');
          } else {
            element.removeAttribute('expanded');
          }
          (element as any).expanded = isEnabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).expanded || element.hasAttribute('expanded');
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
        onChange: (element: HTMLElement, value: any) => {
          const type = value || 'info';
          element.setAttribute('type', type);
          (element as any).type = type;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).type || element.getAttribute('type') || 'info';
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
        onChange: (element: HTMLElement, value: any) => {
          const text = value || '';
          element.setAttribute('heading', text);
          (element as any).heading = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).heading || element.getAttribute('heading') || '';
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
        onChange: (element: HTMLElement, value: any) => {
          const text = value || '';
          element.setAttribute('content', text);
          (element as any).content = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).content || element.getAttribute('content') || '';
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
        onChange: (element: HTMLElement, value: any) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('slim', '');
          } else {
            element.removeAttribute('slim');
          }
          (element as any).slim = isEnabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).slim || element.hasAttribute('slim');
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
        onChange: (element: HTMLElement, value: any) => {
          const id = value || 'my-modal';
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
        onChange: (element: HTMLElement, value: any) => {
          const text = value || '';
          element.setAttribute('heading', text);
          (element as any).heading = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).heading || element.getAttribute('heading') || '';
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
        onChange: (element: HTMLElement, value: any) => {
          const text = value || '';
          element.setAttribute('description', text);
          (element as any).description = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).description || element.getAttribute('description') || '';
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
        onChange: (element: HTMLElement, value: any) => {
          const type = value || 'button';
          element.setAttribute('trigger-type', type);
          (element as any).triggerType = type;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).triggerType || element.getAttribute('trigger-type') || 'button';
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
        onChange: (element: HTMLElement, value: any) => {
          const text = value || 'Open Modal';
          element.setAttribute('trigger-text', text);
          (element as any).triggerText = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).triggerText || element.getAttribute('trigger-text') || 'Open Modal';
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
        onChange: (element: HTMLElement, value: any) => {
          const icon = value || 'info';
          element.setAttribute('trigger-icon', icon);
          (element as any).triggerIcon = icon;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).triggerIcon || element.getAttribute('trigger-icon') || 'info';
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
        onChange: (element: HTMLElement, value: any) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('show-trigger', '');
          } else {
            element.removeAttribute('show-trigger');
          }
          (element as any).showTrigger = isEnabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).showTrigger !== false;
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
        onChange: (element: HTMLElement, value: any) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('large', '');
          } else {
            element.removeAttribute('large');
          }
          (element as any).large = isEnabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).large || element.hasAttribute('large');
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
        onChange: (element: HTMLElement, value: any) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('force-action', '');
          } else {
            element.removeAttribute('force-action');
          }
          (element as any).forceAction = isEnabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).forceAction || element.hasAttribute('force-action');
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
        onChange: (element: HTMLElement, value: any) => {
          const text = value || 'Continue';
          element.setAttribute('primary-button-text', text);
          (element as any).primaryButtonText = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).primaryButtonText || 'Continue';
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
        onChange: (element: HTMLElement, value: any) => {
          const text = value || 'Cancel';
          element.setAttribute('secondary-button-text', text);
          (element as any).secondaryButtonText = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).secondaryButtonText || 'Cancel';
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
        onChange: (element: HTMLElement, value: any) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('show-secondary-button', '');
          } else {
            element.removeAttribute('show-secondary-button');
          }
          (element as any).showSecondaryButton = isEnabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).showSecondaryButton !== false;
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
        onChange: (element: HTMLElement, value: any) => {
          const text = value || '';
          element.setAttribute('text', text);
          (element as any).text = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).text || element.getAttribute('text') || '';
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
        onChange: (element: HTMLElement, value: any) => {
          const type = value || 'text';
          element.setAttribute('trigger-type', type);
          (element as any).triggerType = type;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).triggerType || element.getAttribute('trigger-type') || 'text';
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
        onChange: (element: HTMLElement, value: any) => {
          const text = value || 'Hover me';
          element.setAttribute('label', text);
          (element as any).label = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).label || element.getAttribute('label') || 'Hover me';
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
        onChange: (element: HTMLElement, value: any) => {
          const icon = value || 'info';
          element.setAttribute('trigger-icon', icon);
          (element as any).triggerIcon = icon;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).triggerIcon || element.getAttribute('trigger-icon') || 'info';
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
        onChange: (element: HTMLElement, value: any) => {
          const position = value || 'top';
          element.setAttribute('position', position);
          (element as any).position = position;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).position || element.getAttribute('position') || 'top';
        },
      },
    },
  },
});
}
