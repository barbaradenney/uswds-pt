/**
 * GrapesJS Editor Mock for Testing
 *
 * Provides a mock implementation of the GrapesJS editor API
 * for use in unit and integration tests.
 */

import { vi } from 'vitest';

/**
 * Mock component type
 */
export interface MockComponent {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  getEl: ReturnType<typeof vi.fn>;
  getId: ReturnType<typeof vi.fn>;
  toJSON: ReturnType<typeof vi.fn>;
  components: ReturnType<typeof vi.fn>;
  getClasses: ReturnType<typeof vi.fn>;
  addClass: ReturnType<typeof vi.fn>;
  removeClass: ReturnType<typeof vi.fn>;
  getTrait: ReturnType<typeof vi.fn>;
  getAttributes: ReturnType<typeof vi.fn>;
  addAttributes: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock component
 */
export function createMockComponent(overrides: Partial<MockComponent> = {}): MockComponent {
  const childComponents: MockComponent[] = [];

  const component: MockComponent = {
    get: vi.fn((prop: string) => {
      if (prop === 'type') return 'default';
      if (prop === 'tagName') return 'div';
      if (prop === 'attributes') return {};
      return undefined;
    }),
    set: vi.fn(),
    getEl: vi.fn(() => document.createElement('div')),
    getId: vi.fn(() => `component-${Math.random().toString(36).slice(2)}`),
    toJSON: vi.fn(() => ({
      type: 'default',
      tagName: 'div',
      components: [],
    })),
    components: vi.fn(() => ({
      models: childComponents,
      length: childComponents.length,
      add: vi.fn((comp: MockComponent) => childComponents.push(comp)),
      reset: vi.fn(() => childComponents.length = 0),
      at: vi.fn((index: number) => childComponents[index]),
      forEach: vi.fn((fn: (c: MockComponent) => void) => childComponents.forEach(fn)),
      map: vi.fn((fn: (c: MockComponent) => unknown) => childComponents.map(fn)),
      filter: vi.fn((fn: (c: MockComponent) => boolean) => childComponents.filter(fn)),
    })),
    getClasses: vi.fn(() => []),
    addClass: vi.fn(),
    removeClass: vi.fn(),
    getTrait: vi.fn(() => null),
    getAttributes: vi.fn(() => ({})),
    addAttributes: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  };

  return component;
}

/**
 * Mock page type
 */
export interface MockPage {
  getId: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  getName: ReturnType<typeof vi.fn>;
  getMainComponent: ReturnType<typeof vi.fn>;
  getMainFrame: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock page
 */
export function createMockPage(
  id = 'page-1',
  name = 'Test Page',
  mainComponent?: MockComponent
): MockPage {
  const component = mainComponent || createMockComponent();

  return {
    getId: vi.fn(() => id),
    get: vi.fn((prop: string) => {
      if (prop === 'name') return name;
      if (prop === 'frames') return [{ get: vi.fn(() => component) }];
      return undefined;
    }),
    getName: vi.fn(() => name),
    getMainComponent: vi.fn(() => component),
    getMainFrame: vi.fn(() => ({
      getComponent: vi.fn(() => component),
    })),
  };
}

/**
 * Mock GrapesJS editor type
 */
export interface MockEditor {
  getHtml: ReturnType<typeof vi.fn>;
  getProjectData: ReturnType<typeof vi.fn>;
  loadProjectData: ReturnType<typeof vi.fn>;
  refresh: ReturnType<typeof vi.fn>;
  trigger: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  getSelected: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  Pages: {
    getAll: ReturnType<typeof vi.fn>;
    getSelected: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    add: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  DomComponents: {
    getWrapper: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };
  Canvas: {
    refresh: ReturnType<typeof vi.fn>;
    getFrame: ReturnType<typeof vi.fn>;
    getFrameEl: ReturnType<typeof vi.fn>;
    getDocument: ReturnType<typeof vi.fn>;
    getWindow: ReturnType<typeof vi.fn>;
  };
  Blocks: {
    getAll: ReturnType<typeof vi.fn>;
    add: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };
  Commands: {
    run: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    isActive: ReturnType<typeof vi.fn>;
    add: ReturnType<typeof vi.fn>;
  };
  Storage: {
    load: ReturnType<typeof vi.fn>;
    store: ReturnType<typeof vi.fn>;
  };
  Modal: {
    open: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };
  CssComposer: {
    getAll: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };
  AssetManager: {
    getAll: ReturnType<typeof vi.fn>;
    add: ReturnType<typeof vi.fn>;
  };
}

/**
 * Create a mock GrapesJS editor
 */
export function createMockEditor(overrides: Partial<MockEditor> = {}): MockEditor {
  const pages: MockPage[] = [createMockPage()];
  const wrapper = createMockComponent();
  const eventHandlers = new Map<string, Set<(...args: unknown[]) => void>>();

  const editor: MockEditor = {
    getHtml: vi.fn(() => '<div>Test content</div>'),

    getProjectData: vi.fn(() => ({
      pages: pages.map((p) => ({
        id: p.getId(),
        name: p.getName(),
        frames: [
          {
            component: p.getMainComponent()?.toJSON() || { type: 'wrapper', components: [] },
          },
        ],
      })),
      styles: [],
      assets: [],
    })),

    loadProjectData: vi.fn(),

    refresh: vi.fn(),

    trigger: vi.fn((event: string, ...args: unknown[]) => {
      const handlers = eventHandlers.get(event);
      if (handlers) {
        handlers.forEach((handler) => handler(...args));
      }
    }),

    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set());
      }
      eventHandlers.get(event)!.add(handler);
    }),

    off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      eventHandlers.get(event)?.delete(handler);
    }),

    getSelected: vi.fn(() => null),
    select: vi.fn(),

    Pages: {
      getAll: vi.fn(() => pages),
      getSelected: vi.fn(() => pages[0]),
      select: vi.fn(),
      get: vi.fn((id: string) => pages.find((p) => p.getId() === id)),
      add: vi.fn((pageConfig: { name?: string; id?: string }) => {
        const newPage = createMockPage(
          pageConfig.id || `page-${pages.length + 1}`,
          pageConfig.name || `Page ${pages.length + 1}`
        );
        pages.push(newPage);
        return newPage;
      }),
      remove: vi.fn((id: string) => {
        const index = pages.findIndex((p) => p.getId() === id);
        if (index > -1) {
          pages.splice(index, 1);
        }
      }),
    },

    DomComponents: {
      getWrapper: vi.fn(() => wrapper),
      clear: vi.fn(() => {
        const components = wrapper.components();
        components.reset();
      }),
    },

    Canvas: {
      refresh: vi.fn(),
      getFrame: vi.fn(() => ({
        view: { el: document.createElement('iframe') },
      })),
      getFrameEl: vi.fn(() => {
        const iframe = document.createElement('iframe');
        // Create a minimal document structure
        Object.defineProperty(iframe, 'contentDocument', {
          value: {
            head: document.createElement('head'),
            body: document.createElement('body'),
            createElement: document.createElement.bind(document),
            querySelector: vi.fn(() => null),
            querySelectorAll: vi.fn(() => []),
          },
        });
        return iframe;
      }),
      getDocument: vi.fn(() => ({
        head: document.createElement('head'),
        body: document.createElement('body'),
        createElement: document.createElement.bind(document),
        querySelector: vi.fn(() => null),
        querySelectorAll: vi.fn(() => []),
      })),
      getWindow: vi.fn(() => ({
        customElements: {
          get: vi.fn(() => undefined),
          define: vi.fn(),
        },
      })),
    },

    Blocks: {
      getAll: vi.fn(() => []),
      add: vi.fn(),
      remove: vi.fn(),
      get: vi.fn(() => null),
    },

    Commands: {
      run: vi.fn(),
      stop: vi.fn(),
      isActive: vi.fn(() => false),
      add: vi.fn(),
    },

    Storage: {
      load: vi.fn(() => ({})),
      store: vi.fn(),
    },

    Modal: {
      open: vi.fn(),
      close: vi.fn(),
    },

    CssComposer: {
      getAll: vi.fn(() => []),
      clear: vi.fn(),
    },

    AssetManager: {
      getAll: vi.fn(() => []),
      add: vi.fn(),
    },

    ...overrides,
  };

  return editor;
}

/**
 * Helper to simulate editor events
 */
export function triggerEditorEvent(editor: MockEditor, event: string, ...args: unknown[]) {
  editor.trigger(event, ...args);
}

/**
 * Helper to add content to mock editor
 */
export function setMockEditorContent(editor: MockEditor, html: string, projectData?: object) {
  editor.getHtml.mockReturnValue(html);

  if (projectData) {
    editor.getProjectData.mockReturnValue(projectData);
  }
}

/**
 * Helper to simulate page switch
 */
export function simulatePageSwitch(editor: MockEditor, pageId: string) {
  const page = editor.Pages.get(pageId);
  if (page) {
    editor.Pages.select(page);
    triggerEditorEvent(editor, 'page:select', page);
  }
}

/**
 * Helper to simulate component changes
 */
export function simulateComponentChange(editor: MockEditor, changeType: 'add' | 'remove' | 'update') {
  const component = createMockComponent();
  triggerEditorEvent(editor, `component:${changeType}`, component);
}
