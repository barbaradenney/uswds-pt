/**
 * Component Traits Configuration
 * Defines editable properties for each USWDS component in GrapesJS
 */

export interface ComponentTraitConfig {
  tagName: string;
  traits: TraitDefinition[];
  droppable?: boolean | string;
}

export interface TraitDefinition {
  name: string;
  label: string;
  type: 'text' | 'number' | 'checkbox' | 'select' | 'color' | 'textarea';
  changeProp?: number;
  default?: string | number | boolean;
  placeholder?: string;
  options?: Array<{ id: string; label: string }>;
  min?: number;
  max?: number;
}

/**
 * Trait configurations for USWDS components
 */
export const COMPONENT_TRAITS: ComponentTraitConfig[] = [
  // Button
  {
    tagName: 'usa-button',
    traits: [
      { name: 'text', label: 'Button Text', type: 'text', changeProp: 0, default: 'Click me' }, // changeProp: 0 means update content
      {
        name: 'variant',
        label: 'Variant',
        type: 'select',
        changeProp: 1, // Update attributes
        default: 'default',
        options: [
          { id: 'default', label: 'Default' },
          { id: 'secondary', label: 'Secondary' },
          { id: 'accent-cool', label: 'Accent Cool' },
          { id: 'accent-warm', label: 'Accent Warm' },
          { id: 'base', label: 'Base' },
          { id: 'outline', label: 'Outline' },
          { id: 'inverse', label: 'Inverse' },
          { id: 'unstyled', label: 'Unstyled' },
        ],
      },
      {
        name: 'size',
        label: 'Size',
        type: 'select',
        changeProp: 1, // Update attributes
        default: '',
        options: [
          { id: '', label: 'Default' },
          { id: 'big', label: 'Big' },
        ],
      },
      { name: 'disabled', label: 'Disabled', type: 'checkbox', changeProp: 1, default: false },
      { name: 'href', label: 'Link URL', type: 'text', changeProp: 1, placeholder: 'https://...' },
    ],
  },

  // // Text Input
  // {
  //   tagName: 'usa-text-input',
  //   traits: [
  //     { name: 'label', label: 'Label', type: 'text', default: 'Label' },
  //     { name: 'name', label: 'Name', type: 'text', default: 'field' },
  //     { name: 'placeholder', label: 'Placeholder', type: 'text' },
  //     { name: 'hint', label: 'Hint Text', type: 'text' },
  //     { name: 'error', label: 'Error Message', type: 'text' },
  //     {
  //       name: 'type',
  //       label: 'Input Type',
  //       type: 'select',
  //       default: 'text',
  //       options: [
  //         { id: 'text', label: 'Text' },
  //         { id: 'email', label: 'Email' },
  //         { id: 'password', label: 'Password' },
  //         { id: 'tel', label: 'Phone' },
  //         { id: 'url', label: 'URL' },
  //         { id: 'number', label: 'Number' },
  //       ],
  //     },
  //     { name: 'required', label: 'Required', type: 'checkbox', default: false },
  //     { name: 'disabled', label: 'Disabled', type: 'checkbox', default: false },
  //   ],
  // },

  // // Textarea
  // {
  //   tagName: 'usa-textarea',
  //   traits: [
  //     { name: 'label', label: 'Label', type: 'text', default: 'Label' },
  //     { name: 'name', label: 'Name', type: 'text', default: 'field' },
  //     { name: 'placeholder', label: 'Placeholder', type: 'text' },
  //     { name: 'hint', label: 'Hint Text', type: 'text' },
  //     { name: 'error', label: 'Error Message', type: 'text' },
  //     { name: 'required', label: 'Required', type: 'checkbox', default: false },
  //     { name: 'disabled', label: 'Disabled', type: 'checkbox', default: false },
  //   ],
  // },

  // // Select - with JSON options
  // {
  //   tagName: 'usa-select',
  //   traits: [
  //     { name: 'label', label: 'Label', type: 'text', default: 'Label' },
  //     { name: 'name', label: 'Name', type: 'text', default: 'field' },
  //     { name: 'defaultOption', label: 'Placeholder', type: 'text', default: 'Select an option' },
  //     { name: 'hint', label: 'Hint Text', type: 'text' },
  //     { name: 'error', label: 'Error Message', type: 'text' },
  //     {
  //       name: 'options-json',
  //       label: 'Options (JSON)',
  //       type: 'textarea',
  //       placeholder: '[{"value": "1", "text": "Option 1"}, {"value": "2", "text": "Option 2"}]',
  //     },
  //     { name: 'required', label: 'Required', type: 'checkbox', default: false },
  //     { name: 'disabled', label: 'Disabled', type: 'checkbox', default: false },
  //   ],
  // },

  // // Checkbox
  // {
  //   tagName: 'usa-checkbox',
  //   traits: [
  //     { name: 'label', label: 'Label', type: 'text', default: 'Checkbox label' },
  //     { name: 'name', label: 'Name', type: 'text', default: 'field' },
  //     { name: 'value', label: 'Value', type: 'text' },
  //     { name: 'checked', label: 'Checked', type: 'checkbox', default: false },
  //     { name: 'disabled', label: 'Disabled', type: 'checkbox', default: false },
  //   ],
  // },

  // // Radio
  // {
  //   tagName: 'usa-radio',
  //   traits: [
  //     { name: 'label', label: 'Label', type: 'text', default: 'Radio label' },
  //     { name: 'name', label: 'Name', type: 'text', default: 'field' },
  //     { name: 'value', label: 'Value', type: 'text', default: '1' },
  //     { name: 'checked', label: 'Checked', type: 'checkbox', default: false },
  //     { name: 'disabled', label: 'Disabled', type: 'checkbox', default: false },
  //   ],
  // },

  // // Alert
  // {
  //   tagName: 'usa-alert',
  //   traits: [
  //     { name: 'heading', label: 'Heading', type: 'text' },
  //     {
  //       name: 'variant',
  //       label: 'Variant',
  //       type: 'select',
  //       default: 'info',
  //       options: [
  //         { id: 'info', label: 'Info' },
  //         { id: 'success', label: 'Success' },
  //         { id: 'warning', label: 'Warning' },
  //         { id: 'error', label: 'Error' },
  //         { id: 'emergency', label: 'Emergency' },
  //       ],
  //     },
  //     { name: 'slim', label: 'Slim', type: 'checkbox', default: false },
  //     { name: 'no-icon', label: 'Hide Icon', type: 'checkbox', default: false },
  //   ],
  //   droppable: true,
  // },

  // // Card
  // {
  //   tagName: 'usa-card',
  //   traits: [
  //     { name: 'heading', label: 'Heading', type: 'text' },
  //     {
  //       name: 'variant',
  //       label: 'Variant',
  //       type: 'select',
  //       default: '',
  //       options: [
  //         { id: '', label: 'Default' },
  //         { id: 'flag', label: 'Flag' },
  //         { id: 'media', label: 'Media' },
  //       ],
  //     },
  //   ],
  //   droppable: true,
  // },

  // // Link
  // {
  //   tagName: 'usa-link',
  //   traits: [
  //     { name: 'href', label: 'URL', type: 'text', placeholder: 'https://...' },
  //     { name: 'external', label: 'External Link', type: 'checkbox', default: false },
  //   ],
  //   droppable: true,
  // },

  // // Icon
  // {
  //   tagName: 'usa-icon',
  //   traits: [
  //     {
  //       name: 'name',
  //       label: 'Icon Name',
  //       type: 'select',
  //       default: 'check',
  //       options: [
  //         { id: 'check', label: 'Check' },
  //         { id: 'check_circle', label: 'Check Circle' },
  //         { id: 'close', label: 'Close' },
  //         { id: 'error', label: 'Error' },
  //         { id: 'warning', label: 'Warning' },
  //         { id: 'info', label: 'Info' },
  //         { id: 'help', label: 'Help' },
  //         { id: 'search', label: 'Search' },
  //         { id: 'menu', label: 'Menu' },
  //         { id: 'arrow_forward', label: 'Arrow Forward' },
  //         { id: 'arrow_back', label: 'Arrow Back' },
  //         { id: 'expand_more', label: 'Expand More' },
  //         { id: 'expand_less', label: 'Expand Less' },
  //         { id: 'settings', label: 'Settings' },
  //         { id: 'mail', label: 'Mail' },
  //         { id: 'phone', label: 'Phone' },
  //         { id: 'location_on', label: 'Location' },
  //       ],
  //     },
  //     {
  //       name: 'size',
  //       label: 'Size',
  //       type: 'select',
  //       default: '',
  //       options: [
  //         { id: '', label: 'Default' },
  //         { id: '3', label: 'Size 3' },
  //         { id: '4', label: 'Size 4' },
  //         { id: '5', label: 'Size 5' },
  //         { id: '6', label: 'Size 6' },
  //         { id: '7', label: 'Size 7' },
  //         { id: '8', label: 'Size 8' },
  //         { id: '9', label: 'Size 9' },
  //       ],
  //     },
  //     { name: 'aria-label', label: 'Aria Label', type: 'text' },
  //   ],
  // },

  // // Tag
  // {
  //   tagName: 'usa-tag',
  //   traits: [
  //     {
  //       name: 'variant',
  //       label: 'Variant',
  //       type: 'select',
  //       default: '',
  //       options: [
  //         { id: '', label: 'Default' },
  //         { id: 'big', label: 'Big' },
  //       ],
  //     },
  //   ],
  //   droppable: true,
  // },

  // // Search
  // {
  //   tagName: 'usa-search',
  //   traits: [
  //     { name: 'label', label: 'Label', type: 'text', default: 'Search' },
  //     {
  //       name: 'size',
  //       label: 'Size',
  //       type: 'select',
  //       default: 'default',
  //       options: [
  //         { id: 'small', label: 'Small' },
  //         { id: 'default', label: 'Default' },
  //         { id: 'big', label: 'Big' },
  //       ],
  //     },
  //     { name: 'placeholder', label: 'Placeholder', type: 'text' },
  //   ],
  // },

  // // Pagination
  // {
  //   tagName: 'usa-pagination',
  //   traits: [
  //     { name: 'current-page', label: 'Current Page', type: 'number', default: 1, min: 1 },
  //     { name: 'total-pages', label: 'Total Pages', type: 'number', default: 5, min: 1 },
  //   ],
  // },

  // // Accordion
  // {
  //   tagName: 'usa-accordion',
  //   traits: [
  //     { name: 'bordered', label: 'Bordered', type: 'checkbox', default: false },
  //     { name: 'multiselectable', label: 'Multi-selectable', type: 'checkbox', default: false },
  //   ],
  //   droppable: 'usa-accordion-item',
  // },

  // // Accordion Item
  // {
  //   tagName: 'usa-accordion-item',
  //   traits: [
  //     { name: 'heading', label: 'Heading', type: 'text', default: 'Section' },
  //     { name: 'expanded', label: 'Expanded', type: 'checkbox', default: false },
  //   ],
  //   droppable: true,
  // },

  // // Modal
  // {
  //   tagName: 'usa-modal',
  //   traits: [
  //     { name: 'heading', label: 'Heading', type: 'text' },
  //     { name: 'open', label: 'Open', type: 'checkbox', default: false },
  //     { name: 'large', label: 'Large', type: 'checkbox', default: false },
  //   ],
  //   droppable: true,
  // },

  // // Tooltip
  // {
  //   tagName: 'usa-tooltip',
  //   traits: [
  //     { name: 'content', label: 'Tooltip Text', type: 'text', default: 'Tooltip text' },
  //     {
  //       name: 'position',
  //       label: 'Position',
  //       type: 'select',
  //       default: 'top',
  //       options: [
  //         { id: 'top', label: 'Top' },
  //         { id: 'bottom', label: 'Bottom' },
  //         { id: 'left', label: 'Left' },
  //         { id: 'right', label: 'Right' },
  //       ],
  //     },
  //   ],
  //   droppable: true,
  // },

  // // Date Picker
  // {
  //   tagName: 'usa-date-picker',
  //   traits: [
  //     { name: 'label', label: 'Label', type: 'text', default: 'Date' },
  //     { name: 'name', label: 'Name', type: 'text', default: 'date' },
  //     { name: 'hint', label: 'Hint Text', type: 'text' },
  //     { name: 'min-date', label: 'Min Date', type: 'text', placeholder: 'YYYY-MM-DD' },
  //     { name: 'max-date', label: 'Max Date', type: 'text', placeholder: 'YYYY-MM-DD' },
  //     { name: 'required', label: 'Required', type: 'checkbox', default: false },
  //     { name: 'disabled', label: 'Disabled', type: 'checkbox', default: false },
  //   ],
  // },

  // // Time Picker
  // {
  //   tagName: 'usa-time-picker',
  //   traits: [
  //     { name: 'label', label: 'Label', type: 'text', default: 'Time' },
  //     { name: 'name', label: 'Name', type: 'text', default: 'time' },
  //     { name: 'hint', label: 'Hint Text', type: 'text' },
  //     { name: 'min-time', label: 'Min Time', type: 'text', placeholder: 'HH:MM' },
  //     { name: 'max-time', label: 'Max Time', type: 'text', placeholder: 'HH:MM' },
  //     { name: 'step', label: 'Step (minutes)', type: 'number', default: 30 },
  //     { name: 'required', label: 'Required', type: 'checkbox', default: false },
  //   ],
  // },

  // // File Input
  // {
  //   tagName: 'usa-file-input',
  //   traits: [
  //     { name: 'label', label: 'Label', type: 'text', default: 'Upload file' },
  //     { name: 'name', label: 'Name', type: 'text', default: 'file' },
  //     { name: 'hint', label: 'Hint Text', type: 'text' },
  //     { name: 'accept', label: 'Accept Types', type: 'text', placeholder: '.pdf,.doc,.jpg' },
  //     { name: 'multiple', label: 'Multiple Files', type: 'checkbox', default: false },
  //     { name: 'required', label: 'Required', type: 'checkbox', default: false },
  //     { name: 'disabled', label: 'Disabled', type: 'checkbox', default: false },
  //   ],
  // },

  // // Range Slider
  // {
  //   tagName: 'usa-range-slider',
  //   traits: [
  //     { name: 'label', label: 'Label', type: 'text', default: 'Range' },
  //     { name: 'name', label: 'Name', type: 'text', default: 'range' },
  //     { name: 'min', label: 'Min', type: 'number', default: 0 },
  //     { name: 'max', label: 'Max', type: 'number', default: 100 },
  //     { name: 'step', label: 'Step', type: 'number', default: 1 },
  //     { name: 'value', label: 'Value', type: 'number', default: 50 },
  //   ],
  // },

  // // Step Indicator
  // {
  //   tagName: 'usa-step-indicator',
  //   traits: [
  //     { name: 'current-step', label: 'Current Step', type: 'number', default: 1, min: 1 },
  //     { name: 'total-steps', label: 'Total Steps', type: 'number', default: 4, min: 2 },
  //   ],
  // },

  // // Summary Box
  // {
  //   tagName: 'usa-summary-box',
  //   traits: [
  //     { name: 'heading', label: 'Heading', type: 'text', default: 'Key information' },
  //   ],
  //   droppable: true,
  // },

  // // Banner
  // {
  //   tagName: 'usa-banner',
  //   traits: [
  //     { name: 'lang', label: 'Language', type: 'select', default: 'en', options: [
  //       { id: 'en', label: 'English' },
  //       { id: 'es', label: 'Spanish' },
  //     ]},
  //   ],
  // },

  // // Site Alert
  // {
  //   tagName: 'usa-site-alert',
  //   traits: [
  //     {
  //       name: 'variant',
  //       label: 'Variant',
  //       type: 'select',
  //       default: 'info',
  //       options: [
  //         { id: 'info', label: 'Info' },
  //         { id: 'emergency', label: 'Emergency' },
  //       ],
  //     },
  //     { name: 'heading', label: 'Heading', type: 'text' },
  //     { name: 'slim', label: 'Slim', type: 'checkbox', default: false },
  //     { name: 'no-icon', label: 'Hide Icon', type: 'checkbox', default: false },
  //   ],
  //   droppable: true,
  // },
];

/**
 * Register component types with GrapesJS editor
 */
export function registerComponentTraits(editor: any): void {
  // Use Components API (or DomComponents, they're the same in GrapesJS)
  const Components = editor.Components || editor.DomComponents;

  if (!Components) {
    console.error('USWDS-PT: Could not find Components API on editor');
    return;
  }

  console.log('USWDS-PT: Registering component traits...');

  for (const config of COMPONENT_TRAITS) {
    Components.addType(config.tagName, {
      // Match any element with this tag name
      isComponent: (el: HTMLElement) => el.tagName?.toLowerCase() === config.tagName,

      model: {
        defaults: {
          tagName: config.tagName,
          draggable: true,
          droppable: config.droppable ?? false,
          // Define the traits that will show in the properties panel
          traits: config.traits,
          // Web components handle their own rendering
          components: false,
        },

        // Initialize text trait from content
        init(this: any) {
          // Sync text trait with content on init
          const content = this.get('content') || '';
          const textTrait = this.getTrait('text');
          if (textTrait && typeof content === 'string') {
            textTrait.set('value', content);
          }

          // Listen for text trait changes and update content
          this.on('change:text', () => {
            const newText = this.get('text');
            if (newText !== undefined) {
              this.set('content', newText);
            }
          });
        },
      },
    });

    console.log(`USWDS-PT: Registered traits for ${config.tagName}`);
  }

  // Handle the special case of select options
  editor.on('component:update:options-json', (model: any) => {
    try {
      const jsonStr = model.get('attributes')['options-json'];
      if (jsonStr) {
        const options = JSON.parse(jsonStr);
        // Set the options property on the DOM element
        const el = model.getEl();
        if (el) {
          el.options = options;
        }
      }
    } catch (e) {
      console.warn('Invalid options JSON:', e);
    }
  });

  console.log('USWDS-PT: Component traits registered successfully');
}
