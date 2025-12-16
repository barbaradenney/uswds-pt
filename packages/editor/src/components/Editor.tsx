import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Prototype } from '@uswds-pt/shared';
import { authFetch } from '../hooks/useAuth';
import { ExportModal } from './ExportModal';
import {
  DEFAULT_CONTENT,
  COMPONENT_ICONS,
  CDN_URLS,
  COMPONENT_TRAITS,
} from '@uswds-pt/adapter';
import StudioEditor from '@grapesjs/studio-sdk/react';
import '@grapesjs/studio-sdk/style';

// Create a GrapesJS plugin to register USWDS component types
// Plugins are loaded before the editor parses content, ensuring our types are available
const uswdsComponentsPlugin = (editor: any) => {
  const Components = editor.Components || editor.DomComponents;

  if (!Components) {
    console.error('USWDS-PT: Could not find Components API on editor');
    return;
  }

  console.log('USWDS-PT: Registering component types via plugin...');

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
      },
    });
  }

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

  console.log('USWDS-PT: Component types registered successfully');
};

// License key from environment variable
const LICENSE_KEY = import.meta.env.VITE_GRAPESJS_LICENSE_KEY || '';

// Debug: Log when this module loads
console.log('🔧 USWDS-PT Editor module loaded');

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

  // Generate blocks from USWDS components
  // Use HTML string format - GrapesJS will recognize the tag and apply our component type
  const blocks = Object.entries(DEFAULT_CONTENT).map(([tagName, content]) => ({
    id: tagName,
    label: tagName.replace('usa-', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    // Use HTML string - GrapesJS's isComponent will match the tag and apply our type
    content: `<${tagName}>${content}</${tagName}>`,
    media: COMPONENT_ICONS[tagName] || COMPONENT_ICONS['default'],
    category: getCategoryForComponent(tagName),
  }));

  function getCategoryForComponent(tagName: string): string {
    const categoryMap: Record<string, string[]> = {
      'Actions': ['usa-button', 'usa-button-group', 'usa-link', 'usa-search'],
      'Form Controls': ['usa-text-input', 'usa-textarea', 'usa-select', 'usa-checkbox', 'usa-radio', 'usa-date-picker', 'usa-time-picker', 'usa-file-input', 'usa-combo-box', 'usa-range-slider'],
      'Navigation': ['usa-header', 'usa-footer', 'usa-breadcrumb', 'usa-pagination', 'usa-side-navigation', 'usa-skip-link'],
      'Data Display': ['usa-card', 'usa-table', 'usa-tag', 'usa-list', 'usa-icon', 'usa-collection', 'usa-summary-box'],
      'Feedback': ['usa-alert', 'usa-banner', 'usa-site-alert', 'usa-modal', 'usa-tooltip'],
      'Layout': ['usa-accordion', 'usa-step-indicator', 'usa-process-list', 'usa-identifier', 'usa-prose'],
      'Patterns': ['usa-name-pattern', 'usa-address-pattern', 'usa-phone-number-pattern', 'usa-email-address-pattern', 'usa-date-of-birth-pattern', 'usa-ssn-pattern'],
      'Templates': ['usa-landing-template', 'usa-form-template', 'usa-sign-in-template', 'usa-error-template'],
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
            plugins: [uswdsComponentsPlugin],
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

            // Debug: Log available APIs on the editor
            console.log('USWDS-PT: Editor ready');
            console.log('USWDS-PT: Editor keys:', Object.keys(editor));

            // Create a function to sync traits to DOM
            const syncTraitsToDOM = (component: any) => {
              const el = component.getEl();
              if (!el) {
                console.log('USWDS-PT: No element found for component');
                return;
              }

              const tagName = component.get('tagName')?.toLowerCase();
              if (!tagName?.startsWith('usa-')) return;

              console.log(`USWDS-PT: Syncing traits to DOM for <${tagName}>`);
              console.log('USWDS-PT: Component attributes:', component.get('attributes'));

              // Helper to sync individual attribute to DOM
              const syncAttr = (attrName: string) => {
                const attrs = component.get('attributes') || {};
                const value = attrs[attrName];

                if (value !== null && value !== undefined && value !== '' && value !== false && value !== 'default') {
                  el.setAttribute(attrName, String(value));
                  // Also set as property for web components
                  if (attrName in el) {
                    (el as any)[attrName] = value;
                  }
                  console.log(`  ✓ Set ${attrName}="${value}"`);
                } else {
                  el.removeAttribute(attrName);
                  console.log(`  ✗ Removed ${attrName}`);
                }
              };

              // Sync each attribute
              syncAttr('variant');
              syncAttr('size');
              syncAttr('disabled');
              syncAttr('href');

              // Handle text content separately
              const text = component.get('attributes')?.text;
              if (text !== null && text !== undefined) {
                el.textContent = text;
                console.log(`  ✓ Set textContent="${text}"`);
              }
            };

            // When a component is selected, set up listeners on that specific component
            editor.on('component:selected', (component: any) => {
              const tagName = component.get('tagName')?.toLowerCase();

              if (!tagName?.startsWith('usa-')) return;

              const type = component.get('type');
              const traits = component.getTraits?.()?.map((t: any) => t.get('name')) || [];
              console.log(`USWDS-PT: Selected <${tagName}> type="${type}" traits=[${traits.join(', ')}]`);

              // Trigger initial sync
              syncTraitsToDOM(component);

              // Listen for attribute changes on THIS component
              // Remove any previous listeners to avoid duplicates
              component.off('change:attributes');
              component.on('change:attributes', () => {
                console.log('USWDS-PT: Attributes changed!');
                syncTraitsToDOM(component);
              });

              console.log('USWDS-PT: Set up change:attributes listener');
            });

            // Load existing project data if available
            if (prototype?.grapesData && Object.keys(prototype.grapesData).length > 0) {
              editor.loadProjectData(prototype.grapesData as any);
            }

            // Add USWDS styles and web components to canvas iframe
            const canvas = editor.Canvas;
            if (canvas) {
              const doc = canvas.getDocument();
              if (doc) {
                // 1. Load USWDS base CSS for styling
                const uswdsCss = doc.createElement('link');
                uswdsCss.rel = 'stylesheet';
                uswdsCss.href = CDN_URLS.uswdsCss;
                doc.head.appendChild(uswdsCss);

                // 2. Load USWDS-WC bundle CSS (component-specific styles)
                const uswdsWcCss = doc.createElement('link');
                uswdsWcCss.rel = 'stylesheet';
                uswdsWcCss.href = CDN_URLS.uswdsWcCss;
                doc.head.appendChild(uswdsWcCss);

                // 3. Load USWDS-WC bundle JS (all web components with Lit bundled)
                const uswdsWcScript = doc.createElement('script');
                uswdsWcScript.type = 'module';
                uswdsWcScript.src = CDN_URLS.uswdsWcJs;
                doc.head.appendChild(uswdsWcScript);
              }
            }
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
