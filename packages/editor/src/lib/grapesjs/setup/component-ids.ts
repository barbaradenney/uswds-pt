/**
 * Component ID Generation & Collection
 *
 * Handles automatic ID assignment, label extraction, and collection of
 * targetable components for conditional show/hide dropdowns.
 */

import { createDebugLogger } from '@uswds-pt/shared';
import { isExtractingPerPageHtml } from '../data-extractor';
import type { EditorInstance, RegisterListener } from './types';

const debug = createDebugLogger('GrapesJSSetup');

/**
 * Get a friendly label for a component
 * Priority: Layer name > label attribute > name attribute > content > heading
 */
export function getComponentLabel(component: any): string {
  const layerName = component.getName?.() || component.get?.('name');
  if (layerName && typeof layerName === 'string') {
    const tagName = component.get?.('tagName')?.toLowerCase() || '';
    const autoNames = ['box', 'text', 'section', 'container', 'wrapper', 'div', 'row', 'cell'];
    const isAutoName = autoNames.some(auto =>
      layerName.toLowerCase() === auto ||
      layerName.toLowerCase() === tagName.replace('usa-', '').replace(/-/g, ' ')
    );
    if (!isAutoName) return layerName;
  }

  const label = component.getAttributes?.()?.label
    || component.get?.('attributes')?.label;
  if (label) return label;

  const name = component.getAttributes?.()?.name
    || component.get?.('attributes')?.name;
  if (name) return name;

  const text = component.get?.('content');
  if (text && text.length < 30) return text;

  const heading = component.getAttributes?.()?.heading
    || component.get?.('attributes')?.heading;
  if (heading) return heading;

  return '';
}

/**
 * Get a friendly type name for a component
 */
export function getComponentTypeName(tagName: string): string {
  const typeMap: Record<string, string> = {
    'usa-text-input': 'Text Input',
    'usa-textarea': 'Textarea',
    'usa-select': 'Select',
    'usa-checkbox': 'Checkbox',
    'usa-radio': 'Radio',
    'usa-date-picker': 'Date Picker',
    'usa-time-picker': 'Time Picker',
    'usa-file-input': 'File Input',
    'usa-combo-box': 'Combo Box',
    'usa-range-slider': 'Range Slider',
    'usa-card': 'Card',
    'usa-alert': 'Alert',
    'usa-accordion': 'Accordion',
    'fieldset': 'Fieldset',
    'form': 'Form',
    'div': 'Container',
    'section': 'Section',
    'article': 'Article',
    'aside': 'Aside',
    'main': 'Main',
    'nav': 'Navigation',
    'span': 'Span',
    'p': 'Paragraph',
    'h1': 'Heading 1',
    'h2': 'Heading 2',
    'h3': 'Heading 3',
    'h4': 'Heading 4',
    'h5': 'Heading 5',
    'h6': 'Heading 6',
  };
  return typeMap[tagName.toLowerCase()] || tagName.replace('usa-', '').replace(/-/g, ' ');
}

/**
 * Generate a unique ID for a component if it doesn't have one
 */
export function ensureComponentId(component: any, allIds: Set<string>, editor?: EditorInstance): string {
  const currentId = component.getAttributes?.()?.id || component.get?.('attributes')?.id;
  if (currentId && currentId.length > 0) return currentId;

  const tagName = component.get?.('tagName')?.toLowerCase() || 'element';
  const label = getComponentLabel(component);

  let baseId = label
    ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : tagName.replace('usa-', '');

  if (!baseId) baseId = 'element';

  let finalId = baseId;
  let counter = 1;
  while (allIds.has(finalId) && counter <= 10000) {
    finalId = `${baseId}-${counter}`;
    counter++;
  }

  allIds.add(finalId);

  try {
    if (component.addAttributes) {
      component.addAttributes({ id: finalId });
    }

    const currentAttrs = component.get?.('attributes') || {};
    if (!currentAttrs.id || currentAttrs.id !== finalId) {
      component.set?.('attributes', { ...currentAttrs, id: finalId }, { silent: false });
    }

    const el = component.getEl?.();
    if (el) el.setAttribute('id', finalId);

    const view = component.view;
    if (view?.el) view.el.setAttribute('id', finalId);

    const idTrait = component.getTrait?.('id');
    if (idTrait) idTrait.set('value', finalId);

    if (editor) {
      editor.trigger?.('component:update', component);
      editor.trigger?.('component:update:attributes', component);
    }

    debug('Generated and set ID for component:', finalId, '- tagName:', tagName);
  } catch (err) {
    debug('Failed to set component ID:', err);
  }

  return finalId;
}

/**
 * Collect all targetable components from the editor
 */
export function collectTargetableComponents(editor: EditorInstance): Array<{ id: string; label: string; component: any }> {
  const result: Array<{ id: string; label: string; component: any }> = [];
  const allIds = new Set<string>();

  const targetableTypes = [
    'usa-text-input', 'usa-textarea', 'usa-select',
    'usa-date-picker', 'usa-time-picker', 'usa-file-input',
    'usa-combo-box', 'usa-range-slider',
    'usa-card', 'usa-alert', 'usa-accordion',
    'fieldset', 'form', 'div', 'section', 'article', 'aside',
    'main', 'nav', 'p', 'span',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  ];

  const hasCustomLayerName = (comp: any): boolean => {
    const layerName = comp.getName?.() || comp.get?.('name');
    if (!layerName || typeof layerName !== 'string') return false;
    const tagName = comp.get?.('tagName')?.toLowerCase() || '';
    const autoNames = ['box', 'text', 'section', 'container', 'wrapper', 'div', 'row', 'cell', 'body', 'form'];
    return !autoNames.some(auto =>
      layerName.toLowerCase() === auto ||
      layerName.toLowerCase() === tagName.replace('usa-', '').replace(/-/g, ' ')
    );
  };

  const wrapper = editor.DomComponents?.getWrapper?.();
  if (!wrapper) return result;

  const collectExistingIds = (comp: any) => {
    const id = comp.getAttributes?.()?.id || comp.get?.('attributes')?.id;
    if (id) allIds.add(id);
    const children = comp.components?.();
    if (children) children.forEach((child: any) => collectExistingIds(child));
  };
  collectExistingIds(wrapper);

  const collectComponents = (comp: any) => {
    const tagName = comp.get?.('tagName')?.toLowerCase() || '';
    const isTargetableType = targetableTypes.includes(tagName);
    const hasCustomName = hasCustomLayerName(comp);

    if (isTargetableType || hasCustomName) {
      const id = ensureComponentId(comp, allIds, editor);
      const label = getComponentLabel(comp);
      const typeName = getComponentTypeName(tagName);
      const displayLabel = label ? `${typeName} - ${label}` : typeName;
      result.push({ id, label: displayLabel, component: comp });
    }

    const children = comp.components?.();
    if (children) children.forEach((child: any) => collectComponents(child));
  };
  collectComponents(wrapper);

  return result;
}

/**
 * Clean up IDs from existing checkbox/radio triggers on editor load
 */
export function cleanupTriggerComponentIds(editor: EditorInstance): void {
  const wrapper = editor.DomComponents?.getWrapper?.();
  if (!wrapper) return;

  let cleanedCount = 0;

  const cleanupComponent = (comp: any) => {
    const tagName = comp.get?.('tagName')?.toLowerCase() || '';
    if (tagName === 'usa-checkbox' || tagName === 'usa-radio') {
      const attrs = comp.getAttributes?.() || {};
      if ((attrs['data-reveals'] || attrs['data-hides']) && attrs.id) {
        comp.removeAttributes?.(['id']);
        const el = comp.getEl?.();
        if (el) el.removeAttribute('id');
        cleanedCount++;
      }
    }
    const children = comp.components?.();
    if (children) children.forEach((child: any) => cleanupComponent(child));
  };

  cleanupComponent(wrapper);
  if (cleanedCount > 0) {
    debug('Cleaned up IDs from', cleanedCount, 'trigger components');
  }
}

/**
 * Set up proactive ID assignment for targetable components
 */
export function setupProactiveIdAssignment(
  editor: EditorInstance,
  registerListener: RegisterListener
): void {
  const targetableTypes = [
    'usa-text-input', 'usa-textarea', 'usa-select',
    'usa-date-picker', 'usa-time-picker', 'usa-file-input',
    'usa-combo-box', 'usa-range-slider',
    'usa-card', 'usa-alert', 'usa-accordion', 'fieldset',
  ];

  const getAllExistingIds = (): Set<string> => {
    const ids = new Set<string>();
    const wrapper = editor.DomComponents?.getWrapper?.();
    if (!wrapper) return ids;

    const collectIds = (comp: any) => {
      const id = comp.getAttributes?.()?.id || comp.get?.('attributes')?.id;
      if (id) ids.add(id);
      const children = comp.components?.();
      if (children) children.forEach((child: any) => collectIds(child));
    };
    collectIds(wrapper);
    return ids;
  };

  const assignIdIfNeeded = (component: any) => {
    if (!component?.get) return;
    const tagName = component.get?.('tagName')?.toLowerCase() || '';
    if (!targetableTypes.includes(tagName)) return;
    const currentId = component.getAttributes?.()?.id || component.get?.('attributes')?.id;
    if (currentId && currentId.length > 0) return;
    const allIds = getAllExistingIds();
    ensureComponentId(component, allIds, editor);
  };

  const processAllComponents = () => {
    const wrapper = editor.DomComponents?.getWrapper?.();
    if (!wrapper) return;
    const processComponent = (comp: any) => {
      assignIdIfNeeded(comp);
      const children = comp.components?.();
      if (children) children.forEach((child: any) => processComponent(child));
    };
    processComponent(wrapper);
    debug('Processed all components for ID assignment');
  };

  registerListener(editor, 'component:add', (component: any) => {
    requestAnimationFrame(() => {
      if (!component?.get) return;
      assignIdIfNeeded(component);
    });
  });

  let pendingRaf: number | null = null;
  const scheduleIdProcessing = () => {
    if (pendingRaf !== null) cancelAnimationFrame(pendingRaf);
    pendingRaf = requestAnimationFrame(() => {
      pendingRaf = null;
      processAllComponents();
    });
  };

  registerListener(editor, 'load', scheduleIdProcessing);
  registerListener(editor, 'canvas:frame:load', () => {
    if (!isExtractingPerPageHtml()) scheduleIdProcessing();
  });
  registerListener(editor, 'page:select', scheduleIdProcessing);
}
