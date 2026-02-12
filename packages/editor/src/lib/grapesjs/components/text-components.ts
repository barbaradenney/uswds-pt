/**
 * Text Component Types
 *
 * Registers GrapesJS component types for text content:
 * - text-block: Paragraph (<p>) with rich text editing
 * - heading-block: Headings (<h1>-<h6>) with level selection trait
 */

import { textDefaults } from '../component-defaults';
import { createDebugLogger } from '@uswds-pt/shared';

const debug = createDebugLogger('TextComponents');

interface ComponentsAPI {
  addType(name: string, config: unknown): void;
}

/**
 * Heading level trait options
 */
const headingLevelOptions = [
  { id: 'h1', label: 'Heading 1 (Largest)' },
  { id: 'h2', label: 'Heading 2' },
  { id: 'h3', label: 'Heading 3' },
  { id: 'h4', label: 'Heading 4' },
  { id: 'h5', label: 'Heading 5' },
  { id: 'h6', label: 'Heading 6 (Smallest)' },
];

/**
 * Register text block component types
 */
export function registerTextComponents(Components: ComponentsAPI): void {
  // Paragraph - extends built-in 'text' type for proper RTE support
  Components.addType('text-block', {
    extend: 'text',
    isComponent: (el: HTMLElement) => el.tagName === 'P',
    model: {
      defaults: {
        tagName: 'p',
        name: 'Text',
        ...textDefaults,
      },
    },
  });

  // Headings - extends built-in 'text' type for proper RTE support
  Components.addType('heading-block', {
    extend: 'text',
    isComponent: (el: HTMLElement) => /^H[1-6]$/.test(el.tagName),
    model: {
      defaults: {
        tagName: 'h2',
        name: 'Heading',
        ...textDefaults,
        traits: [
          {
            type: 'select',
            name: 'heading-level',
            label: 'Heading Size',
            default: 'h2',
            options: headingLevelOptions,
            changeProp: true,
          },
        ],
      },
      init(this: any) {
        // Set initial heading level based on actual tagName
        const tagName = this.get('tagName')?.toLowerCase() || 'h2';
        this.set('heading-level', tagName);

        // Listen for heading-level trait changes
        this.on('change:heading-level', this.handleHeadingLevelChange);
      },
      /**
       * Handle heading level changes by updating the tagName and re-rendering.
       *
       * Uses GrapesJS's built-in view.render() to update the DOM element,
       * preserving content and attributes while changing the tag.
       */
      handleHeadingLevelChange(this: any) {
        const newLevel = this.get('heading-level') as string | undefined;
        if (!newLevel || !/^h[1-6]$/.test(newLevel)) {
          return;
        }

        const currentTag = (this.get('tagName') as string | undefined)?.toLowerCase();
        if (currentTag === newLevel) {
          return;
        }

        debug(`Changing heading from ${currentTag} to ${newLevel}`);

        // Update the tagName - GrapesJS will handle DOM update on next render
        this.set('tagName', newLevel);

        // Get the view and trigger a re-render
        const view = this.view;
        if (view) {
          // Save current content before re-render
          const content = (this.get('content') as string | undefined) || this.getEl()?.innerHTML || '';

          // Re-render the view with the new tag
          view.render();

          // Restore content if needed (view.render() should preserve it)
          const el = this.getEl();
          if (el && !el.innerHTML && content) {
            el.innerHTML = content;
          }

          debug(`Heading re-rendered as ${newLevel}`);
        }
      },
    },
  });
}
