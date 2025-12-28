import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Prototype } from '@uswds-pt/shared';
import { authFetch } from '../hooks/useAuth';
import { ExportModal } from './ExportModal';
import { openPreviewInNewTab } from '../lib/export';
import {
  DEFAULT_CONTENT,
  COMPONENT_ICONS,
  CDN_URLS,
  WebComponentTraitManager,
  componentRegistry,
} from '@uswds-pt/adapter';
import StudioEditor from '@grapesjs/studio-sdk/react';
import '@grapesjs/studio-sdk/style';
import { tableComponent } from '@grapesjs/studio-sdk-plugins';

// Debug logging flag
const DEBUG = false; // Set to true for verbose logging

function debug(...args: any[]): void {
  if (DEBUG) {
    console.log('[USWDS-PT]', ...args);
  }
}

// Create a GrapesJS plugin to register USWDS component types
// Plugins are loaded before the editor parses content, ensuring our types are available
const uswdsComponentsPlugin = (editor: any) => {
  const Components = editor.Components || editor.DomComponents;

  if (!Components) {
    console.error('USWDS-PT: Could not find Components API on editor');
    return;
  }

  debug('Registering component types via plugin...');

  // Register component types from componentRegistry
  const registeredComponents = componentRegistry.getAll();

  for (const registration of registeredComponents) {
    // Get trait definitions for GrapesJS
    const traitDefinitions = componentRegistry.getTraitDefinitions(registration.tagName);

    // Build default values from trait defaults
    const traitDefaults: Record<string, any> = {};
    traitDefinitions.forEach(trait => {
      if (trait.default !== undefined) {
        traitDefaults[trait.name] = trait.default;
      }
    });

    Components.addType(registration.tagName, {
      // Match any element with this tag name
      isComponent: (el: HTMLElement) => el.tagName?.toLowerCase() === registration.tagName,

      model: {
        defaults: {
          tagName: registration.tagName,
          draggable: true,
          droppable: registration.droppable ?? false,
          // Define the traits that will show in the properties panel
          traits: traitDefinitions,
          // Set default attribute values from traits (must be in attributes object)
          attributes: traitDefaults,
          // Web components handle their own rendering
          components: false,
        },
      },
    });
  }

  debug('Component types registered successfully');

  // Initialize WebComponentTraitManager to handle trait ↔ web component sync
  debug('Initializing WebComponentTraitManager...');
  const traitManager = new WebComponentTraitManager(editor);

  // Note: Component configurations now auto-registered via componentRegistry
  // No need to call registerComponents - the WebComponentTraitManager will
  // automatically check componentRegistry.getTraitHandlers() via backward compatibility

  debug('WebComponentTraitManager initialized (using componentRegistry)');

  // Handle the special case of select options
  editor.on('component:update:options-json', (model: any) => {
    try {
      const jsonStr = model.get('attributes')['options-json'];
      if (jsonStr) {
        const options = JSON.parse(jsonStr);
        const el = model.getEl();
        if (el) {
          el.options = options;
        }
      }
    } catch (e) {
      console.warn('Invalid options JSON:', e);
    }
  });
};

// Plugin to apply USWDS styling to tables created by tableComponent
const uswdsTablePlugin = (editor: any) => {
  const Components = editor.Components || editor.DomComponents;

  // Extend the table component type to add USWDS class and traits
  const originalTableType = Components.getType('table');
  if (originalTableType) {
    Components.addType('table', {
      model: {
        defaults: {
          ...originalTableType.model?.prototype?.defaults,
          classes: ['usa-table'],
          traits: [
            {
              name: 'table-variant',
              label: 'Variant',
              type: 'select',
              default: 'default',
              options: [
                { id: 'default', label: 'Default' },
                { id: 'borderless', label: 'Borderless' },
              ],
            },
            {
              name: 'table-striped',
              label: 'Striped Rows',
              type: 'checkbox',
              default: false,
            },
            {
              name: 'table-compact',
              label: 'Compact',
              type: 'checkbox',
              default: false,
            },
            {
              name: 'table-stacked',
              label: 'Stacked (Mobile)',
              type: 'select',
              default: 'none',
              options: [
                { id: 'none', label: 'None' },
                { id: 'stacked', label: 'Always Stacked' },
                { id: 'stacked-header', label: 'Stacked with Header' },
              ],
            },
          ],
        },
        init(this: any) {
          // Apply USWDS class on init
          this.addClass('usa-table');

          // Listen for trait changes
          this.on('change:attributes:table-variant', this.updateTableClasses);
          this.on('change:attributes:table-striped', this.updateTableClasses);
          this.on('change:attributes:table-compact', this.updateTableClasses);
          this.on('change:attributes:table-stacked', this.updateTableClasses);
        },
        updateTableClasses(this: any) {
          const attrs = this.getAttributes();
          const classes = ['usa-table'];

          if (attrs['table-variant'] === 'borderless') {
            classes.push('usa-table--borderless');
          }
          if (attrs['table-striped'] === true || attrs['table-striped'] === 'true') {
            classes.push('usa-table--striped');
          }
          if (attrs['table-compact'] === true || attrs['table-compact'] === 'true') {
            classes.push('usa-table--compact');
          }
          if (attrs['table-stacked'] === 'stacked') {
            classes.push('usa-table--stacked');
          } else if (attrs['table-stacked'] === 'stacked-header') {
            classes.push('usa-table--stacked-header');
          }

          // Update classes
          this.setClass(classes);
        },
      },
    });
  }

  debug('USWDS table styling plugin initialized');
};

// License key from environment variable
const LICENSE_KEY = import.meta.env.VITE_GRAPESJS_LICENSE_KEY || '';

// Use any for editor ref to avoid type conflicts between SDK versions
type EditorInstance = any;

export function Editor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const editorRef = useRef<EditorInstance | null>(null);

  const [prototype, setPrototype] = useState<Prototype | null>(null);
  const [name, setName] = useState('Untitled Prototype');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState('');

  // Load existing prototype if editing
  useEffect(() => {
    if (slug) {
      loadPrototype(slug);
    } else {
      setIsLoading(false);
    }
  }, [slug]);

  async function loadPrototype(prototypeSlug: string) {
    try {
      setIsLoading(true);
      const response = await authFetch(`/api/prototypes/${prototypeSlug}`);

      if (!response.ok) {
        if (response.status === 404) {
          navigate('/');
          return;
        }
        throw new Error('Failed to load prototype');
      }

      const data: Prototype = await response.json();
      setPrototype(data);
      setName(data.name);
      setHtmlContent(data.htmlContent);

      // Load project data into editor if available
      if (editorRef.current && data.grapesData) {
        editorRef.current.loadProjectData(data.grapesData as any);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prototype');
    } finally {
      setIsLoading(false);
    }
  }

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      const editor = editorRef.current;
      const currentHtml = editor ? editor.getHtml() : htmlContent;
      const grapesData = editor ? editor.getProjectData() : {};

      const url = prototype
        ? `/api/prototypes/${prototype.slug}`
        : '/api/prototypes';
      const method = prototype ? 'PUT' : 'POST';

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          htmlContent: currentHtml,
          grapesData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save prototype');
      }

      const data: Prototype = await response.json();

      if (!prototype) {
        navigate(`/edit/${data.slug}`, { replace: true });
      }

      setPrototype(data);
      setHtmlContent(currentHtml);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [prototype, name, htmlContent, navigate]);

  const handleExport = useCallback(() => {
    const editor = editorRef.current;
    if (editor) {
      setHtmlContent(editor.getHtml());
    }
    setShowExport(true);
  }, []);

  const handlePreview = useCallback(() => {
    const editor = editorRef.current;
    if (editor) {
      const html = editor.getHtml();
      openPreviewInNewTab(html, name || 'Prototype Preview');
    }
  }, [name]);

  // Generate blocks from USWDS components
  // Use HTML string format - GrapesJS will recognize the tag and apply our component type
  const blocks = Object.entries(DEFAULT_CONTENT).map(([tagName, content]) => {
    // Check if content is full HTML (prefixed with __FULL_HTML__)
    const isFullHtml = content.startsWith('__FULL_HTML__');
    const blockContent = isFullHtml
      ? content.replace('__FULL_HTML__', '')
      : `<${tagName}>${content}</${tagName}>`;

    return {
      id: tagName,
      label: tagName.replace('usa-', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      // Use HTML string - GrapesJS's isComponent will match the tag and apply our type
      content: blockContent,
      media: COMPONENT_ICONS[tagName] || COMPONENT_ICONS['default'],
      category: getCategoryForComponent(tagName),
    };
  });

  function getCategoryForComponent(tagName: string): string {
    const categoryMap: Record<string, string[]> = {
      'Actions': ['usa-button', 'usa-button-group', 'usa-link', 'usa-search'],
      'Form Controls': ['usa-text-input', 'usa-textarea', 'usa-select', 'usa-checkbox', 'checkbox-group', 'usa-radio', 'radio-group', 'usa-date-picker', 'usa-time-picker', 'usa-file-input', 'usa-combo-box', 'usa-range-slider'],
      'Navigation': ['usa-breadcrumb', 'usa-pagination', 'usa-side-navigation', 'usa-header', 'usa-footer', 'usa-skip-link'],
      'Data Display': ['usa-card', 'usa-table', 'usa-tag', 'usa-list', 'usa-icon', 'usa-collection', 'usa-summary-box'],
      'Feedback': ['usa-alert', 'usa-banner', 'usa-site-alert', 'usa-modal', 'usa-tooltip'],
      'Layout': ['usa-accordion', 'usa-step-indicator', 'usa-process-list', 'usa-identifier', 'usa-prose'],
      'Patterns': ['usa-name-pattern', 'usa-address-pattern', 'usa-phone-number-pattern', 'usa-email-address-pattern', 'usa-date-of-birth-pattern', 'usa-ssn-pattern'],
      'Templates': ['blank-template', 'landing-template', 'form-template', 'sign-in-template', 'error-template'],
    };

    for (const [category, components] of Object.entries(categoryMap)) {
      if (components.includes(tagName)) {
        return category;
      }
    }
    return 'Components';
  }

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading editor...</p>
      </div>
    );
  }

  // Check if we have a license key
  if (!LICENSE_KEY) {
    return (
      <div className="editor-container">
        <header className="editor-header">
          <div className="editor-header-left">
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/')}
              style={{ padding: '6px 12px' }}
            >
              ← Back
            </button>
          </div>
        </header>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
        }}>
          <div className="card" style={{ maxWidth: '500px', textAlign: 'center' }}>
            <h2>License Key Required</h2>
            <p style={{ color: 'var(--color-base-light)', marginTop: '12px' }}>
              The GrapesJS Studio SDK license key is not configured.
              Please add the <code>VITE_GRAPESJS_LICENSE_KEY</code> environment variable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <header className="editor-header">
        <div className="editor-header-left">
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/')}
            style={{ padding: '6px 12px' }}
          >
            ← Back
          </button>
          <input
            type="text"
            className="editor-title"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Prototype name"
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '1.125rem',
              fontWeight: 600,
              padding: '4px 8px',
              borderRadius: '4px',
            }}
          />
        </div>

        <div className="editor-header-right">
          {error && (
            <span style={{ color: 'var(--color-error)', marginRight: '12px' }}>
              {error}
            </span>
          )}
          <button
            className="btn btn-secondary"
            onClick={handlePreview}
          >
            Preview
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleExport}
          >
            Export
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      <div className="editor-main" style={{ flex: 1 }}>
        <StudioEditor
          options={{
            licenseKey: LICENSE_KEY,
            // Register USWDS component types via plugin (runs before content parsing)
            // Order matters: tableComponent first, then uswdsTablePlugin to extend it, then uswdsComponentsPlugin
            plugins: [
              // Wrap tableComponent with options for USWDS integration
              (editor: any) => tableComponent(editor, {
                block: {
                  label: 'Table',
                  category: 'Data Display',
                  media: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v18H3V3zm16 4H5v12h14V7zm-8 4h6v2h-6v-2zm0 4h6v2h-6v-2zm-6-4h4v6H5v-6z"/></svg>`,
                },
              }),
              uswdsTablePlugin,
              uswdsComponentsPlugin,
            ],
            project: {
              type: 'web',
              default: {
                pages: [{
                  name: 'Prototype',
                  component: prototype?.htmlContent || `
                    <div style="padding: 20px;">
                      <h1>Start Building</h1>
                      <p>Drag USWDS components from the left panel to build your prototype.</p>
                    </div>
                  `,
                }],
              },
            },
            blocks: {
              default: blocks,
            },
          }}
          onReady={(editor) => {
            editorRef.current = editor;
            debug('Editor ready');

            // WebComponentTraitManager handles all trait synchronization automatically
            // No manual sync code needed!

            // Helper function to update page-link trait options with available pages
            const updatePageLinkOptions = (component: any) => {
              if (!component) return;

              // Check if component has a page-link trait
              const pageLinkTrait = component.getTrait?.('page-link');
              if (!pageLinkTrait) return;

              // Get all pages from the editor
              const pages = editor.Pages?.getAll?.() || [];
              const currentPage = editor.Pages?.getSelected?.();

              // Build options from pages, excluding the current page
              const pageOptions = [
                { id: '', label: '-- Select a page --' },
                ...pages
                  .filter((page: any) => page !== currentPage)
                  .map((page: any) => ({
                    id: page.getId?.() || page.id,
                    label: page.get?.('name') || page.getName?.() || `Page ${page.getId?.() || page.id}`,
                  })),
              ];

              // Update the trait options
              pageLinkTrait.set('options', pageOptions);
              debug('Updated page-link options:', pageOptions);
            };

            // Listen for component selection to update page-link options
            editor.on('component:selected', (component: any) => {
              updatePageLinkOptions(component);
            });

            // Also update when pages change
            editor.on('page', () => {
              const selected = editor.getSelected?.();
              if (selected) {
                updatePageLinkOptions(selected);
              }
            });

            // Handle page link clicks in the canvas
            // This allows users to test page navigation while in preview mode
            const handledDocs = new WeakSet<Document>();
            const setupPageLinkHandler = () => {
              const canvas = editor.Canvas;
              const doc = canvas?.getDocument?.();
              if (doc && !handledDocs.has(doc)) {
                handledDocs.add(doc);
                doc.addEventListener('click', (e: MouseEvent) => {
                  // Only handle clicks in preview mode (not editing mode)
                  const isPreviewMode = editor.Commands?.isActive?.('preview');
                  if (!isPreviewMode) return;

                  const target = e.target as HTMLElement;
                  const link = target.closest('[href^="#page-"]') as HTMLElement;
                  if (link) {
                    e.preventDefault();
                    e.stopPropagation();
                    const href = link.getAttribute('href');
                    if (href) {
                      const pageId = href.replace('#page-', '');
                      const pages = editor.Pages;
                      const targetPage = pages?.get?.(pageId);
                      if (targetPage) {
                        pages.select(targetPage);
                        debug('Navigated to page:', pageId);
                      }
                    }
                  }
                });
              }
            };

            // Set up handler when canvas is ready and on page changes
            editor.on('canvas:frame:load', setupPageLinkHandler);
            editor.on('page:select', setupPageLinkHandler);

            // Load project data if available
            if (prototype?.grapesData && Object.keys(prototype.grapesData).length > 0) {
              editor.loadProjectData(prototype.grapesData as any);
            }

            // Helper to wait for a resource to load
            const waitForLoad = (element: HTMLElement, type: string): Promise<void> => {
              return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                  reject(new Error(`${type} load timeout after 10s`));
                }, 10000);

                element.onload = () => {
                  clearTimeout(timeout);
                  debug(`${type} loaded`);
                  resolve();
                };
                element.onerror = (e) => {
                  clearTimeout(timeout);
                  console.error(`USWDS-PT: ${type} failed to load`, e);
                  reject(e);
                };
              });
            };

            // Helper to wait for custom elements to be defined
            const waitForCustomElements = async (
              iframeWindow: Window,
              elements: string[],
              maxWaitMs = 5000
            ): Promise<boolean> => {
              const startTime = Date.now();
              const customElements = iframeWindow.customElements;

              while (Date.now() - startTime < maxWaitMs) {
                const allDefined = elements.every(el => customElements.get(el) !== undefined);
                if (allDefined) {
                  debug('All custom elements registered:', elements);
                  return true;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
              }

              const missing = elements.filter(el => customElements.get(el) === undefined);
              console.warn('USWDS-PT: Some custom elements not registered after timeout:', missing);
              return false;
            };

            // Load USWDS resources into the current canvas iframe
            const loadUSWDSResources = async () => {
              const canvas = editor.Canvas;
              if (!canvas) return;

              const doc = canvas.getDocument();
              if (!doc) return;

              // Check if resources are already loaded in this document
              if (doc.querySelector('link[href*="uswds"]')) {
                debug('USWDS resources already loaded in this canvas');
                return;
              }

              debug('Loading USWDS resources into canvas iframe');

              try {
                // 1. Load CSS files in parallel
                const uswdsCss = doc.createElement('link');
                uswdsCss.rel = 'stylesheet';
                uswdsCss.href = CDN_URLS.uswdsCss;

                const uswdsWcCss = doc.createElement('link');
                uswdsWcCss.rel = 'stylesheet';
                uswdsWcCss.href = CDN_URLS.uswdsWcCss;

                doc.head.appendChild(uswdsCss);
                doc.head.appendChild(uswdsWcCss);

                await Promise.all([
                  waitForLoad(uswdsCss, 'USWDS CSS'),
                  waitForLoad(uswdsWcCss, 'USWDS-WC CSS'),
                ]);

                // 2. Load USWDS-WC bundle JS
                const uswdsWcScript = doc.createElement('script');
                uswdsWcScript.type = 'module';
                uswdsWcScript.src = CDN_URLS.uswdsWcJs;
                doc.head.appendChild(uswdsWcScript);

                await waitForLoad(uswdsWcScript, 'USWDS-WC JS');

                // 3. Wait for critical custom elements to be registered
                const iframeWindow = canvas.getWindow();
                if (iframeWindow) {
                  const criticalElements = ['usa-button', 'usa-header', 'usa-footer', 'usa-alert'];
                  await waitForCustomElements(iframeWindow, criticalElements);
                }

                debug('All USWDS resources loaded successfully');

                // 4. Trigger a canvas refresh
                setTimeout(() => {
                  editor.refresh();
                  debug('Canvas refreshed after resource load');
                }, 100);

              } catch (err) {
                console.error('USWDS-PT: Error loading resources:', err);
              }
            };

            // Load resources on initial canvas load and when pages change
            editor.on('canvas:frame:load', loadUSWDSResources);

            // Also load on initial ready
            loadUSWDSResources();
          }}
        />
      </div>

      {showExport && (
        <ExportModal
          htmlContent={htmlContent}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
