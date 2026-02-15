/**
 * Form Pattern Components
 *
 * Registers pre-built form patterns as single-element web components:
 * usa-name-pattern, usa-address-pattern, usa-phone-number-pattern,
 * usa-email-address-pattern, usa-date-of-birth-pattern, usa-ssn-pattern
 *
 * Each pattern has a rebuild function that generates innerHTML from attributes,
 * following the same approach as rebuildTable() in data-components.ts.
 */

import type { ComponentRegistration, UnifiedTrait, TraitValue } from './shared-utils.js';
import { createAttributeTrait, createBooleanTrait } from './shared-utils.js';
import { escapeHtml } from '@uswds-pt/shared';

/**
 * Registry interface to avoid circular imports.
 */
interface RegistryLike {
  register(registration: ComponentRegistration): void;
}

// ============================================================================
// Rebuild Functions
// ============================================================================

/**
 * Rebuild the Name pattern from attributes.
 */
export function rebuildNamePattern(element: HTMLElement): void {
  const legend = element.getAttribute('legend') || 'Full Name';
  const showMiddle = element.getAttribute('show-middle') !== 'false';
  const showSuffix = element.getAttribute('show-suffix') !== 'false';

  const middleHtml = showMiddle
    ? '<usa-text-input label="Middle Name" name="middle-name"></usa-text-input>'
    : '';
  const suffixHtml = showSuffix
    ? '<usa-text-input label="Suffix" name="suffix" hint="e.g., Jr., Sr., III" width="sm" style="max-width: 8rem;"></usa-text-input>'
    : '';

  element.innerHTML = `<fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 0;">
  <legend class="usa-legend usa-legend--large">${escapeHtml(legend)}</legend>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
    <usa-text-input label="First Name" name="first-name" required></usa-text-input>
    ${middleHtml}
    <usa-text-input label="Last Name" name="last-name" required></usa-text-input>
  </div>
  ${suffixHtml}
</fieldset>`;
}

/**
 * Rebuild the Address pattern from attributes.
 */
export function rebuildAddressPattern(element: HTMLElement): void {
  const legend = element.getAttribute('legend') || 'Mailing Address';
  const showAddress2 = element.getAttribute('show-address-2') !== 'false';

  const address2Html = showAddress2
    ? '<usa-text-input label="Street Address Line 2" name="street-address-2" hint="Apartment, suite, unit, building, floor, etc."></usa-text-input>'
    : '';

  element.innerHTML = `<fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 0;">
  <legend class="usa-legend usa-legend--large">${escapeHtml(legend)}</legend>
  <usa-text-input label="Street Address" name="street-address-1" required></usa-text-input>
  ${address2Html}
  <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1rem;">
    <usa-text-input label="City" name="city" required></usa-text-input>
    <usa-select label="State" name="state" required options-preset="us-states"></usa-select>
    <usa-text-input label="ZIP Code" name="zip-code" inputmode="numeric" pattern="[\\d]{5}(-[\\d]{4})?" required></usa-text-input>
  </div>
</fieldset>`;
}

/**
 * Rebuild the Phone Number pattern from attributes.
 */
export function rebuildPhoneNumberPattern(element: HTMLElement): void {
  const legend = element.getAttribute('legend') || 'Phone Number';
  const showPhoneType = element.getAttribute('show-phone-type') !== 'false';

  const phoneTypeHtml = showPhoneType
    ? `<fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 1rem 0 0;">
    <legend class="usa-legend">Phone type</legend>
    <usa-radio label="Mobile" name="phone-type" value="mobile"></usa-radio>
    <usa-radio label="Home" name="phone-type" value="home"></usa-radio>
    <usa-radio label="Work" name="phone-type" value="work"></usa-radio>
  </fieldset>`
    : '';

  element.innerHTML = `<fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 0;">
  <legend class="usa-legend usa-legend--large">${escapeHtml(legend)}</legend>
  <usa-text-input label="Phone Number" name="phone" type="tel" hint="10-digit phone number, e.g., 202-555-0123" inputmode="tel" required></usa-text-input>
  ${phoneTypeHtml}
</fieldset>`;
}

/**
 * Rebuild the Email Address pattern from attributes.
 */
export function rebuildEmailAddressPattern(element: HTMLElement): void {
  const legend = element.getAttribute('legend') || 'Email Address';
  const showConfirm = element.getAttribute('show-confirm') !== 'false';

  const confirmHtml = showConfirm
    ? '<usa-text-input label="Confirm Email Address" name="email-confirm" type="email" hint="Re-enter your email address" required></usa-text-input>'
    : '';

  element.innerHTML = `<fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 0;">
  <legend class="usa-legend usa-legend--large">${escapeHtml(legend)}</legend>
  <usa-text-input label="Email Address" name="email" type="email" hint="Enter your email address" required></usa-text-input>
  ${confirmHtml}
</fieldset>`;
}

/**
 * Rebuild the Date of Birth pattern from attributes.
 */
export function rebuildDateOfBirthPattern(element: HTMLElement): void {
  const legend = element.getAttribute('legend') || 'Date of Birth';
  const hint = element.getAttribute('hint') || 'For example: January 19, 2000';

  element.innerHTML = `<fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 0;">
  <legend class="usa-legend usa-legend--large">${escapeHtml(legend)}</legend>
  <p class="usa-hint" style="margin: 0 0 0.5rem;">${escapeHtml(hint)}</p>
  <div style="display: flex; gap: 1rem;">
    <usa-select label="Month" name="dob-month" required options-preset="months" style="min-width: 10rem;"></usa-select>
    <usa-text-input label="Day" name="dob-day" inputmode="numeric" maxlength="2" pattern="[0-9]*" required style="max-width: 5rem;"></usa-text-input>
    <usa-text-input label="Year" name="dob-year" inputmode="numeric" minlength="4" maxlength="4" pattern="[0-9]{4}" required style="max-width: 6rem;"></usa-text-input>
  </div>
</fieldset>`;
}

/**
 * Rebuild the SSN pattern from attributes.
 */
export function rebuildSSNPattern(element: HTMLElement): void {
  const legend = element.getAttribute('legend') || 'Social Security Number';
  const showAlert = element.getAttribute('show-alert') !== 'false';
  const alertHeading = element.getAttribute('alert-heading') || 'Why we need this';
  const alertText = element.getAttribute('alert-text') || 'We use your Social Security Number to verify your identity. Your information is protected and encrypted.';

  const alertHtml = showAlert
    ? `<usa-alert variant="info" heading="${escapeHtml(alertHeading)}" text="${escapeHtml(alertText)}" slim></usa-alert>`
    : '';

  element.innerHTML = `<fieldset class="usa-fieldset" style="border: none; padding: 0; margin: 0;">
  <legend class="usa-legend usa-legend--large">${escapeHtml(legend)}</legend>
  ${alertHtml}
  <usa-text-input label="Social Security Number" name="ssn" type="password" hint="Enter the 9 digits of your SSN" inputmode="numeric" pattern="^(?!(000|666|9))\\d{3}-(?!00)\\d{2}-(?!0000)\\d{4}$" maxlength="11" required style="max-width: 12rem; margin-top: 1rem;"></usa-text-input>
  <usa-checkbox label="Show SSN" name="show-ssn" style="margin-top: 0.5rem;"></usa-checkbox>
</fieldset>`;
}

/**
 * Dispatch map for pattern tag name → rebuild function.
 */
export const PATTERN_REBUILDERS: Record<string, (el: HTMLElement) => void> = {
  'usa-name-pattern': rebuildNamePattern,
  'usa-address-pattern': rebuildAddressPattern,
  'usa-phone-number-pattern': rebuildPhoneNumberPattern,
  'usa-email-address-pattern': rebuildEmailAddressPattern,
  'usa-date-of-birth-pattern': rebuildDateOfBirthPattern,
  'usa-ssn-pattern': rebuildSSNPattern,
};

/**
 * Rebuild all pattern components inside a container.
 * Useful for bulk initialization in uswds-init.ts.
 */
export function rebuildAllPatterns(container: HTMLElement | Document): void {
  for (const [tag, rebuild] of Object.entries(PATTERN_REBUILDERS)) {
    container.querySelectorAll(tag).forEach((el: Element) => {
      rebuild(el as HTMLElement);
    });
  }
}

// ============================================================================
// Helper: create a trait that calls a rebuild function on change
// ============================================================================

function createPatternAttributeTrait(
  traitName: string,
  config: { label: string; type?: 'text' | 'textarea'; default?: string; placeholder?: string },
  rebuild: (element: HTMLElement) => void,
): UnifiedTrait {
  const base = createAttributeTrait(traitName, {
    label: config.label,
    type: config.type || 'text',
    default: config.default,
    placeholder: config.placeholder,
  });
  return {
    definition: base.definition,
    handler: {
      onChange: (element: HTMLElement, value: TraitValue) => {
        base.handler.onChange(element, value);
        rebuild(element);
      },
      getValue: base.handler.getValue,
    },
  };
}

function createPatternBooleanTrait(
  traitName: string,
  config: { label: string; default?: boolean },
  rebuild: (element: HTMLElement) => void,
): UnifiedTrait {
  const base = createBooleanTrait(traitName, { label: config.label, default: config.default });
  return {
    definition: base.definition,
    handler: {
      onChange: (element: HTMLElement, value: TraitValue) => {
        base.handler.onChange(element, value);
        rebuild(element);
      },
      getValue: base.handler.getValue,
      onInit: (element: HTMLElement, value: TraitValue) => {
        if (base.handler.onInit) base.handler.onInit(element, value);
        rebuild(element);
      },
    },
  };
}

// ============================================================================
// Registration
// ============================================================================

export function registerPatternComponents(registry: RegistryLike): void {

  // ---------- Name Pattern ----------
  registry.register({
    tagName: 'usa-name-pattern',
    droppable: false,
    traits: {
      legend: createPatternAttributeTrait('legend', {
        label: 'Legend',
        default: 'Full Name',
      }, rebuildNamePattern),
      'show-middle': createPatternBooleanTrait('show-middle', {
        label: 'Show Middle Name',
        default: true,
      }, rebuildNamePattern),
      'show-suffix': createPatternBooleanTrait('show-suffix', {
        label: 'Show Suffix',
        default: true,
      }, rebuildNamePattern),
    },
  });

  // ---------- Address Pattern ----------
  registry.register({
    tagName: 'usa-address-pattern',
    droppable: false,
    traits: {
      legend: createPatternAttributeTrait('legend', {
        label: 'Legend',
        default: 'Mailing Address',
      }, rebuildAddressPattern),
      'show-address-2': createPatternBooleanTrait('show-address-2', {
        label: 'Show Address Line 2',
        default: true,
      }, rebuildAddressPattern),
    },
  });

  // ---------- Phone Number Pattern ----------
  registry.register({
    tagName: 'usa-phone-number-pattern',
    droppable: false,
    traits: {
      legend: createPatternAttributeTrait('legend', {
        label: 'Legend',
        default: 'Phone Number',
      }, rebuildPhoneNumberPattern),
      'show-phone-type': createPatternBooleanTrait('show-phone-type', {
        label: 'Show Phone Type',
        default: true,
      }, rebuildPhoneNumberPattern),
    },
  });

  // ---------- Email Address Pattern ----------
  registry.register({
    tagName: 'usa-email-address-pattern',
    droppable: false,
    traits: {
      legend: createPatternAttributeTrait('legend', {
        label: 'Legend',
        default: 'Email Address',
      }, rebuildEmailAddressPattern),
      'show-confirm': createPatternBooleanTrait('show-confirm', {
        label: 'Show Confirmation Field',
        default: true,
      }, rebuildEmailAddressPattern),
    },
  });

  // ---------- Date of Birth Pattern ----------
  registry.register({
    tagName: 'usa-date-of-birth-pattern',
    droppable: false,
    traits: {
      legend: createPatternAttributeTrait('legend', {
        label: 'Legend',
        default: 'Date of Birth',
      }, rebuildDateOfBirthPattern),
      hint: createPatternAttributeTrait('hint', {
        label: 'Hint Text',
        default: 'For example: January 19, 2000',
      }, rebuildDateOfBirthPattern),
    },
  });

  // ---------- SSN Pattern ----------
  registry.register({
    tagName: 'usa-ssn-pattern',
    droppable: false,
    traits: {
      legend: createPatternAttributeTrait('legend', {
        label: 'Legend',
        default: 'Social Security Number',
      }, rebuildSSNPattern),
      'show-alert': createPatternBooleanTrait('show-alert', {
        label: 'Show Info Alert',
        default: true,
      }, rebuildSSNPattern),
      'alert-heading': createPatternAttributeTrait('alert-heading', {
        label: 'Alert Heading',
        default: 'Why we need this',
      }, rebuildSSNPattern),
      'alert-text': createPatternAttributeTrait('alert-text', {
        label: 'Alert Text',
        type: 'textarea',
        default: 'We use your Social Security Number to verify your identity. Your information is protected and encrypted.',
      }, rebuildSSNPattern),
    },
  });
}
