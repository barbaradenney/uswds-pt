/**
 * Trait Setup
 *
 * Registers custom traits: spacing, conditional show/hide, and
 * visibility (state/user checkbox groups).
 */

import { createDebugLogger } from '@uswds-pt/shared';
import { collectTargetableComponents } from './component-ids';
import { GJS_EVENTS } from '../../contracts';
import type { EditorInstance, RegisterListener } from './types';
import type {
  GrapesComponent,
  GrapesTrait,
  GrapesTraitCollection,
} from '../../../types/grapesjs';

const debug = createDebugLogger('GrapesJSSetup');

/** Payload delivered by the `trait:value` editor event. */
interface TraitValuePayload {
  trait: GrapesTrait | undefined;
  component: GrapesComponent | undefined;
}

/**
 * Set up spacing trait for all components
 */
export function setupSpacingTrait(
  editor: EditorInstance,
  registerListener: RegisterListener
): void {
  const spacingOptions = [
    { id: '', label: 'None' },
    { id: 'margin-top-1', label: '8px (1 unit)' },
    { id: 'margin-top-2', label: '16px (2 units)' },
    { id: 'margin-top-3', label: '24px (3 units)' },
    { id: 'margin-top-4', label: '32px (4 units)' },
    { id: 'margin-top-5', label: '40px (5 units)' },
    { id: 'margin-top-6', label: '48px (6 units)' },
    { id: 'margin-top-8', label: '64px (8 units)' },
    { id: 'margin-top-10', label: '80px (10 units)' },
  ];

  const updateSpacingClass = (component: GrapesComponent, newClass: string) => {
    const el = component.getEl();
    if (!el) return;
    const currentClasses = component.getClasses();
    const classesToRemove = currentClasses.filter((cls: string) =>
      cls.startsWith('margin-top-')
    );
    classesToRemove.forEach((cls: string) => component.removeClass(cls));
    if (newClass) component.addClass(newClass);
  };

  registerListener(editor, GJS_EVENTS.COMPONENT_SELECTED, (...args: unknown[]) => {
    const component = args[0] as GrapesComponent;
    const traits = component.get('traits') as GrapesTraitCollection;
    const hasSpacingTrait = traits.where({ name: 'top-spacing' }).length > 0;

    if (!hasSpacingTrait) {
      const currentClasses = component.getClasses();
      const currentMargin = currentClasses.find((cls: string) =>
        cls.startsWith('margin-top-')
      ) || '';

      traits.add({
        type: 'select',
        name: 'top-spacing',
        label: 'Top Spacing',
        default: currentMargin,
        options: spacingOptions,
        changeProp: false,
      });
    }
  });

  registerListener(editor, 'trait:value', (...args: unknown[]) => {
    const { trait, component } = args[0] as TraitValuePayload;
    if (trait?.get('name') !== 'top-spacing') return;
    if (!component) return;
    const value = (trait.getValue?.() ?? trait.get('value') ?? '') as string;
    updateSpacingClass(component, value);
  });
}

/**
 * Set up conditional show/hide trait with dynamic component picker
 */
export function setupConditionalShowHideTrait(
  editor: EditorInstance,
  registerListener: RegisterListener
): void {
  const updateConditionalTraits = (component: GrapesComponent) => {
    if (!component) return;

    const tagName = (component.get('tagName') as string | undefined)?.toLowerCase() || '';
    if (tagName !== 'usa-checkbox' && tagName !== 'usa-radio') return;

    // Remove IDs from trigger components to prevent USWDS duplicate ID issues
    const currentId =
      (component.getAttributes?.() as Record<string, unknown> | undefined)?.id ||
      (component.get('attributes') as Record<string, unknown> | undefined)?.id;
    if (currentId) {
      component.removeAttributes(['id']);
      const el = component.getEl?.();
      if (el) el.removeAttribute('id');
      debug('Removed ID from trigger component to prevent duplicate IDs');
    }

    const targetables = collectTargetableComponents(editor);
    const options = [
      { id: '', label: '-- None --' },
      ...targetables.map(t => ({ id: t.id, label: t.label })),
    ];

    const revealsTrait = component.getTrait?.('data-reveals');
    if (revealsTrait) revealsTrait.set('options', options);

    const hidesTrait = component.getTrait?.('data-hides');
    if (hidesTrait) hidesTrait.set('options', options);

    debug('Updated conditional traits with', targetables.length, 'targetable components');
  };

  registerListener(editor, GJS_EVENTS.COMPONENT_SELECTED, (...args: unknown[]) => {
    updateConditionalTraits(args[0] as GrapesComponent);
  });

  registerListener(editor, GJS_EVENTS.COMPONENT_ADD, () => {
    const selected = editor.getSelected?.();
    if (selected) updateConditionalTraits(selected);
  });

  registerListener(editor, GJS_EVENTS.COMPONENT_UPDATE, (...args: unknown[]) => {
    const property = args[1] as string | undefined;
    if (property === 'name') {
      const selected = editor.getSelected?.();
      if (selected) updateConditionalTraits(selected);
    }
  });
}

/**
 * Config for a generic visibility trait (states or users).
 */
export interface VisibilityTraitConfig {
  dataKey: string;
  traitName: string;
  traitLabel: string;
  dataAttribute: string;
  selectEvent: string;
  updateEvent: string;
}

/** Track whether the checkbox-group trait type has been registered */
let checkboxGroupRegistered = false;

/**
 * Set up a generic visibility trait for all components.
 */
export function setupVisibilityTrait(
  editor: EditorInstance,
  registerListener: RegisterListener,
  config: VisibilityTraitConfig
): void {
  if (!checkboxGroupRegistered) {
    checkboxGroupRegistered = true;

    editor.TraitManager.addType('checkbox-group', {
      createInput({ trait }: { trait: GrapesTrait }) {
        const el = document.createElement('div');
        el.className = 'trait-checkbox-group';
        const options: Array<{ id: string; label: string }> =
          (trait.get('options') as Array<{ id: string; label: string }>) || [];

        options.forEach((opt: { id: string; label: string }) => {
          const label = document.createElement('label');
          label.className = 'trait-checkbox-group-item';
          label.style.cssText = 'display: flex; align-items: center; gap: 6px; font-size: 0.8125rem; color: var(--color-base); cursor: pointer; padding: 2px 0;';

          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.value = opt.id;
          cb.style.cssText = 'width: 14px; height: 14px; accent-color: var(--color-primary);';
          cb.addEventListener('change', () => {
            el.dispatchEvent(new Event('change', { bubbles: true }));
          });

          label.appendChild(cb);
          label.appendChild(document.createTextNode(opt.label));
          el.appendChild(label);
        });

        return el;
      },

      onEvent({ elInput, component, trait }: { elInput: HTMLElement; component: GrapesComponent; trait: GrapesTrait }) {
        const dataAttr = (trait.get?.('dataAttribute') as string) || 'data-states';
        const checkboxes = elInput.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
        const checkedIds: string[] = [];
        checkboxes.forEach((cb) => {
          if (cb.checked) checkedIds.push(cb.value);
        });

        if (checkedIds.length === 0) {
          component.removeAttributes([dataAttr]);
        } else {
          component.addAttributes({ [dataAttr]: checkedIds.join(',') });
        }
      },

      onUpdate({ elInput, component, trait }: { elInput: HTMLElement; component: GrapesComponent; trait: GrapesTrait }) {
        const dataAttr = (trait.get?.('dataAttribute') as string) || 'data-states';
        const attrs = component.getAttributes() as Record<string, string>;
        const dataValue = attrs[dataAttr] || '';
        const activeIds = dataValue ? dataValue.split(',').map((s: string) => s.trim()) : [];
        const checkboxes = elInput.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
        checkboxes.forEach((cb) => {
          cb.checked = activeIds.includes(cb.value);
        });
      },
    });
  }

  const addVisibilityTrait = (component: GrapesComponent) => {
    if (!component) return;

    const items: Array<{ id: string; name: string }> = (() => {
      try {
        const instanceKey = config.dataKey === 'states' ? '__projectStates' : '__projectUsers';
        // The editor stores custom project arrays as dynamic properties.
        // Since EditorInstance is typed as `any` for SDK compatibility,
        // this access is intentionally unchecked.
        const instanceArr = (editor as Record<string, unknown>)[instanceKey];
        if (Array.isArray(instanceArr)) return instanceArr;
        const data = editor.getProjectData?.();
        const arr = data?.[config.dataKey];
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    })();

    if (items.length === 0) {
      const traits = component.get('traits') as GrapesTraitCollection;
      const existing = traits.where({ name: config.traitName });
      if (existing.length > 0) {
        existing.forEach((t: GrapesTrait) => traits.remove(t));
      }
      return;
    }

    const traits = component.get('traits') as GrapesTraitCollection;
    const hasTrait = traits.where({ name: config.traitName }).length > 0;

    if (hasTrait) {
      const existing = traits.where({ name: config.traitName })[0];
      if (existing) {
        existing.set('options', items.map(s => ({ id: s.id, label: s.name })));
      }
      return;
    }

    traits.add({
      type: 'checkbox-group',
      name: config.traitName,
      label: config.traitLabel,
      dataAttribute: config.dataAttribute,
      options: items.map(s => ({ id: s.id, label: s.name })),
      changeProp: false,
    });
  };

  registerListener(editor, GJS_EVENTS.COMPONENT_SELECTED, (...args: unknown[]) => {
    addVisibilityTrait(args[0] as GrapesComponent);
  });

  registerListener(editor, config.selectEvent, () => {
    const selected = editor.getSelected?.();
    if (selected) addVisibilityTrait(selected);
  });

  registerListener(editor, config.updateEvent, () => {
    const selected = editor.getSelected?.();
    if (selected) addVisibilityTrait(selected);
  });
}
