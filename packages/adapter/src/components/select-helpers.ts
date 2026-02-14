/**
 * Select Options Helpers (for usa-select)
 *
 * Contains SELECT_PRESETS data and helper functions for building
 * select option lists from presets, custom text, or manual traits.
 */

import type { UnifiedTrait } from './shared-utils.js';
import type { USWDSElement } from '@uswds-pt/shared';

// Preset option lists
export const SELECT_PRESETS: Record<string, Array<{ value: string; text: string }>> = {
  'us-states': [
    { value: 'AL', text: 'Alabama' }, { value: 'AK', text: 'Alaska' }, { value: 'AZ', text: 'Arizona' },
    { value: 'AR', text: 'Arkansas' }, { value: 'CA', text: 'California' }, { value: 'CO', text: 'Colorado' },
    { value: 'CT', text: 'Connecticut' }, { value: 'DE', text: 'Delaware' }, { value: 'FL', text: 'Florida' },
    { value: 'GA', text: 'Georgia' }, { value: 'HI', text: 'Hawaii' }, { value: 'ID', text: 'Idaho' },
    { value: 'IL', text: 'Illinois' }, { value: 'IN', text: 'Indiana' }, { value: 'IA', text: 'Iowa' },
    { value: 'KS', text: 'Kansas' }, { value: 'KY', text: 'Kentucky' }, { value: 'LA', text: 'Louisiana' },
    { value: 'ME', text: 'Maine' }, { value: 'MD', text: 'Maryland' }, { value: 'MA', text: 'Massachusetts' },
    { value: 'MI', text: 'Michigan' }, { value: 'MN', text: 'Minnesota' }, { value: 'MS', text: 'Mississippi' },
    { value: 'MO', text: 'Missouri' }, { value: 'MT', text: 'Montana' }, { value: 'NE', text: 'Nebraska' },
    { value: 'NV', text: 'Nevada' }, { value: 'NH', text: 'New Hampshire' }, { value: 'NJ', text: 'New Jersey' },
    { value: 'NM', text: 'New Mexico' }, { value: 'NY', text: 'New York' }, { value: 'NC', text: 'North Carolina' },
    { value: 'ND', text: 'North Dakota' }, { value: 'OH', text: 'Ohio' }, { value: 'OK', text: 'Oklahoma' },
    { value: 'OR', text: 'Oregon' }, { value: 'PA', text: 'Pennsylvania' }, { value: 'RI', text: 'Rhode Island' },
    { value: 'SC', text: 'South Carolina' }, { value: 'SD', text: 'South Dakota' }, { value: 'TN', text: 'Tennessee' },
    { value: 'TX', text: 'Texas' }, { value: 'UT', text: 'Utah' }, { value: 'VT', text: 'Vermont' },
    { value: 'VA', text: 'Virginia' }, { value: 'WA', text: 'Washington' }, { value: 'WV', text: 'West Virginia' },
    { value: 'WI', text: 'Wisconsin' }, { value: 'WY', text: 'Wyoming' }, { value: 'DC', text: 'District of Columbia' },
    { value: 'AS', text: 'American Samoa' }, { value: 'GU', text: 'Guam' }, { value: 'MP', text: 'Northern Mariana Islands' },
    { value: 'PR', text: 'Puerto Rico' }, { value: 'VI', text: 'U.S. Virgin Islands' },
  ],
  'countries': [
    { value: 'US', text: 'United States' }, { value: 'CA', text: 'Canada' }, { value: 'MX', text: 'Mexico' },
    { value: 'AF', text: 'Afghanistan' }, { value: 'AL', text: 'Albania' }, { value: 'DZ', text: 'Algeria' },
    { value: 'AR', text: 'Argentina' }, { value: 'AU', text: 'Australia' }, { value: 'AT', text: 'Austria' },
    { value: 'BD', text: 'Bangladesh' }, { value: 'BE', text: 'Belgium' }, { value: 'BR', text: 'Brazil' },
    { value: 'BG', text: 'Bulgaria' }, { value: 'KH', text: 'Cambodia' }, { value: 'CM', text: 'Cameroon' },
    { value: 'CL', text: 'Chile' }, { value: 'CN', text: 'China' }, { value: 'CO', text: 'Colombia' },
    { value: 'CR', text: 'Costa Rica' }, { value: 'HR', text: 'Croatia' }, { value: 'CU', text: 'Cuba' },
    { value: 'CZ', text: 'Czech Republic' }, { value: 'DK', text: 'Denmark' }, { value: 'DO', text: 'Dominican Republic' },
    { value: 'EC', text: 'Ecuador' }, { value: 'EG', text: 'Egypt' }, { value: 'SV', text: 'El Salvador' },
    { value: 'ET', text: 'Ethiopia' }, { value: 'FI', text: 'Finland' }, { value: 'FR', text: 'France' },
    { value: 'DE', text: 'Germany' }, { value: 'GH', text: 'Ghana' }, { value: 'GR', text: 'Greece' },
    { value: 'GT', text: 'Guatemala' }, { value: 'HT', text: 'Haiti' }, { value: 'HN', text: 'Honduras' },
    { value: 'HK', text: 'Hong Kong' }, { value: 'HU', text: 'Hungary' }, { value: 'IS', text: 'Iceland' },
    { value: 'IN', text: 'India' }, { value: 'ID', text: 'Indonesia' }, { value: 'IR', text: 'Iran' },
    { value: 'IQ', text: 'Iraq' }, { value: 'IE', text: 'Ireland' }, { value: 'IL', text: 'Israel' },
    { value: 'IT', text: 'Italy' }, { value: 'JM', text: 'Jamaica' }, { value: 'JP', text: 'Japan' },
    { value: 'JO', text: 'Jordan' }, { value: 'KE', text: 'Kenya' }, { value: 'KR', text: 'South Korea' },
    { value: 'KW', text: 'Kuwait' }, { value: 'LB', text: 'Lebanon' }, { value: 'MY', text: 'Malaysia' },
    { value: 'MA', text: 'Morocco' }, { value: 'NL', text: 'Netherlands' }, { value: 'NZ', text: 'New Zealand' },
    { value: 'NG', text: 'Nigeria' }, { value: 'NO', text: 'Norway' }, { value: 'PK', text: 'Pakistan' },
    { value: 'PA', text: 'Panama' }, { value: 'PE', text: 'Peru' }, { value: 'PH', text: 'Philippines' },
    { value: 'PL', text: 'Poland' }, { value: 'PT', text: 'Portugal' }, { value: 'RO', text: 'Romania' },
    { value: 'RU', text: 'Russia' }, { value: 'SA', text: 'Saudi Arabia' }, { value: 'SG', text: 'Singapore' },
    { value: 'ZA', text: 'South Africa' }, { value: 'ES', text: 'Spain' }, { value: 'SE', text: 'Sweden' },
    { value: 'CH', text: 'Switzerland' }, { value: 'TW', text: 'Taiwan' }, { value: 'TH', text: 'Thailand' },
    { value: 'TR', text: 'Turkey' }, { value: 'UA', text: 'Ukraine' }, { value: 'AE', text: 'United Arab Emirates' },
    { value: 'GB', text: 'United Kingdom' }, { value: 'VE', text: 'Venezuela' }, { value: 'VN', text: 'Vietnam' },
  ],
  'months': [
    { value: '01', text: 'January' }, { value: '02', text: 'February' }, { value: '03', text: 'March' },
    { value: '04', text: 'April' }, { value: '05', text: 'May' }, { value: '06', text: 'June' },
    { value: '07', text: 'July' }, { value: '08', text: 'August' }, { value: '09', text: 'September' },
    { value: '10', text: 'October' }, { value: '11', text: 'November' }, { value: '12', text: 'December' },
  ],
  'years': Array.from({ length: 100 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: String(year), text: String(year) };
  }),
  'yes-no': [
    { value: 'yes', text: 'Yes' }, { value: 'no', text: 'No' },
  ],
};

/**
 * Parse custom options from textarea format
 * Format: one option per line, either "value|label" or just "label" (value = label)
 */
export function parseCustomOptions(text: string): Array<{ value: string; text: string }> {
  if (!text || !text.trim()) return [];

  return text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      if (line.includes('|')) {
        const [value, ...rest] = line.split('|');
        return { value: value.trim(), text: rest.join('|').trim() || value.trim() };
      }
      return { value: line, text: line };
    });
}

/**
 * Render options into the usa-select element
 */
export function renderSelectOptions(element: HTMLElement, options: Array<{ value: string; text: string }>): void {
  const internalSelect = element.querySelector('select');

  if (internalSelect) {
    // Clear existing options
    internalSelect.innerHTML = '';

    // Add default empty option
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '- Select -';
    internalSelect.appendChild(defaultOpt);

    // Add all options
    options.forEach(({ value, text }) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = text;
      internalSelect.appendChild(opt);
    });
  } else {
    // Fallback: set the options property
    (element as USWDSElement).options = options;
    if (typeof (element as USWDSElement).requestUpdate === 'function') {
      (element as USWDSElement).requestUpdate?.();
    }
  }
}

/**
 * Rebuild select options based on preset or custom options
 */
export function rebuildSelectOptionsFromSource(element: HTMLElement): void {
  const preset = element.getAttribute('options-preset') || 'manual';
  const customOptions = element.getAttribute('custom-options') || '';

  let options: Array<{ value: string; text: string }> = [];

  if (preset === 'custom') {
    options = parseCustomOptions(customOptions);
  } else if (preset !== 'manual' && SELECT_PRESETS[preset]) {
    options = SELECT_PRESETS[preset];
  } else {
    // Manual mode - use individual option traits
    const count = parseInt(element.getAttribute('option-count') || '3', 10);
    for (let i = 1; i <= count; i++) {
      const text = element.getAttribute(`option${i}-label`) || `Option ${i}`;
      const value = element.getAttribute(`option${i}-value`) || `option${i}`;
      options.push({ value, text });
    }
  }

  renderSelectOptions(element, options);
}

/**
 * Helper to create a select option trait (for manual mode)
 */
export function createSelectOptionTrait(
  optionNum: number,
  traitType: 'label' | 'value'
): UnifiedTrait {
  const attrName = `option${optionNum}-${traitType}`;
  const label = traitType === 'label' ? `Option ${optionNum} Label` : `Option ${optionNum} Value`;
  const defaultValue = traitType === 'label' ? `Option ${optionNum}` : `option${optionNum}`;

  // Only show in manual mode and when optionNum <= option-count
  const visibleFn = (component: any) => {
    try {
      if (!component) return false;
      const preset = component.get?.('attributes')?.['options-preset'] || 'manual';
      if (preset !== 'manual') return false;
      const count = parseInt(component.get?.('attributes')?.['option-count'] || '3', 10);
      return optionNum <= count;
    } catch {
      return false;
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
      onChange: (element: HTMLElement, value: any) => {
        element.setAttribute(attrName, value || '');
        rebuildSelectOptionsFromSource(element);
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) ?? defaultValue;
      },
    },
  };
}
