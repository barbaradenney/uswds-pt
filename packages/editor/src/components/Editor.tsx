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

              // Helper to get trait value from multiple possible locations
              const getTraitValue = (traitName: string) => {
                // Get from trait model (most reliable source)
                const traitModels = component.getTraits?.();
                const traitModel = traitModels?.find((t: any) => t.get('name') === traitName);
                const fromTraitModel = traitModel?.get('value');

                // Try component properties (where traits without changeProp store values)
                const fromComponent = component.get(traitName);

                // Try attributes object
                const fromAttributes = component.get('attributes')?.[traitName];

                console.log(`  🔍 Searching for "${traitName}":`, {
                  fromTraitModel,
                  fromComponent,
                  fromAttributes,
                  final: fromTraitModel ?? fromComponent ?? fromAttributes,
                });

                // Prefer trait model value, then component properties, then attributes
                return fromTraitModel ?? fromComponent ?? fromAttributes;
              };

              // Helper to sync individual attribute to DOM
              const syncAttr = (attrName: string) => {
                const value = getTraitValue(attrName);

                if (value !== null && value !== undefined && value !== '' && value !== false && value !== 'default') {
                  el.setAttribute(attrName, String(value));
                  // Also set as property for web components
                  if (attrName in el) {
                    (el as any)[attrName] = value;
                  }
                  console.log(`  ✅ Set ${attrName}="${value}"`);
                } else {
                  el.removeAttribute(attrName);
                  console.log(`  ❌ Removed ${attrName} (value was: ${value})`);
                }
              };

              // USWDS buttons use CSS classes - manually apply them based on traits
              if (tagName === 'usa-button') {
                const classes = ['usa-button'];

                const variant = getTraitValue('variant');
                const size = getTraitValue('size');

                console.log(`  🔍 Building CSS classes - variant: "${variant}", size: "${size}"`);

                // Add variant class (skip "default" which is the base style)
                if (variant && variant !== 'default' && variant !== '') {
                  classes.push(`usa-button--${variant}`);
                }

                // Add size class
                if (size && size !== '' && size !== 'default') {
                  classes.push(`usa-button--${size}`);
                }

                el.className = classes.join(' ');
                console.log('  🎨 Applied CSS classes:', el.className);
              }

              // Sync each attribute to the DOM element
              syncAttr('variant');
              syncAttr('size');
              syncAttr('disabled');
              syncAttr('href');

              // Handle text content separately
              const text = getTraitValue('text');
              if (text !== null && text !== undefined && text !== '') {
                el.textContent = text;
                console.log(`  ✅ Set textContent="${text}"`);
              }

              // DEBUG: Log the final state of the DOM element
              console.log('USWDS-PT: Final DOM element state:');
              console.log('  outerHTML:', el.outerHTML);
              console.log('  classList:', Array.from(el.classList));
              console.log('  shadowRoot:', el.shadowRoot);
              if (el.shadowRoot) {
                console.log('  shadowRoot HTML:', el.shadowRoot.innerHTML);
              }
              console.log('  All attributes:', Array.from(el.attributes as NamedNodeMap).map((attr) => `${attr.name}="${attr.value}"`));

              const iframeWindow = el.ownerDocument.defaultView;
              if (iframeWindow) {
                const computedStyle = iframeWindow.getComputedStyle(el);
                console.log('  computed style display:', computedStyle.display);
                console.log('  computed style backgroundColor:', computedStyle.backgroundColor);
                console.log('  computed style padding:', computedStyle.padding);
              }

              // Force the web component to update by dispatching events or calling methods
              if (typeof (el as any).requestUpdate === 'function') {
                console.log('  🔄 Calling requestUpdate() on web component');
                (el as any).requestUpdate();
              }
            };

            // When a component is selected, set up listeners on that specific component
            editor.on('component:selected', (component: any) => {
              const tagName = component.get('tagName')?.toLowerCase();

              if (!tagName?.startsWith('usa-')) return;

              const type = component.get('type');
              const traits = component.getTraits?.()?.map((t: any) => t.get('name')) || [];
              console.log(`USWDS-PT: Selected <${tagName}> type="${type}" traits=[${traits.join(', ')}]`);

              // DEBUG: Log all component properties
              console.log('USWDS-PT: Component properties:', {
                attributes: component.get('attributes'),
                text: component.get('text'),
                variant: component.get('variant'),
                size: component.get('size'),
                disabled: component.get('disabled'),
                href: component.get('href'),
              });

              // DEBUG: Try to see what events are available
              console.log('USWDS-PT: Setting up multiple event listeners for debugging...');

              // Remove any previous listeners
              component.off('change:attributes');
              component.off('change:text');
              component.off('change:variant');
              component.off('change:size');
              component.off('change:disabled');
              component.off('change:href');
              component.off('change');

              // Try listening to various events
              component.on('change:attributes', () => {
                console.log('🔥 EVENT: change:attributes');
                syncTraitsToDOM(component);
              });

              component.on('change:text', () => {
                console.log('🔥 EVENT: change:text');
                syncTraitsToDOM(component);
              });

              component.on('change:variant', () => {
                console.log('🔥 EVENT: change:variant');
                syncTraitsToDOM(component);
              });

              component.on('change:size', () => {
                console.log('🔥 EVENT: change:size');
                syncTraitsToDOM(component);
              });

              component.on('change:disabled', () => {
                console.log('🔥 EVENT: change:disabled');
                syncTraitsToDOM(component);
              });

              component.on('change:href', () => {
                console.log('🔥 EVENT: change:href');
                syncTraitsToDOM(component);
              });

              // Generic change listener
              component.on('change', (comp: any, value: any, opts: any) => {
                console.log('🔥 EVENT: change (generic)', { value, opts });
              });

              // Try listening to trait changes through the trait manager
              const traitModels = component.getTraits?.();
              if (traitModels && traitModels.length > 0) {
                console.log('USWDS-PT: Setting up listeners on individual trait models...');
                traitModels.forEach((trait: any) => {
                  const traitName = trait.get('name');

                  // Remove old listeners to avoid duplicates
                  trait.off('change:value');

                  // Listen for value changes
                  trait.on('change:value', (model: any, value: any) => {
                    console.log(`🔥 TRAIT EVENT: ${traitName} value changed to:`, value);
                    // Small delay to ensure the value is propagated
                    setTimeout(() => syncTraitsToDOM(component), 10);
                  });
                });
              }

              // Trigger initial sync
              syncTraitsToDOM(component);

              console.log('USWDS-PT: All event listeners set up');
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
                console.log('USWDS-PT: Loading CSS and JS into canvas iframe...');
                console.log('USWDS-PT: Base URL:', doc.location.href);

                // 1. Load USWDS base CSS for styling
                const uswdsCss = doc.createElement('link');
                uswdsCss.rel = 'stylesheet';
                uswdsCss.href = CDN_URLS.uswdsCss;
                uswdsCss.onload = () => console.log('USWDS-PT: ✅ USWDS CSS loaded');
                uswdsCss.onerror = (e) => console.error('USWDS-PT: ❌ USWDS CSS failed to load', e);
                doc.head.appendChild(uswdsCss);
                console.log('USWDS-PT: Added USWDS CSS:', CDN_URLS.uswdsCss);

                // 2. Load USWDS-WC bundle CSS (component-specific styles)
                const uswdsWcCss = doc.createElement('link');
                uswdsWcCss.rel = 'stylesheet';
                uswdsWcCss.href = CDN_URLS.uswdsWcCss;
                uswdsWcCss.onload = () => console.log('USWDS-PT: ✅ USWDS-WC CSS loaded');
                uswdsWcCss.onerror = (e) => console.error('USWDS-PT: ❌ USWDS-WC CSS failed to load', e);
                doc.head.appendChild(uswdsWcCss);
                console.log('USWDS-PT: Added USWDS-WC CSS:', CDN_URLS.uswdsWcCss);

                // 3. Load USWDS-WC bundle JS (all web components with Lit bundled)
                const uswdsWcScript = doc.createElement('script');
                uswdsWcScript.type = 'module';
                uswdsWcScript.src = CDN_URLS.uswdsWcJs;
                uswdsWcScript.onload = () => console.log('USWDS-PT: ✅ USWDS-WC JS loaded');
                uswdsWcScript.onerror = (e) => console.error('USWDS-PT: ❌ USWDS-WC JS failed to load', e);
                doc.head.appendChild(uswdsWcScript);
                console.log('USWDS-PT: Added USWDS-WC JS:', CDN_URLS.uswdsWcJs);
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
