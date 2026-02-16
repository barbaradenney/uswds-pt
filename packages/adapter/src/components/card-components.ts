/**
 * Card Components
 *
 * Registers the usa-card component with all its traits:
 * heading, text, heading-level, media-type, media-src, media-alt,
 * media-position, flag-layout, header-first, footer-text, actionable, href, target.
 */

import type { ComponentRegistration, TraitValue } from './shared-utils.js';
import type { RegistryLike } from './shared-utils.js';
import { coerceBoolean, traitStr, triggerUpdate } from './shared-utils.js';
import type { USWDSElement } from '@uswds-pt/shared';

export function registerCardComponents(registry: RegistryLike): void {
/**
 * USA Card Component
 *
 * A flexible card component for displaying content with optional media.
 */
registry.register({
  tagName: 'usa-card',
  droppable: false,

  traits: {
    // Heading - card title
    heading: {
      definition: {
        name: 'heading',
        label: 'Heading',
        type: 'text',
        default: 'Card Title',
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

    // Text - card body content
    text: {
      definition: {
        name: 'text',
        label: 'Body Text',
        type: 'textarea',
        default: 'Card content goes here.',
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

    // Heading level
    'heading-level': {
      definition: {
        name: 'heading-level',
        label: 'Heading Level',
        type: 'select',
        default: '3',
        options: [
          { id: '1', label: 'H1' },
          { id: '2', label: 'H2' },
          { id: '3', label: 'H3' },
          { id: '4', label: 'H4' },
          { id: '5', label: 'H5' },
          { id: '6', label: 'H6' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const level = traitStr(value, '3');
          element.setAttribute('heading-level', level);
          (element as USWDSElement).headingLevel = level;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).headingLevel || element.getAttribute('heading-level') || '3';
        },
      },
    },

    // Media type - with auto-placeholder when switching types
    'media-type': {
      definition: {
        name: 'media-type',
        label: 'Media Type',
        type: 'select',
        default: 'none',
        options: [
          { id: 'none', label: 'None' },
          { id: 'image', label: 'Image' },
          { id: 'video', label: 'Video' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const mediaType = traitStr(value, 'none');
          element.setAttribute('media-type', mediaType);
          (element as USWDSElement).mediaType = mediaType;

          // Auto-set placeholder media when switching to image/video if no src set
          const currentSrc = element.getAttribute('media-src') || '';
          if (mediaType === 'image' && !currentSrc) {
            const placeholderImage = 'https://picsum.photos/800/450';
            element.setAttribute('media-src', placeholderImage);
            (element as USWDSElement).mediaSrc = placeholderImage;
            element.setAttribute('media-alt', 'Placeholder image');
            (element as USWDSElement).mediaAlt = 'Placeholder image';
          } else if (mediaType === 'video' && !currentSrc) {
            // Use a public domain sample video
            const placeholderVideo = 'https://www.w3schools.com/html/mov_bbb.mp4';
            element.setAttribute('media-src', placeholderVideo);
            (element as USWDSElement).mediaSrc = placeholderVideo;
            element.setAttribute('media-alt', 'Sample video');
            (element as USWDSElement).mediaAlt = 'Sample video';
          }

          // Trigger re-render
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('media-type') || 'none';
        },
      },
    },

    // Media source URL
    'media-src': {
      definition: {
        name: 'media-src',
        label: 'Media URL',
        type: 'text',
        default: '',
        placeholder: 'https://example.com/image.jpg',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          element.setAttribute('media-src', traitStr(value));
          (element as USWDSElement).mediaSrc = traitStr(value);
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('media-src') || '';
        },
      },
    },

    // Media alt text
    'media-alt': {
      definition: {
        name: 'media-alt',
        label: 'Media Alt Text',
        type: 'text',
        default: '',
        placeholder: 'Image description',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          element.setAttribute('media-alt', traitStr(value));
          (element as USWDSElement).mediaAlt = traitStr(value);
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('media-alt') || '';
        },
      },
    },

    // Media position
    'media-position': {
      definition: {
        name: 'media-position',
        label: 'Media Position',
        type: 'select',
        default: 'inset',
        options: [
          { id: 'inset', label: 'Inset' },
          { id: 'exdent', label: 'Exdent' },
          { id: 'right', label: 'Right (Flag)' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const position = traitStr(value, 'inset');
          element.setAttribute('media-position', position);
          (element as USWDSElement).mediaPosition = position;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).mediaPosition || element.getAttribute('media-position') || 'inset';
        },
      },
    },

    // Flag layout (horizontal)
    'flag-layout': {
      definition: {
        name: 'flag-layout',
        label: 'Flag Layout (Horizontal)',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('flag-layout', '');
          } else {
            element.removeAttribute('flag-layout');
          }
          (element as USWDSElement).flagLayout = isEnabled;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).flagLayout || element.hasAttribute('flag-layout');
        },
      },
    },

    // Header first
    'header-first': {
      definition: {
        name: 'header-first',
        label: 'Header Before Media',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('header-first', '');
          } else {
            element.removeAttribute('header-first');
          }
          (element as USWDSElement).headerFirst = isEnabled;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).headerFirst || element.hasAttribute('header-first');
        },
      },
    },

    // Footer text
    'footer-text': {
      definition: {
        name: 'footer-text',
        label: 'Footer Text',
        type: 'text',
        default: '',
        placeholder: 'Optional footer content',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value);
          element.setAttribute('footer-text', text);
          (element as USWDSElement).footerText = text;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).footerText || element.getAttribute('footer-text') || '';
        },
      },
    },

    // Actionable - entire card is clickable
    actionable: {
      definition: {
        name: 'actionable',
        label: 'Clickable Card',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('actionable', '');
          } else {
            element.removeAttribute('actionable');
          }
          (element as USWDSElement).actionable = isEnabled;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).actionable || element.hasAttribute('actionable');
        },
      },
    },

    // Link URL for actionable cards
    href: {
      definition: {
        name: 'href',
        label: 'Link URL',
        type: 'text',
        default: '',
        placeholder: 'https://...',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const url = traitStr(value);
          if (url) {
            element.setAttribute('href', url);
          } else {
            element.removeAttribute('href');
          }
          (element as USWDSElement).href = url;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).href || element.getAttribute('href') || '';
        },
      },
    },

    // Link target
    target: {
      definition: {
        name: 'target',
        label: 'Link Target',
        type: 'select',
        default: '_self',
        options: [
          { id: '_self', label: 'Same Window' },
          { id: '_blank', label: 'New Window' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const target = traitStr(value, '_self');
          if (target && target !== '_self') {
            element.setAttribute('target', target);
          } else {
            element.removeAttribute('target');
          }
          (element as USWDSElement).target = target;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).target || element.getAttribute('target') || '_self';
        },
      },
    },
  },
});

}
