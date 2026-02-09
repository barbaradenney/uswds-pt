/**
 * Block categories matching USWDS-WC package structure
 */
export const BLOCK_CATEGORIES = [
  {
    id: 'actions',
    label: 'Actions',
    order: 1,
    open: true,
  },
  {
    id: 'forms',
    label: 'Form Controls',
    order: 2,
    open: false,
  },
  {
    id: 'navigation',
    label: 'Navigation',
    order: 3,
    open: false,
  },
  {
    id: 'data-display',
    label: 'Data Display',
    order: 4,
    open: false,
  },
  {
    id: 'feedback',
    label: 'Feedback',
    order: 5,
    open: false,
  },
  {
    id: 'layout',
    label: 'Layout',
    order: 6,
    open: false,
  },
  {
    id: 'structure',
    label: 'Structure',
    order: 7,
    open: false,
  },
  {
    id: 'patterns',
    label: 'Form Patterns',
    order: 8,
    open: false,
  },
  {
    id: 'templates',
    label: 'Page Templates',
    order: 9,
    open: false,
  },
] as const;
