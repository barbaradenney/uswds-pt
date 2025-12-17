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
    // Build default values from trait defaults
    const traitDefaults: Record<string, any> = {};
    config.traits.forEach(trait => {
      if (trait.default !== undefined) {
        traitDefaults[trait.name] = trait.default;
      }
    });

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
          // Set default values from traits
          ...traitDefaults,
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

            // Flag to prevent infinite loops during sync
            let isSyncing = false;

            // Create a function to sync traits to DOM
            const syncTraitsToDOM = (component: any) => {
              const timestamp = new Date().toISOString().split('T')[1];

              // Prevent infinite loops
              if (isSyncing) {
                console.log(`[${timestamp}] 🚫 USWDS-PT: Sync already in progress, skipping...`);
                return;
              }

              const el = component.getEl();
              if (!el) {
                console.log(`[${timestamp}] ❌ USWDS-PT: No element found for component`);
                return;
              }

              const tagName = component.get('tagName')?.toLowerCase();
              if (!tagName?.startsWith('usa-')) return;

              isSyncing = true;
              console.log(`[${timestamp}] 🔄 USWDS-PT: ===== SYNC START for <${tagName}> =====`);

              // Helper to get trait value from multiple possible locations
              const getTraitValue = (traitName: string) => {
                // Get from trait model (most up-to-date source for user changes)
                const traitModels = component.getTraits?.();
                const traitModel = traitModels?.find((t: any) => t.get('name') === traitName);
                const fromTraitModel = traitModel?.get('value');

                // Try attributes object (GrapesJS Studio SDK stores values here)
                const fromAttributes = component.get('attributes')?.[traitName];

                // Try component properties (fallback)
                const fromComponent = component.get(traitName);

                // Use trait model value if it exists (not undefined/null), otherwise fall back
                // Note: We check explicitly for undefined/null to allow false/empty string values
                let finalValue;
                let source;
                if (fromTraitModel !== undefined && fromTraitModel !== null) {
                  finalValue = fromTraitModel;
                  source = 'traitModel';
                } else if (fromAttributes !== undefined && fromAttributes !== null) {
                  finalValue = fromAttributes;
                  source = 'attributes';
                } else {
                  finalValue = fromComponent;
                  source = 'component';
                }

                console.log(`  🔍 [${traitName}] from ${source}:`, {
                  traitModel: fromTraitModel,
                  attributes: fromAttributes,
                  component: fromComponent,
                  '→ USING': finalValue,
                });

                return finalValue;
              };

              // Helper to sync individual attribute to DOM
              const syncAttr = (attrName: string) => {
                const value = getTraitValue(attrName);

                // Handle boolean attributes (like disabled) specially
                if (attrName === 'disabled') {
                  console.log(`  🎯 [DISABLED] Raw value:`, value, `(type: ${typeof value})`);
                  const isDisabled = value === true || value === 'true';
                  console.log(`  🎯 [DISABLED] Computed isDisabled:`, isDisabled);

                  // Update the web component attribute
                  if (isDisabled) {
                    el.setAttribute('disabled', '');
                    if ('disabled' in el) {
                      (el as any).disabled = true;
                    }
                  } else {
                    el.removeAttribute('disabled');
                    if ('disabled' in el) {
                      (el as any).disabled = false;
                    }
                  }

                  // CRITICAL: Also update the internal button directly
                  // The web component doesn't always react to attribute changes
                  const internalButton = el.querySelector?.('button');
                  if (internalButton) {
                    if (isDisabled) {
                      internalButton.setAttribute('disabled', '');
                      (internalButton as any).disabled = true;
                      console.log(`  ✅ [DISABLED] Set disabled on web component AND internal button`);
                    } else {
                      internalButton.removeAttribute('disabled');
                      (internalButton as any).disabled = false;
                      console.log(`  ✅ [DISABLED] Removed disabled from web component AND internal button`);
                    }
                  } else {
                    console.log(`  ⚠️  [DISABLED] Updated web component but no internal button found`);
                  }

                  // Don't update trait model here - only sync FROM traits TO DOM
                  // Bidirectional sync causes infinite loops

                  return;
                }

                // For other attributes, set if we have a non-empty value
                const shouldSet = value !== null && value !== undefined && value !== '' && value !== false;

                if (shouldSet) {
                  el.setAttribute(attrName, String(value));
                  // Also set as property for web components
                  if (attrName in el) {
                    (el as any)[attrName] = value;
                  }
                  console.log(`  ✅ Set ${attrName}="${value}"`);

                  // Don't update trait model here - only sync FROM traits TO DOM
                  // Bidirectional sync causes infinite loops
                } else {
                  el.removeAttribute(attrName);
                  console.log(`  ❌ Removed ${attrName} (value was: ${value})`);

                  // Don't update trait model here - only sync FROM traits TO DOM
                  // Bidirectional sync causes infinite loops
                }
              };

              // For usa-button web component, set variant and size as attributes
              // The web component will handle its internal button styling
              if (tagName === 'usa-button') {
                const variant = getTraitValue('variant');
                const size = getTraitValue('size');

                console.log(`  🎯 Setting web component attributes - variant: "${variant}", size: "${size}"`);

                // Set variant attribute (web component will apply internal classes)
                if (variant && variant !== '') {
                  el.setAttribute('variant', variant);
                  console.log(`  ✅ Set variant attribute: "${variant}"`);
                } else {
                  el.removeAttribute('variant');
                }

                // Set size attribute
                if (size && size !== '') {
                  el.setAttribute('size', size);
                  console.log(`  ✅ Set size attribute: "${size}"`);
                } else {
                  el.removeAttribute('size');
                }

                // Remove usa-button class from web component container (it shouldn't be styled)
                el.classList.remove('usa-button');
              }

              // Sync each attribute to the DOM element
              syncAttr('variant');
              syncAttr('size');
              syncAttr('disabled');
              syncAttr('href');

              // Handle text specially for web components
              const text = getTraitValue('text');
              console.log(`  📝 [TEXT] Value:`, text);
              if (text !== null && text !== undefined && text !== '') {
                // Set as attribute for the web component to read
                el.setAttribute('text', text);
                console.log(`  ✅ [TEXT] Set text attribute: "${text}"`);

                // Also check if the web component has rendered its internal button
                // and sync the text there for GrapesJS inline editing
                const internalButton = el.querySelector?.('button');
                if (internalButton) {
                  const currentText = internalButton.textContent;
                  if (currentText !== text) {
                    internalButton.textContent = text;
                    console.log(`  ✅ [TEXT] Updated internal button text: "${currentText}" → "${text}"`);
                  } else {
                    console.log(`  ⏭️  [TEXT] Internal button text already matches: "${text}"`);
                  }
                } else {
                  console.log(`  ⚠️  [TEXT] No internal button found in shadow DOM`);
                }
              } else {
                console.log(`  ⏭️  [TEXT] Skipped (empty/null/undefined)`);
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

              // Reset the sync flag
              isSyncing = false;
              console.log(`[${timestamp}] ✅ USWDS-PT: ===== SYNC END for <${tagName}> =====`);
            };

            // When a component is selected, set up listeners on that specific component
            editor.on('component:selected', (component: any) => {
              const selectionTimestamp = new Date().toISOString().split('T')[1];
              const tagName = component.get('tagName')?.toLowerCase();

              if (!tagName?.startsWith('usa-')) return;

              const type = component.get('type');
              const traits = component.getTraits?.()?.map((t: any) => t.get('name')) || [];
              console.log(`\n[${selectionTimestamp}] 🎯 USWDS-PT: ========== COMPONENT SELECTED: <${tagName}> ==========`);
              console.log(`  type="${type}" traits=[${traits.join(', ')}]`);

              // Initialize trait values from defaults if not set
              const componentTraits = component.getTraits?.();
              if (componentTraits) {
                componentTraits.forEach((trait: any) => {
                  const traitName = trait.get('name');
                  const currentValue = trait.get('value');
                  const defaultValue = trait.get('default');

                  // If trait has no value but has a default, set it
                  if ((currentValue === undefined || currentValue === null || currentValue === '') && defaultValue !== undefined) {
                    console.log(`USWDS-PT: Initializing trait "${traitName}" with default value:`, defaultValue);
                    trait.set('value', defaultValue);
                    // Also set on component
                    component.set(traitName, defaultValue);
                  }
                });
              }

              // DEBUG: Log all component properties
              console.log('USWDS-PT: Component properties:', {
                attributes: component.get('attributes'),
                text: component.get('text'),
                variant: component.get('variant'),
                size: component.get('size'),
                disabled: component.get('disabled'),
                href: component.get('href'),
              });

              // Set up event listeners for trait changes
              const setupTimestamp = new Date().toISOString().split('T')[1];
              console.log(`[${setupTimestamp}] 🎧 USWDS-PT: Setting up event listeners...`);

              // Remove any previous listeners to avoid duplicates
              component.off('change:attributes');

              // Listen to attributes changes (where Studio SDK stores trait values)
              component.on('change:attributes', (comp: any, attrs: any) => {
                const eventTimestamp = new Date().toISOString().split('T')[1];
                console.log(`[${eventTimestamp}] 🔥 EVENT: change:attributes`, attrs);
                syncTraitsToDOM(component);
              });

              // Listen to trait changes through the trait manager
              const traitModels = component.getTraits?.();
              if (traitModels && traitModels.length > 0) {
                console.log(`[${setupTimestamp}] 🎧 Setting up listeners on ${traitModels.length} trait models...`);

                traitModels.forEach((trait: any) => {
                  const traitName = trait.get('name');
                  const initialValue = trait.get('value');
                  console.log(`  - [${traitName}] initial value:`, initialValue);

                  // Remove old listeners to avoid duplicates
                  trait.off('change:value');

                  // Listen for value changes
                  trait.on('change:value', (model: any, value: any) => {
                    const eventTimestamp = new Date().toISOString().split('T')[1];
                    console.log(`[${eventTimestamp}] 🔥 TRAIT EVENT: [${traitName}] value changed to:`, value, `(was: ${model.previous('value')})`);
                    // Sync immediately when trait changes
                    syncTraitsToDOM(component);
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
