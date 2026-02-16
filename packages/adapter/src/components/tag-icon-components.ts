/**
 * Tag, Icon & Summary Box Components
 *
 * Registers smaller data display components:
 * usa-tag, usa-icon, usa-summary-box.
 */

import type { ComponentRegistration, TraitValue } from './shared-utils.js';
import type { RegistryLike } from './shared-utils.js';
import {
  coerceBoolean,
  hasAttributeTrue,
  traitStr,
  triggerUpdate,
} from './shared-utils.js';
import type { USWDSElement } from '@uswds-pt/shared';

export function registerTagIconComponents(registry: RegistryLike): void {

/**
 * USA Tag Component
 *
 * A small label for categorizing or marking items.
 */
registry.register({
  tagName: 'usa-tag',
  droppable: false,

  traits: {
    // Text content
    text: {
      definition: {
        name: 'text',
        label: 'Tag Text',
        type: 'text',
        default: 'Tag',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value, 'Tag');
          element.setAttribute('text', text);
          (element as USWDSElement).text = text;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).text || element.getAttribute('text') || 'Tag';
        },
      },
    },

    // Big variant
    big: {
      definition: {
        name: 'big',
        label: 'Large Size',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('big', '');
          } else {
            element.removeAttribute('big');
          }
          (element as USWDSElement).big = isEnabled;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).big || element.hasAttribute('big');
        },
      },
    },
  },
});

/**
 * USA Icon Component
 *
 * USWDS icons for visual communication.
 * Supports all USWDS icons with configurable size and accessibility options.
 */
registry.register({
  tagName: 'usa-icon',
  droppable: false,

  traits: {
    // Icon name - the USWDS icon identifier
    name: {
      definition: {
        name: 'name',
        label: 'Icon',
        type: 'select',
        default: 'info',
        options: [
          // Status & Feedback
          { id: 'info', label: 'Info' },
          { id: 'check_circle', label: 'Check Circle' },
          { id: 'error', label: 'Error' },
          { id: 'warning', label: 'Warning' },
          { id: 'help', label: 'Help' },
          { id: 'cancel', label: 'Cancel' },
          // Navigation & Actions
          { id: 'arrow_forward', label: 'Arrow Forward' },
          { id: 'arrow_back', label: 'Arrow Back' },
          { id: 'arrow_upward', label: 'Arrow Upward' },
          { id: 'arrow_downward', label: 'Arrow Downward' },
          { id: 'expand_more', label: 'Expand More' },
          { id: 'expand_less', label: 'Expand Less' },
          { id: 'navigate_next', label: 'Navigate Next' },
          { id: 'navigate_before', label: 'Navigate Before' },
          { id: 'first_page', label: 'First Page' },
          { id: 'last_page', label: 'Last Page' },
          // Common UI
          { id: 'search', label: 'Search' },
          { id: 'close', label: 'Close' },
          { id: 'menu', label: 'Menu' },
          { id: 'settings', label: 'Settings' },
          { id: 'home', label: 'Home' },
          { id: 'lock', label: 'Lock' },
          { id: 'lock_open', label: 'Lock Open' },
          { id: 'visibility', label: 'Visibility' },
          { id: 'visibility_off', label: 'Visibility Off' },
          { id: 'edit', label: 'Edit' },
          { id: 'delete', label: 'Delete' },
          { id: 'add', label: 'Add' },
          { id: 'remove', label: 'Remove' },
          // Files & Documents
          { id: 'file_download', label: 'File Download' },
          { id: 'file_upload', label: 'File Upload' },
          { id: 'file_present', label: 'File Present' },
          { id: 'attach_file', label: 'Attach File' },
          { id: 'content_copy', label: 'Content Copy' },
          { id: 'print', label: 'Print' },
          // Communication
          { id: 'mail', label: 'Mail' },
          { id: 'phone', label: 'Phone' },
          { id: 'chat', label: 'Chat' },
          { id: 'notifications', label: 'Notifications' },
          { id: 'share', label: 'Share' },
          // People & Account
          { id: 'person', label: 'Person' },
          { id: 'people', label: 'People' },
          { id: 'account_circle', label: 'Account Circle' },
          { id: 'groups', label: 'Groups' },
          // Location & Maps
          { id: 'location_on', label: 'Location' },
          { id: 'directions', label: 'Directions' },
          { id: 'map', label: 'Map' },
          { id: 'near_me', label: 'Near Me' },
          // Time & Calendar
          { id: 'schedule', label: 'Schedule' },
          { id: 'event', label: 'Event' },
          { id: 'today', label: 'Today' },
          { id: 'access_time', label: 'Access Time' },
          // Data & Analytics
          { id: 'assessment', label: 'Assessment' },
          { id: 'trending_up', label: 'Trending Up' },
          { id: 'trending_down', label: 'Trending Down' },
          { id: 'bar_chart', label: 'Bar Chart' },
          // Government & Official
          { id: 'flag', label: 'Flag' },
          { id: 'account_balance', label: 'Account Balance' },
          { id: 'gavel', label: 'Gavel' },
          { id: 'verified', label: 'Verified' },
          { id: 'security', label: 'Security' },
          // Misc
          { id: 'favorite', label: 'Favorite' },
          { id: 'star', label: 'Star' },
          { id: 'thumb_up', label: 'Thumb Up' },
          { id: 'thumb_down', label: 'Thumb Down' },
          { id: 'link', label: 'Link' },
          { id: 'launch', label: 'Launch' },
          { id: 'logout', label: 'Logout' },
          { id: 'login', label: 'Login' },
        ],
        category: { id: 'icon', label: 'Icon' },
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const name = traitStr(value, 'info');
          element.setAttribute('name', name);
          (element as USWDSElement).name = name;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).name || element.getAttribute('name') || 'info';
        },
      },
    },

    // Size - USWDS icon size classes
    size: {
      definition: {
        name: 'size',
        label: 'Size',
        type: 'select',
        default: '',
        options: [
          { id: 'default', label: 'Default' },
          { id: '3', label: 'Size 3 (24px)' },
          { id: '4', label: 'Size 4 (32px)' },
          { id: '5', label: 'Size 5 (40px)' },
          { id: '6', label: 'Size 6 (48px)' },
          { id: '7', label: 'Size 7 (56px)' },
          { id: '8', label: 'Size 8 (64px)' },
          { id: '9', label: 'Size 9 (72px)' },
        ],
        category: { id: 'icon', label: 'Icon' },
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          if (value && value !== '') {
            element.setAttribute('size', traitStr(value));
          } else {
            element.removeAttribute('size');
          }
          (element as USWDSElement).size = traitStr(value);
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).size || element.getAttribute('size') || '';
        },
      },
    },

    // Aria Label - for accessible icons
    'aria-label': {
      definition: {
        name: 'aria-label',
        label: 'Accessible Label',
        type: 'text',
        default: '',
        placeholder: 'Describe the icon for screen readers',
        category: { id: 'accessibility', label: 'Accessibility' },
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const label = String(value ?? '').trim() || '';
          if (label) {
            element.setAttribute('aria-label', label);
          } else {
            element.removeAttribute('aria-label');
          }
          (element as USWDSElement).ariaLabel = label;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).ariaLabel || element.getAttribute('aria-label') || '';
        },
      },
    },

    // Decorative - mark icon as decorative (hidden from screen readers)
    decorative: {
      definition: {
        name: 'decorative',
        label: 'Decorative Only',
        type: 'checkbox',
        default: false,
        category: { id: 'accessibility', label: 'Accessibility' },
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isDecorative = value === true || value === 'true';
          if (isDecorative) {
            element.setAttribute('decorative', 'true');
          } else {
            element.removeAttribute('decorative');
          }
          (element as USWDSElement).decorative = isDecorative ? 'true' : '';
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return hasAttributeTrue(element, 'decorative');
        },
      },
    },
  },
});

/**
 * USA Summary Box Component
 *
 * A callout box for highlighting key information.
 */
registry.register({
  tagName: 'usa-summary-box',
  droppable: false,

  traits: {
    // Heading
    heading: {
      definition: {
        name: 'heading',
        label: 'Heading',
        type: 'text',
        default: 'Key Information',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value, 'Key Information');
          element.setAttribute('heading', text);
          (element as USWDSElement).heading = text;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).heading || element.getAttribute('heading') || 'Key Information';
        },
      },
    },

    // Content
    content: {
      definition: {
        name: 'content',
        label: 'Content',
        type: 'textarea',
        default: 'Summary content goes here.',
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

    // Heading level
    'heading-level': {
      definition: {
        name: 'heading-level',
        label: 'Heading Level',
        type: 'select',
        default: 'h3',
        options: [
          { id: 'h1', label: 'H1' },
          { id: 'h2', label: 'H2' },
          { id: 'h3', label: 'H3' },
          { id: 'h4', label: 'H4' },
          { id: 'h5', label: 'H5' },
          { id: 'h6', label: 'H6' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const level = traitStr(value, 'h3');
          element.setAttribute('heading-level', level);
          (element as USWDSElement).headingLevel = level;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).headingLevel || element.getAttribute('heading-level') || 'h3';
        },
      },
    },
  },
});

}
