/**
 * Text Component Types
 *
 * Registers GrapesJS component types for text content:
 * - text-block: Paragraph (<p>) with rich text editing
 * - heading-block: Headings (<h1>-<h6>) with level selection trait
 *
 * Both types include spacing and text-style traits that swap USWDS utility classes.
 */

import { textDefaults } from '../component-defaults';
import { createDebugLogger } from '@uswds-pt/shared';

const debug = createDebugLogger('TextComponents');

interface ComponentsAPI {
  addType(name: string, config: unknown): void;
}

// --- Class groups for trait-driven styling ---

const topSpacingClasses = [
  'margin-top-1', 'margin-top-2', 'margin-top-3', 'margin-top-4',
  'margin-top-5', 'margin-top-6', 'margin-top-8', 'margin-top-10',
];

const bottomSpacingClasses = [
  'margin-bottom-1', 'margin-bottom-2', 'margin-bottom-3', 'margin-bottom-4',
  'margin-bottom-5', 'margin-bottom-6', 'margin-bottom-8', 'margin-bottom-10',
];

const fontWeightClasses = ['text-light', 'text-normal', 'text-bold', 'text-heavy'];
const fontStyleClasses = ['text-italic'];
const textDecorationClasses = ['text-underline', 'text-strike'];

// --- Helpers ---

/** Remove all classes in a group and add the new one */
function swapClass(component: any, allClasses: string[], newClass: string): void {
  allClasses.forEach((cls) => component.removeClass(cls));
  if (newClass) {
    component.addClass(newClass);
  }
}

/** Read which class from a group is currently on the element */
function readClassFromElement(component: any, allClasses: string[]): string {
  const classes: string[] = component.getClasses();
  return classes.find((cls: string) => allClasses.includes(cls)) || '';
}

// --- Trait definitions ---

const topSpacingTrait = {
  type: 'select',
  name: 'top-spacing',
  label: 'Top Spacing',
  default: '',
  changeProp: true,
  options: [
    { id: '', label: 'None' },
    { id: 'margin-top-1', label: '8px (1 unit)' },
    { id: 'margin-top-2', label: '16px (2 units)' },
    { id: 'margin-top-3', label: '24px (3 units)' },
    { id: 'margin-top-4', label: '32px (4 units)' },
    { id: 'margin-top-5', label: '40px (5 units)' },
    { id: 'margin-top-6', label: '48px (6 units)' },
    { id: 'margin-top-8', label: '64px (8 units)' },
    { id: 'margin-top-10', label: '80px (10 units)' },
  ],
};

const bottomSpacingTrait = {
  type: 'select',
  name: 'bottom-spacing',
  label: 'Bottom Spacing',
  default: '',
  changeProp: true,
  options: [
    { id: '', label: 'None' },
    { id: 'margin-bottom-1', label: '8px (1 unit)' },
    { id: 'margin-bottom-2', label: '16px (2 units)' },
    { id: 'margin-bottom-3', label: '24px (3 units)' },
    { id: 'margin-bottom-4', label: '32px (4 units)' },
    { id: 'margin-bottom-5', label: '40px (5 units)' },
    { id: 'margin-bottom-6', label: '48px (6 units)' },
    { id: 'margin-bottom-8', label: '64px (8 units)' },
    { id: 'margin-bottom-10', label: '80px (10 units)' },
  ],
};

const fontWeightTrait = {
  type: 'select',
  name: 'font-weight',
  label: 'Font Weight',
  default: '',
  changeProp: true,
  options: [
    { id: '', label: 'Default' },
    { id: 'text-light', label: 'Light' },
    { id: 'text-normal', label: 'Normal' },
    { id: 'text-bold', label: 'Bold' },
    { id: 'text-heavy', label: 'Heavy' },
  ],
};

const fontStyleTrait = {
  type: 'select',
  name: 'font-style',
  label: 'Font Style',
  default: '',
  changeProp: true,
  options: [
    { id: '', label: 'Default' },
    { id: 'text-italic', label: 'Italic' },
  ],
};

const textDecorationTrait = {
  type: 'select',
  name: 'text-decoration',
  label: 'Text Decoration',
  default: '',
  changeProp: true,
  options: [
    { id: '', label: 'None' },
    { id: 'text-underline', label: 'Underline' },
    { id: 'text-strike', label: 'Strikethrough' },
  ],
};

const styleTraits = [
  topSpacingTrait,
  bottomSpacingTrait,
  fontWeightTrait,
  fontStyleTrait,
  textDecorationTrait,
];

/** Read current classes and set model props accordingly (for loading saved content) */
function initStyleProps(component: any): void {
  component.set('top-spacing', readClassFromElement(component, topSpacingClasses));
  component.set('bottom-spacing', readClassFromElement(component, bottomSpacingClasses));
  component.set('font-weight', readClassFromElement(component, fontWeightClasses));
  component.set('font-style', readClassFromElement(component, fontStyleClasses));
  component.set('text-decoration', readClassFromElement(component, textDecorationClasses));
}

/** Register change listeners for all style traits */
function listenForStyleChanges(component: any): void {
  component.on('change:top-spacing', () => {
    swapClass(component, topSpacingClasses, component.get('top-spacing') || '');
  });
  component.on('change:bottom-spacing', () => {
    swapClass(component, bottomSpacingClasses, component.get('bottom-spacing') || '');
  });
  component.on('change:font-weight', () => {
    swapClass(component, fontWeightClasses, component.get('font-weight') || '');
  });
  component.on('change:font-style', () => {
    swapClass(component, fontStyleClasses, component.get('font-style') || '');
  });
  component.on('change:text-decoration', () => {
    swapClass(component, textDecorationClasses, component.get('text-decoration') || '');
  });
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
        traits: [...styleTraits],
      },
      init(this: any) {
        initStyleProps(this);
        listenForStyleChanges(this);
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
          ...styleTraits,
        ],
      },
      init(this: any) {
        // Set initial heading level based on actual tagName
        const tagName = this.get('tagName')?.toLowerCase() || 'h2';
        this.set('heading-level', tagName);

        // Listen for heading-level trait changes
        this.on('change:heading-level', this.handleHeadingLevelChange);

        // Initialize style props from existing classes and listen for changes
        initStyleProps(this);
        listenForStyleChanges(this);
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
