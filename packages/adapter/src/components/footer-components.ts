/**
 * Footer Components
 *
 * Registers the usa-footer component with variant, agency info,
 * contact details, logo, and section link traits.
 */

import type { ComponentRegistration, UnifiedTrait } from './shared-utils.js';

/**
 * Registry interface to avoid circular imports.
 */
interface RegistryLike {
  register(registration: ComponentRegistration): void;
}

export function registerFooterComponents(registry: RegistryLike): void {

/**
 * Helper function to rebuild footer sections array from attributes
 */
function rebuildFooterSections(element: HTMLElement, count: number): void {
  const sections: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [];

  for (let i = 1; i <= count; i++) {
    const title = element.getAttribute(`section${i}-title`) || `Section ${i}`;

    // Get links for this section (up to 4 links per section)
    const links: Array<{ label: string; href: string }> = [];
    for (let j = 1; j <= 4; j++) {
      const linkLabel = element.getAttribute(`section${i}-link${j}-label`);
      const linkHref = element.getAttribute(`section${i}-link${j}-href`) || '#';

      if (linkLabel) {
        links.push({ label: linkLabel, href: linkHref });
      }
    }

    sections.push({ title, links });
  }

  // Set the sections property on the Lit component
  (element as any).sections = sections;

  if (typeof (element as any).requestUpdate === 'function') {
    (element as any).requestUpdate();
  }
}

/**
 * Initialize footer sections with retry logic
 * Waits for the Lit component to be ready before setting sections
 */
function initFooterSections(element: HTMLElement): void {
  const variant = element.getAttribute('variant') || 'medium';

  // Only initialize sections for 'big' variant
  if (variant !== 'big') return;

  const count = parseInt(element.getAttribute('section-count') || '3', 10);

  const trySetSections = (attempt: number = 0): void => {
    // Check if the component is ready (has requestUpdate method)
    if (typeof (element as any).requestUpdate === 'function') {
      rebuildFooterSections(element, count);
    } else if (attempt < 20) {
      // Retry up to 20 times with 50ms delay (1 second total)
      setTimeout(() => trySetSections(attempt + 1), 50);
    }
  };

  // Try immediately
  trySetSections();
}

/**
 * Helper function to create footer section title trait
 */
function createFooterSectionTitleTrait(sectionNum: number): UnifiedTrait {
  const attrName = `section${sectionNum}-title`;
  const defaultValue = `Section ${sectionNum}`;

  // Visibility function - only show if sectionNum <= section-count
  const visibleFn = (component: any) => {
    try {
      if (!component) return false;
      const variant = component.get?.('attributes')?.['variant'] || 'medium';
      // Only 'big' variant shows sections
      if (variant !== 'big') return false;
      const count = parseInt(component.get?.('attributes')?.['section-count'] || '3', 10);
      return sectionNum <= count;
    } catch {
      return false;
    }
  };

  return {
    definition: {
      name: attrName,
      label: `Section ${sectionNum} Title`,
      type: 'text',
      default: defaultValue,
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: any) => {
        element.setAttribute(attrName, value || '');
        const count = parseInt(element.getAttribute('section-count') || '3', 10);
        rebuildFooterSections(element, count);
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) ?? defaultValue;
      },
    },
  };
}

/**
 * Helper function to create footer section link traits
 */
function createFooterSectionLinkTrait(
  sectionNum: number,
  linkNum: number,
  type: 'label' | 'href'
): UnifiedTrait {
  const attrName = `section${sectionNum}-link${linkNum}-${type}`;
  const isLabel = type === 'label';
  const defaultValue = isLabel ? (linkNum === 1 ? 'Link 1' : '') : '#';

  // Visibility function - only show if sectionNum <= section-count and variant is 'big'
  const visibleFn = (component: any) => {
    try {
      if (!component) return false;
      const variant = component.get?.('attributes')?.['variant'] || 'medium';
      if (variant !== 'big') return false;
      const count = parseInt(component.get?.('attributes')?.['section-count'] || '3', 10);
      return sectionNum <= count;
    } catch {
      return false;
    }
  };

  return {
    definition: {
      name: attrName,
      label: `S${sectionNum} Link ${linkNum} ${isLabel ? 'Text' : 'URL'}`,
      type: 'text',
      default: defaultValue,
      placeholder: isLabel ? 'Link text' : 'URL',
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: any) => {
        if (value) {
          element.setAttribute(attrName, value);
        } else {
          element.removeAttribute(attrName);
        }
        const count = parseInt(element.getAttribute('section-count') || '3', 10);
        rebuildFooterSections(element, count);
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) ?? defaultValue;
      },
    },
  };
}

/**
 * USA Footer Component
 *
 * Site footer with agency info and optional link sections.
 */
registry.register({
  tagName: 'usa-footer',
  droppable: false,

  traits: {
    // Variant
    variant: {
      definition: {
        name: 'variant',
        label: 'Variant',
        type: 'select',
        default: 'medium',
        options: [
          { id: 'slim', label: 'Slim' },
          { id: 'medium', label: 'Medium' },
          { id: 'big', label: 'Big (with sections)' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const variant = value || 'medium';
          element.setAttribute('variant', variant);
          (element as any).variant = variant;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).variant || element.getAttribute('variant') || 'medium';
        },
      },
    },

    // Agency Name
    'agency-name': {
      definition: {
        name: 'agency-name',
        label: 'Agency Name',
        type: 'text',
        default: 'Agency Name',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const name = value || 'Agency Name';
          element.setAttribute('agency-name', name);
          (element as any).agencyName = name;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).agencyName || element.getAttribute('agency-name') || 'Agency Name';
        },
      },
    },

    // Agency URL
    'agency-url': {
      definition: {
        name: 'agency-url',
        label: 'Agency URL',
        type: 'text',
        default: '#',
        placeholder: 'Agency website URL',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const url = value || '#';
          element.setAttribute('agency-url', url);
          (element as any).agencyUrl = url;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).agencyUrl || element.getAttribute('agency-url') || '#';
        },
      },
    },

    // Logo Source (optional)
    'logo-src': {
      definition: {
        name: 'logo-src',
        label: 'Logo Image URL',
        type: 'text',
        default: '',
        placeholder: 'Optional footer logo URL',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          if (value) {
            element.setAttribute('logo-src', value);
            (element as any).logoSrc = value;
          } else {
            element.removeAttribute('logo-src');
            (element as any).logoSrc = '';
          }
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).logoSrc || element.getAttribute('logo-src') || '';
        },
      },
    },

    // Logo Alt Text
    'logo-alt': {
      definition: {
        name: 'logo-alt',
        label: 'Logo Alt Text',
        type: 'text',
        default: '',
        placeholder: 'Alt text for logo',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          if (value) {
            element.setAttribute('logo-alt', value);
            (element as any).logoAlt = value;
          } else {
            element.removeAttribute('logo-alt');
            (element as any).logoAlt = '';
          }
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).logoAlt || element.getAttribute('logo-alt') || '';
        },
      },
    },

    // Contact Phone
    'contact-phone': {
      definition: {
        name: 'contact-phone',
        label: 'Contact Phone',
        type: 'text',
        default: '',
        placeholder: '(555) 555-5555',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          if (value) {
            element.setAttribute('contact-phone', value);
            (element as any).contactPhone = value;
          } else {
            element.removeAttribute('contact-phone');
            (element as any).contactPhone = '';
          }
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).contactPhone || element.getAttribute('contact-phone') || '';
        },
      },
    },

    // Contact Email
    'contact-email': {
      definition: {
        name: 'contact-email',
        label: 'Contact Email',
        type: 'text',
        default: '',
        placeholder: 'contact@agency.gov',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          if (value) {
            element.setAttribute('contact-email', value);
            (element as any).contactEmail = value;
          } else {
            element.removeAttribute('contact-email');
            (element as any).contactEmail = '';
          }
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).contactEmail || element.getAttribute('contact-email') || '';
        },
      },
    },

    // Section count (for 'big' variant)
    'section-count': {
      definition: {
        name: 'section-count',
        label: 'Number of Sections',
        type: 'select',
        default: '3',
        options: [
          { id: '1', label: '1 Section' },
          { id: '2', label: '2 Sections' },
          { id: '3', label: '3 Sections' },
          { id: '4', label: '4 Sections' },
        ],
        visible: (component: any) => {
          try {
            if (!component) return false;
            const variant = component.get?.('attributes')?.['variant'] || 'medium';
            return variant === 'big';
          } catch {
            return false;
          }
        },
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const count = parseInt(value || '3', 10);
          element.setAttribute('section-count', String(count));
          rebuildFooterSections(element, count);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('section-count') ?? '3';
        },
        onInit: (element: HTMLElement, _value: any) => {
          // Use retry logic to wait for Lit component to be ready
          initFooterSections(element);
        },
      },
    },

    // Section 1 traits
    'section1-title': createFooterSectionTitleTrait(1),
    'section1-link1-label': createFooterSectionLinkTrait(1, 1, 'label'),
    'section1-link1-href': createFooterSectionLinkTrait(1, 1, 'href'),
    'section1-link2-label': createFooterSectionLinkTrait(1, 2, 'label'),
    'section1-link2-href': createFooterSectionLinkTrait(1, 2, 'href'),
    'section1-link3-label': createFooterSectionLinkTrait(1, 3, 'label'),
    'section1-link3-href': createFooterSectionLinkTrait(1, 3, 'href'),
    'section1-link4-label': createFooterSectionLinkTrait(1, 4, 'label'),
    'section1-link4-href': createFooterSectionLinkTrait(1, 4, 'href'),

    // Section 2 traits
    'section2-title': createFooterSectionTitleTrait(2),
    'section2-link1-label': createFooterSectionLinkTrait(2, 1, 'label'),
    'section2-link1-href': createFooterSectionLinkTrait(2, 1, 'href'),
    'section2-link2-label': createFooterSectionLinkTrait(2, 2, 'label'),
    'section2-link2-href': createFooterSectionLinkTrait(2, 2, 'href'),
    'section2-link3-label': createFooterSectionLinkTrait(2, 3, 'label'),
    'section2-link3-href': createFooterSectionLinkTrait(2, 3, 'href'),
    'section2-link4-label': createFooterSectionLinkTrait(2, 4, 'label'),
    'section2-link4-href': createFooterSectionLinkTrait(2, 4, 'href'),

    // Section 3 traits
    'section3-title': createFooterSectionTitleTrait(3),
    'section3-link1-label': createFooterSectionLinkTrait(3, 1, 'label'),
    'section3-link1-href': createFooterSectionLinkTrait(3, 1, 'href'),
    'section3-link2-label': createFooterSectionLinkTrait(3, 2, 'label'),
    'section3-link2-href': createFooterSectionLinkTrait(3, 2, 'href'),
    'section3-link3-label': createFooterSectionLinkTrait(3, 3, 'label'),
    'section3-link3-href': createFooterSectionLinkTrait(3, 3, 'href'),
    'section3-link4-label': createFooterSectionLinkTrait(3, 4, 'label'),
    'section3-link4-href': createFooterSectionLinkTrait(3, 4, 'href'),

    // Section 4 traits
    'section4-title': createFooterSectionTitleTrait(4),
    'section4-link1-label': createFooterSectionLinkTrait(4, 1, 'label'),
    'section4-link1-href': createFooterSectionLinkTrait(4, 1, 'href'),
    'section4-link2-label': createFooterSectionLinkTrait(4, 2, 'label'),
    'section4-link2-href': createFooterSectionLinkTrait(4, 2, 'href'),
    'section4-link3-label': createFooterSectionLinkTrait(4, 3, 'label'),
    'section4-link3-href': createFooterSectionLinkTrait(4, 3, 'href'),
    'section4-link4-label': createFooterSectionLinkTrait(4, 4, 'label'),
    'section4-link4-href': createFooterSectionLinkTrait(4, 4, 'href'),
  },
});

}
