/**
 * Tests for GrapesJS Data Extractor
 *
 * Tests extraction of HTML and project data from GrapesJS editor instances,
 * including primary extraction, fallback paths, readiness checks,
 * content detection, and per-page HTML extraction.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractEditorData,
  isEditorReadyForExtraction,
  hasActualContent,
  extractPerPageHtml,
  isExtractingPerPageHtml,
} from './data-extractor';

// Mock the canvas-helpers module
vi.mock('./canvas-helpers', () => ({
  syncPageLinkHrefs: vi.fn(),
}));

// Mock the shared debug logger
vi.mock('@uswds-pt/shared', () => ({
  createDebugLogger: () => {
    const logger = (..._args: unknown[]) => {};
    return logger;
  },
}));

// ============================================================================
// Helpers
// ============================================================================

/**
 * Create a minimal mock GrapesJS page.
 */
function createMockPage(id: string, name: string, components: unknown[] = []) {
  return {
    getId: () => id,
    id,
    get: (key: string) => (key === 'name' ? name : undefined),
    getName: () => name,
    getMainFrame: () => ({
      getComponent: () => ({
        toJSON: () => ({
          type: 'wrapper',
          components,
        }),
      }),
    }),
    getMainComponent: () => ({
      toJSON: () => ({
        type: 'wrapper',
        components,
      }),
    }),
  };
}

/**
 * Create a mock GrapesJS editor with configurable behavior.
 */
function createMockEditor(overrides: {
  html?: string;
  projectData?: Record<string, unknown> | null;
  projectDataThrows?: Error;
  pages?: ReturnType<typeof createMockPage>[];
  wrapper?: Record<string, unknown>;
  styles?: unknown[];
  assets?: unknown[];
} = {}) {
  const pages = overrides.pages ?? [
    createMockPage('page-1', 'Home', [{ type: 'text', content: 'Hello' }]),
  ];

  let selectedPage = pages[0];

  const editor: Record<string, unknown> = {
    getHtml: vi.fn(() => overrides.html ?? '<div>Test content</div>'),
    getProjectData: vi.fn(() => {
      if (overrides.projectDataThrows) {
        throw overrides.projectDataThrows;
      }
      if (overrides.projectData === null) {
        return null;
      }
      return overrides.projectData ?? {
        pages: pages.map(p => ({
          id: p.getId(),
          name: p.getName(),
          frames: [{ component: { type: 'wrapper', components: [{ type: 'text', content: 'Hello' }] } }],
        })),
        styles: overrides.styles ?? [],
        assets: overrides.assets ?? [],
      };
    }),
    loadProjectData: vi.fn(),
    Pages: {
      getAll: vi.fn(() => pages),
      getSelected: vi.fn(() => selectedPage),
      select: vi.fn((page: typeof pages[0]) => { selectedPage = page; }),
    },
    DomComponents: {
      getWrapper: vi.fn(() =>
        overrides.wrapper ?? {
          toJSON: () => ({ type: 'wrapper', components: [] }),
        }
      ),
    },
    CssComposer: {
      getAll: vi.fn(() =>
        (overrides.styles ?? []).map(s => ({ toJSON: () => s }))
      ),
    },
    AssetManager: {
      getAll: vi.fn(() =>
        (overrides.assets ?? []).map(a => ({ toJSON: () => a }))
      ),
    },
    Canvas: {
      refresh: vi.fn(),
    },
  };

  return editor;
}

// ============================================================================
// isEditorReadyForExtraction
// ============================================================================

describe('isEditorReadyForExtraction', () => {
  it('should return false for null editor', () => {
    expect(isEditorReadyForExtraction(null)).toBe(false);
  });

  it('should return false for undefined editor', () => {
    expect(isEditorReadyForExtraction(undefined)).toBe(false);
  });

  it('should return false when Pages manager is missing', () => {
    const editor = { Pages: null };
    expect(isEditorReadyForExtraction(editor)).toBe(false);
  });

  it('should return false when Pages.getAll is not a function', () => {
    const editor = { Pages: { getAll: 'not a function' } };
    expect(isEditorReadyForExtraction(editor)).toBe(false);
  });

  it('should return false when no pages exist', () => {
    const editor = { Pages: { getAll: () => [] } };
    expect(isEditorReadyForExtraction(editor)).toBe(false);
  });

  it('should return true when pages exist', () => {
    const editor = createMockEditor();
    expect(isEditorReadyForExtraction(editor)).toBe(true);
  });

  it('should return true with multiple pages', () => {
    const editor = createMockEditor({
      pages: [
        createMockPage('p1', 'Page 1'),
        createMockPage('p2', 'Page 2'),
      ],
    });
    expect(isEditorReadyForExtraction(editor)).toBe(true);
  });
});

// ============================================================================
// hasActualContent
// ============================================================================

describe('hasActualContent', () => {
  it('should return false for undefined project data pages', () => {
    expect(hasActualContent({} as any)).toBe(false);
  });

  it('should return false for empty pages array', () => {
    expect(hasActualContent({ pages: [] })).toBe(false);
  });

  it('should return false for page with no frames', () => {
    expect(hasActualContent({ pages: [{ id: '1', name: 'P' }] } as any)).toBe(false);
  });

  it('should return false for page with empty components', () => {
    expect(
      hasActualContent({
        pages: [
          {
            id: '1',
            name: 'Page',
            frames: [{ component: { type: 'wrapper', components: [] } }],
          },
        ],
      })
    ).toBe(false);
  });

  it('should return true for page with components', () => {
    expect(
      hasActualContent({
        pages: [
          {
            id: '1',
            name: 'Page',
            frames: [
              {
                component: {
                  type: 'wrapper',
                  components: [{ type: 'text', content: 'Hello' }],
                },
              },
            ],
          },
        ],
      })
    ).toBe(true);
  });

  it('should only check the first page', () => {
    // First page is empty, second has content
    expect(
      hasActualContent({
        pages: [
          {
            id: '1',
            name: 'Empty',
            frames: [{ component: { type: 'wrapper', components: [] } }],
          },
          {
            id: '2',
            name: 'Has Content',
            frames: [
              {
                component: {
                  type: 'wrapper',
                  components: [{ type: 'text', content: 'Hi' }],
                },
              },
            ],
          },
        ],
      })
    ).toBe(false);
  });
});

// ============================================================================
// extractEditorData - Primary Path
// ============================================================================

describe('extractEditorData - primary path', () => {
  it('should return fallback when editor is null', () => {
    const result = extractEditorData(null, '<div>fallback</div>');

    expect(result.success).toBe(false);
    expect(result.html).toBe('<div>fallback</div>');
    expect(result.projectData.pages).toHaveLength(1);
    expect(result.warnings).toContain('Editor not initialized');
  });

  it('should extract HTML and project data successfully', () => {
    const editor = createMockEditor({
      html: '<div>My Content</div>',
      projectData: {
        pages: [
          {
            id: 'page-1',
            name: 'Home',
            frames: [
              { component: { type: 'wrapper', components: [{ type: 'text' }] } },
            ],
          },
        ],
        styles: [{ selectors: ['.test'], style: { color: 'red' } }],
        assets: [],
      },
    });

    const result = extractEditorData(editor);

    expect(result.html).toBe('<div>My Content</div>');
    expect(result.projectData.pages).toHaveLength(1);
    expect(result.projectData.pages[0].id).toBe('page-1');
    expect(result.projectData.pages[0].name).toBe('Home');
    expect(result.warnings).toHaveLength(0);
    expect(result.success).toBe(true);
  });

  it('should use fallback HTML when getHtml returns empty', () => {
    const editor = createMockEditor({ html: '' });

    const result = extractEditorData(editor, '<div>fallback</div>');

    expect(result.html).toBe('<div>fallback</div>');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes('fallback'))).toBe(true);
  });

  it('should handle getHtml throwing an error', () => {
    const editor = createMockEditor();
    (editor.getHtml as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Canvas not ready');
    });

    const result = extractEditorData(editor, '<div>safe</div>');

    expect(result.html).toBe('<div>safe</div>');
    expect(result.warnings.some(w => w.includes('Canvas not ready'))).toBe(true);
  });
});

// ============================================================================
// extractEditorData - Fallback Path
// ============================================================================

describe('extractEditorData - fallback path', () => {
  it('should fall back to state reconstruction when getProjectData throws', () => {
    const editor = createMockEditor({
      projectDataThrows: new Error("Cannot read property 'forEach' of undefined"),
    });

    const result = extractEditorData(editor);

    expect(result.projectData).toBeDefined();
    expect(result.projectData.pages).toBeDefined();
    expect(result.projectData.pages.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes('forEach'))).toBe(true);
  });

  it('should fall back when getProjectData returns null', () => {
    const editor = createMockEditor({ projectData: null });

    const result = extractEditorData(editor);

    expect(result.projectData).toBeDefined();
    expect(result.projectData.pages.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes('invalid structure'))).toBe(true);
  });

  it('should fall back when getProjectData returns object without pages', () => {
    const editor = createMockEditor({ projectData: { styles: [] } });

    const result = extractEditorData(editor);

    expect(result.projectData.pages.length).toBeGreaterThan(0);
  });

  it('should reconstruct pages from editor Pages manager in fallback', () => {
    const pages = [
      createMockPage('p1', 'Page 1', [{ type: 'heading' }]),
      createMockPage('p2', 'Page 2', [{ type: 'text' }]),
    ];

    const editor = createMockEditor({
      projectDataThrows: new Error('timing issue'),
      pages,
    });

    const result = extractEditorData(editor);

    expect(result.projectData.pages.length).toBe(2);
    expect(result.projectData.pages[0].id).toBe('p1');
    expect(result.projectData.pages[0].name).toBe('Page 1');
    expect(result.projectData.pages[1].id).toBe('p2');
    expect(result.projectData.pages[1].name).toBe('Page 2');
  });

  it('should fall back to DomComponents wrapper when no pages exist', () => {
    const editor = createMockEditor({
      projectDataThrows: new Error('error'),
      pages: [],
      wrapper: {
        toJSON: () => ({
          type: 'wrapper',
          components: [{ type: 'text', content: 'fallback' }],
        }),
      },
    });
    // Override getAll to return empty
    (editor.Pages as any).getAll.mockReturnValue([]);

    const result = extractEditorData(editor);

    expect(result.projectData.pages.length).toBe(1);
    expect(result.projectData.pages[0].name).toBe('Page 1');
  });
});

// ============================================================================
// extractEditorData - Normalization
// ============================================================================

describe('extractEditorData - normalization', () => {
  it('should ensure styles array exists', () => {
    const editor = createMockEditor({
      projectData: {
        pages: [
          {
            id: 'p1',
            name: 'Home',
            frames: [{ component: { type: 'wrapper', components: [] } }],
          },
        ],
      },
    });

    const result = extractEditorData(editor);
    expect(Array.isArray(result.projectData.styles)).toBe(true);
  });

  it('should ensure assets array exists', () => {
    const editor = createMockEditor({
      projectData: {
        pages: [
          {
            id: 'p1',
            name: 'Home',
            frames: [{ component: { type: 'wrapper', components: [] } }],
          },
        ],
      },
    });

    const result = extractEditorData(editor);
    expect(Array.isArray(result.projectData.assets)).toBe(true);
  });
});

// ============================================================================
// extractPerPageHtml
// ============================================================================

describe('extractPerPageHtml', () => {
  it('should skip extraction for single-page projects', () => {
    const editor = createMockEditor();
    const projectData = {
      pages: [
        {
          id: 'page-1',
          name: 'Home',
          frames: [{ component: { type: 'wrapper', components: [] } }],
        },
      ],
      styles: [],
      assets: [],
    };

    extractPerPageHtml(editor, projectData);

    // Should not have selected any pages (no iteration needed)
    expect((editor.Pages as any).select).not.toHaveBeenCalled();
  });

  it('should extract HTML for each page in multi-page projects', () => {
    const page1 = createMockPage('p1', 'Home');
    const page2 = createMockPage('p2', 'About');
    const pages = [page1, page2];

    const editor = createMockEditor({ pages });
    let callCount = 0;
    (editor.getHtml as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      return `<div>Page ${callCount} HTML</div>`;
    });

    const projectData = {
      pages: [
        { id: 'p1', name: 'Home', frames: [{ component: { type: 'wrapper', components: [] } }] },
        { id: 'p2', name: 'About', frames: [{ component: { type: 'wrapper', components: [] } }] },
      ],
      styles: [],
      assets: [],
    };

    extractPerPageHtml(editor, projectData);

    // Should have extracted HTML for each page
    expect((projectData.pages[0] as any).htmlContent).toBe('<div>Page 1 HTML</div>');
    expect((projectData.pages[1] as any).htmlContent).toBe('<div>Page 2 HTML</div>');
  });

  it('should restore original page selection after extraction', () => {
    const page1 = createMockPage('p1', 'Home');
    const page2 = createMockPage('p2', 'About');
    const pages = [page1, page2];

    const editor = createMockEditor({ pages });

    // Simulate page2 being currently selected
    (editor.Pages as any).getSelected.mockReturnValue(page2);

    const projectData = {
      pages: [
        { id: 'p1', name: 'Home', frames: [{ component: { type: 'wrapper', components: [] } }] },
        { id: 'p2', name: 'About', frames: [{ component: { type: 'wrapper', components: [] } }] },
      ],
      styles: [],
      assets: [],
    };

    extractPerPageHtml(editor, projectData);

    // Last select call should restore page2
    const selectCalls = (editor.Pages as any).select.mock.calls;
    expect(selectCalls[selectCalls.length - 1][0]).toBe(page2);
  });

  it('should not set _extractingPerPageHtml flag after completion', () => {
    const pages = [createMockPage('p1', 'Home'), createMockPage('p2', 'About')];
    const editor = createMockEditor({ pages });

    const projectData = {
      pages: [
        { id: 'p1', name: 'Home', frames: [{ component: { type: 'wrapper', components: [] } }] },
        { id: 'p2', name: 'About', frames: [{ component: { type: 'wrapper', components: [] } }] },
      ],
      styles: [],
      assets: [],
    };

    extractPerPageHtml(editor, projectData);

    expect(isExtractingPerPageHtml()).toBe(false);
  });

  it('should reset flag even if extraction throws', () => {
    const pages = [createMockPage('p1', 'Home'), createMockPage('p2', 'About')];
    const editor = createMockEditor({ pages });

    (editor.getHtml as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Extraction error');
    });

    const projectData = {
      pages: [
        { id: 'p1', name: 'Home', frames: [{ component: { type: 'wrapper', components: [] } }] },
        { id: 'p2', name: 'About', frames: [{ component: { type: 'wrapper', components: [] } }] },
      ],
      styles: [],
      assets: [],
    };

    expect(() => extractPerPageHtml(editor, projectData)).toThrow();
    expect(isExtractingPerPageHtml()).toBe(false);
  });

  it('should handle missing Pages manager gracefully', () => {
    const editor = { Pages: null, getHtml: vi.fn() };
    const projectData = {
      pages: [
        { id: 'p1', name: 'Home', frames: [{ component: { type: 'wrapper', components: [] } }] },
        { id: 'p2', name: 'About', frames: [{ component: { type: 'wrapper', components: [] } }] },
      ],
      styles: [],
      assets: [],
    };

    // Should not throw
    extractPerPageHtml(editor, projectData);
  });
});

// ============================================================================
// extractEditorData - Integration with extractPerPageHtml
// ============================================================================

describe('extractEditorData - multi-page integration', () => {
  it('should call extractPerPageHtml for multi-page projects', () => {
    const pages = [
      createMockPage('p1', 'Home', [{ type: 'text' }]),
      createMockPage('p2', 'About', [{ type: 'heading' }]),
    ];

    const editor = createMockEditor({
      pages,
      projectData: {
        pages: [
          { id: 'p1', name: 'Home', frames: [{ component: { type: 'wrapper', components: [{ type: 'text' }] } }] },
          { id: 'p2', name: 'About', frames: [{ component: { type: 'wrapper', components: [{ type: 'heading' }] } }] },
        ],
        styles: [],
        assets: [],
      },
    });

    let htmlCallCount = 0;
    (editor.getHtml as ReturnType<typeof vi.fn>).mockImplementation(() => {
      htmlCallCount++;
      return `<div>Page ${htmlCallCount}</div>`;
    });

    const result = extractEditorData(editor);

    // The first call is for the primary HTML extraction,
    // then two more for per-page extraction
    expect(htmlCallCount).toBe(3);
    expect(result.projectData.pages).toHaveLength(2);
  });

  it('should handle extractPerPageHtml failure gracefully', () => {
    const pages = [
      createMockPage('p1', 'Home'),
      createMockPage('p2', 'About'),
    ];

    const editor = createMockEditor({ pages });
    let callCount = 0;
    (editor.getHtml as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      if (callCount > 1) {
        throw new Error('Canvas frame error');
      }
      return '<div>Primary HTML</div>';
    });

    const result = extractEditorData(editor);

    // Should still succeed (per-page extraction is best-effort)
    expect(result.html).toBe('<div>Primary HTML</div>');
    expect(result.projectData.pages.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes('Per-page HTML extraction failed'))).toBe(true);
  });
});
