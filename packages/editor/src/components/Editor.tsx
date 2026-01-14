import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Prototype } from '@uswds-pt/shared';
import { authFetch } from '../hooks/useAuth';
import { useOrganization } from '../hooks/useOrganization';
import { ExportModal } from './ExportModal';
import { EmbedModal } from './EmbedModal';
import { openPreviewInNewTab } from '../lib/export';
import {
  getPrototype,
  createPrototype,
  updatePrototype,
  type LocalPrototype,
} from '../lib/localStorage';
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
// Note: grapesjs-symbols plugin is not compatible with GrapesJS Studio SDK's UI structure
// The plugin tries to append to '.gjs-pn-views-container' which doesn't exist in Studio SDK

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

  // Register grid layout component types (plain HTML divs with specific classes)
  // Grid container and row use exact class matching
  Components.addType('grid-container', {
    isComponent: (el: HTMLElement) => el.classList?.contains('grid-container'),
    model: {
      defaults: {
        tagName: 'div',
        name: 'Grid Container',
        draggable: true,
        droppable: true,
        removable: true,
        copyable: true,
        resizable: true,
      },
    },
  });

  Components.addType('grid-row', {
    isComponent: (el: HTMLElement) => el.classList?.contains('grid-row'),
    model: {
      defaults: {
        tagName: 'div',
        name: 'Grid Row',
        draggable: true,
        droppable: true,
        removable: true,
        copyable: true,
        resizable: true,
      },
    },
  });

  // Grid columns use classes like grid-col-6, grid-col-4, etc.
  // Match any class that starts with "grid-col"
  Components.addType('grid-col', {
    isComponent: (el: HTMLElement) => {
      if (!el.classList) return false;
      return Array.from(el.classList).some(cls => cls.startsWith('grid-col'));
    },
    model: {
      defaults: {
        tagName: 'div',
        name: 'Grid Column',
        draggable: true,
        droppable: true,
        removable: true,
        copyable: true,
        resizable: true,
        selectable: true,
        hoverable: true,
        highlightable: true,
        layerable: true,
        // Allow editing text content directly
        editable: true,
      },
    },
  });

  // Card container - a droppable USWDS card that can contain any content
  Components.addType('card-container', {
    // Extend default div component
    extend: 'default',
    isComponent: (el: HTMLElement) => el.classList?.contains('uswds-card-container'),
    model: {
      defaults: {
        tagName: 'div',
        type: 'card-container', // Explicit type for serialization
        name: 'Card Container',
        draggable: true,
        droppable: true,
        removable: true,
        copyable: true,
        resizable: true,
        // Explicitly set classes to ensure they're preserved in project data
        classes: ['usa-card', 'uswds-card-container'],
      },
    },
  });

  // Card inner container - the usa-card__container div inside card-container
  Components.addType('card-inner-container', {
    extend: 'default',
    isComponent: (el: HTMLElement) => el.classList?.contains('usa-card__container'),
    model: {
      defaults: {
        tagName: 'div',
        type: 'card-inner-container', // Explicit type for serialization
        name: 'Card Inner Container',
        draggable: false,
        droppable: true,
        removable: false,
        copyable: false,
        // Explicitly set class to ensure it's preserved
        classes: ['usa-card__container'],
      },
    },
  });

  // Card body - the inner content area of a card container
  Components.addType('card-body', {
    extend: 'default',
    isComponent: (el: HTMLElement) => el.classList?.contains('usa-card__body'),
    model: {
      defaults: {
        tagName: 'div',
        type: 'card-body', // Explicit type for serialization
        name: 'Card Body',
        draggable: false,
        droppable: true,
        removable: false,
        copyable: false,
        // Explicitly set class to ensure it's preserved
        classes: ['usa-card__body'],
      },
    },
  });

  // Make paragraph elements editable - extend built-in 'text' type for proper RTE support
  Components.addType('text-block', {
    extend: 'text',
    isComponent: (el: HTMLElement) => el.tagName === 'P',
    model: {
      defaults: {
        tagName: 'p',
        name: 'Text',
        draggable: true,
        droppable: false,
        removable: true,
        copyable: true,
        editable: true,
        selectable: true,
        hoverable: true,
        textable: true,
      },
    },
  });

  // Make heading elements editable - extend built-in 'text' type for proper RTE support
  Components.addType('heading-block', {
    extend: 'text',
    isComponent: (el: HTMLElement) => /^H[1-6]$/.test(el.tagName),
    model: {
      defaults: {
        tagName: 'h2',
        name: 'Heading',
        draggable: true,
        droppable: false,
        removable: true,
        copyable: true,
        editable: true,
        selectable: true,
        hoverable: true,
        textable: true,
        traits: [
          {
            type: 'select',
            name: 'heading-level',
            label: 'Heading Size',
            default: 'h2',
            options: [
              { id: 'h1', label: 'Heading 1 (Largest)' },
              { id: 'h2', label: 'Heading 2' },
              { id: 'h3', label: 'Heading 3' },
              { id: 'h4', label: 'Heading 4' },
              { id: 'h5', label: 'Heading 5' },
              { id: 'h6', label: 'Heading 6 (Smallest)' },
            ],
          },
        ],
      },
      init(this: any) {
        // Set initial heading level based on actual tagName
        const tagName = this.get('tagName')?.toLowerCase() || 'h2';
        this.set('heading-level', tagName);

        // Listen for heading-level trait changes
        this.on('change:heading-level', this.handleHeadingLevelChange);
      },
      handleHeadingLevelChange(this: any) {
        const newLevel = this.get('heading-level');
        if (newLevel && /^h[1-6]$/.test(newLevel)) {
          // Update the tagName
          this.set('tagName', newLevel);

          // Force re-render by replacing the element
          const el = this.getEl();
          if (el && el.parentNode) {
            const newEl = document.createElement(newLevel);
            newEl.innerHTML = el.innerHTML;
            // Copy classes
            newEl.className = el.className;
            // Copy attributes
            for (let i = 0; i < el.attributes.length; i++) {
              const attr = el.attributes[i];
              if (attr.name !== 'class') {
                newEl.setAttribute(attr.name, attr.value);
              }
            }
            el.parentNode.replaceChild(newEl, el);
            // Update the component's element reference
            this.set('el', newEl);
          }
        }
      },
    },
  });

  // Also handle any default/text components that might be inside columns
  // Override the default component type to ensure children are selectable
  const defaultType = Components.getType('default');
  if (defaultType) {
    Components.addType('default', {
      ...defaultType,
      model: {
        defaults: {
          ...defaultType.model?.prototype?.defaults,
          selectable: true,
          hoverable: true,
          removable: true,
        },
      },
    });
  }

  debug('Grid layout component types registered');

  // Initialize WebComponentTraitManager to handle trait ↔ web component sync
  debug('Initializing WebComponentTraitManager...');
  const _traitManager = new WebComponentTraitManager(editor);

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

  // Unique key for each editor session - changes when slug changes or on new prototype
  const [editorKey, setEditorKey] = useState(() => slug || `new-${Date.now()}`);

  // Check if we're in demo mode (no API URL configured)
  const isDemoMode = !import.meta.env.VITE_API_URL;

  // Get current team for team-scoped prototypes (only used in authenticated mode)
  const { currentTeam } = useOrganization();

  // Handle back navigation - go to home/prototype list
  const handleBack = () => {
    navigate('/');
  };

  const [prototype, setPrototype] = useState<Prototype | null>(null);
  const [localPrototype, setLocalPrototype] = useState<LocalPrototype | null>(null);
  const [name, setName] = useState('Untitled Prototype');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState('');

  // Cleanup effect for when component unmounts
  useEffect(() => {
    return () => {
      // Clean up debug globals if they exist
      if ((window as any).__clearCanvas) {
        delete (window as any).__clearCanvas;
      }
      if ((window as any).__editor) {
        delete (window as any).__editor;
      }
      // Clear editor ref
      editorRef.current = null;
    };
  }, []);

  // Load existing prototype if editing, or reset state for new prototype
  useEffect(() => {
    if (slug) {
      setEditorKey(slug);
      if (isDemoMode) {
        loadLocalPrototype(slug);
      } else {
        loadPrototype(slug);
      }
    } else {
      // Reset all state for a new prototype with a unique key
      setEditorKey(`new-${Date.now()}`);
      setLocalPrototype(null);
      setPrototype(null);
      setName('Untitled Prototype');
      setHtmlContent('');
      setIsLoading(false);
    }
  }, [slug, isDemoMode]);

  // Load from localStorage (demo mode)
  function loadLocalPrototype(prototypeId: string) {
    setIsLoading(true);
    const data = getPrototype(prototypeId);

    if (!data) {
      navigate('/');
      return;
    }

    setLocalPrototype(data);
    setName(data.name);
    setHtmlContent(data.htmlContent);

    // Load project data into editor if available
    if (editorRef.current && data.gjsData) {
      try {
        editorRef.current.loadProjectData(JSON.parse(data.gjsData));
      } catch (e) {
        console.warn('Failed to load project data:', e);
      }
    }

    setIsLoading(false);
  }

  // Load from API (authenticated mode)
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

      // Debug: log what we're saving
      debug('Saving - HTML:', currentHtml.substring(0, 500));
      debug('Saving - Project data contains card-container:', JSON.stringify(grapesData).includes('card-container'));
      debug('Saving - HTML contains uswds-card-container:', currentHtml.includes('uswds-card-container'));

      if (isDemoMode) {
        // Save to localStorage in demo mode
        const gjsDataStr = JSON.stringify(grapesData);

        if (localPrototype) {
          // Update existing
          const updated = updatePrototype(localPrototype.id, {
            name,
            htmlContent: currentHtml,
            gjsData: gjsDataStr,
          });
          if (updated) {
            setLocalPrototype(updated);
          }
        } else {
          // Create new
          const created = createPrototype(name, currentHtml, gjsDataStr);
          setLocalPrototype(created);
          navigate(`/edit/${created.id}`, { replace: true });
        }

        setHtmlContent(currentHtml);
      } else {
        // Save to API in authenticated mode
        const url = prototype
          ? `/api/prototypes/${prototype.slug}`
          : '/api/prototypes';
        const method = prototype ? 'PUT' : 'POST';

        // For new prototypes, require a team
        if (!prototype && !currentTeam) {
          throw new Error('Please select a team before creating a prototype');
        }

        const body: Record<string, unknown> = {
          name,
          htmlContent: currentHtml,
          grapesData,
        };

        // Include teamId when creating a new prototype
        if (!prototype && currentTeam) {
          body.teamId = currentTeam.id;
        }

        const response = await authFetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [prototype, localPrototype, name, htmlContent, navigate, isDemoMode]);

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
  const uswdsBlocks = Object.entries(DEFAULT_CONTENT).map(([tagName, content]) => {
    // Check if content is full HTML (prefixed with __FULL_HTML__)
    const isFullHtml = content.startsWith('__FULL_HTML__');
    const blockContent = isFullHtml
      ? content.replace('__FULL_HTML__', '')
      : `<${tagName}>${content}</${tagName}>`;

    // Custom labels for blocks
    const labelMap: Record<string, string> = {
      'heading': 'Heading',
      'text': 'Text',
      'grid-2-col': '2 Columns',
      'grid-3-col': '3 Columns',
      'grid-4-col': '4 Columns',
      'grid-sidebar-left': 'Sidebar Left',
      'grid-sidebar-right': 'Sidebar Right',
      'grid-container': 'Container',
      'grid-row': 'Row',
    };

    const label = labelMap[tagName] || tagName.replace('usa-', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return {
      id: tagName,
      label,
      // Use HTML string - GrapesJS's isComponent will match the tag and apply our type
      content: blockContent,
      media: COMPONENT_ICONS[tagName] || COMPONENT_ICONS['default'],
      category: getCategoryForComponent(tagName),
    };
  });

  // Add table block (from GrapesJS Studio SDK tableComponent, styled with USWDS)
  const tableBlock = {
    id: 'table',
    label: 'Table',
    content: {
      type: 'table',
      classes: ['usa-table'],
    },
    media: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v18H3V3zm16 4H5v2h14V7zm0 4H5v2h14v-2zm0 4H5v2h14v-2z"/></svg>`,
    category: 'Data Display',
  };

  // Combine USWDS blocks with table block
  const blocks = [...uswdsBlocks, tableBlock];

  function getCategoryForComponent(tagName: string): string {
    const categoryMap: Record<string, string[]> = {
      'Basics': ['heading', 'text'],
      'Actions': ['usa-button', 'usa-button-group', 'usa-link', 'usa-search'],
      'Form Controls': ['usa-text-input', 'usa-textarea', 'usa-select', 'usa-checkbox', 'checkbox-group', 'usa-radio', 'radio-group', 'usa-date-picker', 'usa-time-picker', 'usa-file-input', 'usa-combo-box', 'usa-range-slider'],
      'Navigation': ['usa-breadcrumb', 'usa-pagination', 'usa-side-navigation', 'usa-header', 'usa-footer', 'usa-skip-link'],
      'Data Display': ['usa-card', 'usa-table', 'usa-tag', 'usa-list', 'usa-icon', 'usa-collection', 'usa-summary-box'],
      'Feedback': ['usa-alert', 'usa-banner', 'usa-site-alert', 'usa-modal', 'usa-tooltip'],
      'Page Layouts': ['grid-2-col', 'grid-3-col', 'grid-4-col', 'grid-sidebar-left', 'grid-sidebar-right'],
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
              onClick={handleBack}
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
            onClick={handleBack}
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
          {(slug || localPrototype) && (
            <button
              className="btn btn-secondary"
              onClick={() => setShowEmbed(true)}
            >
              Embed
            </button>
          )}
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
          // Key forces complete remount when switching prototypes
          key={editorKey}
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
              // Note: Symbols plugin removed - not compatible with Studio SDK UI
            ],
            project: {
              type: 'web',
              default: {
                pages: [{
                  name: 'Prototype',
                  // Use correct content source based on mode, or empty for new prototype
                  component: (isDemoMode ? localPrototype?.htmlContent : prototype?.htmlContent) || '',
                }],
              },
            },
            blocks: {
              // Only use our USWDS blocks
              default: blocks,
            },
          }}
          onReady={(editor) => {
            editorRef.current = editor;
            debug('Editor ready');

            // Clear any GrapesJS internal storage to prevent state bleeding
            const storageManager = editor.Storage;
            if (storageManager) {
              try {
                // Clear local storage used by GrapesJS
                const storageKeys = Object.keys(localStorage).filter(key =>
                  key.startsWith('gjs-') || key.startsWith('gjsProject')
                );
                storageKeys.forEach(key => localStorage.removeItem(key));
                debug('Cleared GrapesJS storage keys:', storageKeys);
              } catch (e) {
                console.warn('Failed to clear GrapesJS storage:', e);
              }
            }

            // For new prototypes (no slug), load the blank template with header/footer
            if (!slug) {
              debug('New prototype - loading blank template');
              const wrapper = editor.DomComponents?.getWrapper();
              if (wrapper) {
                // Get blank template content (header, main area, footer)
                const blankTemplate = DEFAULT_CONTENT['blank-template']?.replace('__FULL_HTML__', '') || '';
                wrapper.components(blankTemplate);
              }
            } else if (isDemoMode && localPrototype?.gjsData) {
              // Load saved project data if editing an existing prototype
              try {
                const projectData = JSON.parse(localPrototype.gjsData);
                debug('Project data to load:', JSON.stringify(projectData, null, 2).substring(0, 2000));

                // Check if project data contains card-container
                const hasCardContainer = JSON.stringify(projectData).includes('card-container');
                debug('Project data contains card-container:', hasCardContainer);

                editor.loadProjectData(projectData);
                debug('Loaded project data from localStorage');

                // After loading, check components
                setTimeout(() => {
                  const wrapper = editor.DomComponents?.getWrapper();
                  if (wrapper) {
                    const allComponents = wrapper.components();
                    debug('Components after load:', allComponents.length);
                    allComponents.forEach((c: any) => {
                      debug('  -', c.get('type'), c.getClasses?.());
                    });
                  }
                }, 500);
              } catch (e) {
                console.warn('Failed to load project data:', e);
              }
            } else if (!isDemoMode && prototype?.grapesData) {
              try {
                editor.loadProjectData(prototype.grapesData as any);
                debug('Loaded project data from API');
              } catch (e) {
                console.warn('Failed to load project data:', e);
              }
            }

            // Add custom CSS to canvas for card container content
            const canvasFrame = editor.Canvas?.getFrameEl();
            if (canvasFrame?.contentDocument) {
              const style = canvasFrame.contentDocument.createElement('style');
              style.textContent = `
                /* Remove default margins from elements inside card containers */
                .uswds-card-container h1,
                .uswds-card-container h2,
                .uswds-card-container h3,
                .uswds-card-container h4,
                .uswds-card-container h5,
                .uswds-card-container h6,
                .uswds-card-container p,
                .uswds-card-container ul,
                .uswds-card-container ol {
                  margin: 0;
                }
              `;
              canvasFrame.contentDocument.head.appendChild(style);
              debug('Added card container CSS to canvas');
            }

            // Add spacing trait to all components
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

            // Helper to update margin class on a component
            const updateSpacingClass = (component: any, newClass: string) => {
              const el = component.getEl();
              if (!el) return;

              // Remove any existing margin-top-* classes
              const currentClasses = component.getClasses();
              const classesToRemove = currentClasses.filter((cls: string) =>
                cls.startsWith('margin-top-')
              );
              classesToRemove.forEach((cls: string) => component.removeClass(cls));

              // Add new class if specified
              if (newClass) {
                component.addClass(newClass);
              }
            };

            // Listen for component selection to add spacing trait dynamically
            editor.on('component:selected', (component: any) => {
              const traits = component.get('traits');

              // Check if spacing trait already exists
              const hasSpacingTrait = traits.where({ name: 'top-spacing' }).length > 0;

              if (!hasSpacingTrait) {
                // Get current margin class from element
                const currentClasses = component.getClasses();
                const currentMargin = currentClasses.find((cls: string) =>
                  cls.startsWith('margin-top-')
                ) || '';

                // Add the spacing trait
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

            // Listen for trait changes
            editor.on('component:update', (component: any) => {
              const topSpacing = component.getTrait('top-spacing');
              if (topSpacing) {
                const value = topSpacing.getValue();
                updateSpacingClass(component, value);
              }
            });

            // Remove any default GrapesJS blocks that aren't ours
            const blockManager = editor.Blocks;
            if (blockManager) {
              const allBlocks = blockManager.getAll();
              const ourBlockIds = new Set(blocks.map((b: any) => b.id));

              // Find and remove blocks that aren't in our list
              const blocksToRemove = allBlocks.filter((block: any) => {
                const blockId = block.get('id');
                return !ourBlockIds.has(blockId);
              });

              blocksToRemove.forEach((block: any) => {
                const blockId = block.get('id');
                debug('Removing default block:', blockId);
                blockManager.remove(blockId);
              });
            }

            // Helper function to force canvas visual update
            // GrapesJS's editor.refresh() only updates spots/tools positioning, not content
            const forceCanvasUpdate = () => {
              debug('Forcing canvas update...');
              try {
                // Trigger events that help clear internal caches
                editor.trigger('frame:updated');

                // Use Canvas.refresh() with spots update
                const canvas = editor.Canvas;
                if (canvas?.refresh) {
                  canvas.refresh({ spots: true });
                }

                // Also call editor.refresh() for tool positioning
                editor.refresh();

                // Force iframe repaint by triggering reflow
                const frameEl = canvas?.getFrameEl?.();
                if (frameEl) {
                  const doc = frameEl.contentDocument;
                  if (doc?.body) {
                    void doc.body.offsetHeight;
                    debug('Iframe reflow triggered');
                  }
                }

                debug('Canvas update complete');
              } catch (err) {
                console.warn('USWDS-PT: Canvas update warning:', err);
              }
            };

            // Force canvas refresh after component removal
            editor.on('component:remove', (component: any) => {
              const tagName = component?.get?.('tagName') || component?.get?.('type');
              debug('Component removed:', tagName);
              // Trigger canvas update after a short delay
              setTimeout(forceCanvasUpdate, 100);
            });

            // Force canvas refresh after component move/reorder (from layers panel or drag)
            editor.on('component:drag:end', () => {
              debug('Component drag ended');
              setTimeout(forceCanvasUpdate, 100);
            });

            editor.on('sorter:drag:end', () => {
              debug('Sorter drag ended');
              setTimeout(forceCanvasUpdate, 100);
            });

            // Listen for any component update that might affect ordering
            editor.on('component:update', () => {
              debug('Component updated');
              setTimeout(forceCanvasUpdate, 100);
            });

            // Handle DomComponents.clear() calls (used by Clear Page)
            const originalClear = editor.DomComponents?.clear?.bind(editor.DomComponents);
            if (originalClear && editor.DomComponents) {
              editor.DomComponents.clear = (...args: any[]) => {
                debug('DomComponents.clear() called');
                const result = originalClear(...args);
                setTimeout(forceCanvasUpdate, 100);
                // Close any open modal after clearing
                if (editor.Modal?.close) {
                  editor.Modal.close();
                  debug('Modal closed');
                }
                return result;
              };
            }

            // Listen for command execution (for core:canvas-clear and similar)
            editor.on('run:core:canvas-clear', () => {
              debug('core:canvas-clear command executed');
              setTimeout(forceCanvasUpdate, 100);
              // Close modal after clear command
              setTimeout(() => {
                if (editor.Modal?.close) {
                  editor.Modal.close();
                  debug('Modal closed after clear command');
                }
              }, 50);
            });

            // Log ALL commands being run for debugging
            editor.on('run', (commandId: string) => {
              debug('Command run:', commandId);
            });

            // Log ALL events for debugging (temporary - to find the clear event)
            const originalTrigger = editor.trigger.bind(editor);
            (editor as any).trigger = function(event: any, ...args: any[]) {
              if (typeof event === 'string' && (event.includes('clear') || event.includes('delete') || event.includes('remove') || event.includes('reset'))) {
                debug('Event triggered:', event, args);
              }
              return originalTrigger(event, ...args);
            };

            // Listen for any component deletion command
            editor.on('run:core:component-delete', () => {
              debug('core:component-delete command executed');
              setTimeout(forceCanvasUpdate, 100);
            });

            // Override the clear command to ensure it works properly
            const Commands = editor.Commands;
            if (Commands) {
              // Store reference to original clear command
              const _originalClearCmd = Commands.get('core:canvas-clear');

              // Register our own clear command that ensures proper clearing
              Commands.add('core:canvas-clear', {
                run(editor: any) {
                  debug('Running custom core:canvas-clear command');

                  // Get the wrapper component (root of the canvas)
                  const wrapper = editor.DomComponents?.getWrapper();
                  if (wrapper) {
                    // Remove all children from the wrapper
                    const components = wrapper.components();
                    debug('Clearing', components.length, 'components from wrapper');

                    // Clear all components
                    components.reset();

                    // Alternative: remove each component
                    // while (components.length > 0) {
                    //   components.at(0).remove();
                    // }
                  }

                  // Also clear styles if needed
                  const cssComposer = editor.CssComposer;
                  if (cssComposer?.clear) {
                    cssComposer.clear();
                    debug('CSS cleared');
                  }

                  // Force canvas update
                  setTimeout(forceCanvasUpdate, 100);

                  // Close any modal
                  if (editor.Modal?.close) {
                    editor.Modal.close();
                  }

                  debug('Canvas cleared successfully');
                },
              });

              debug('Custom core:canvas-clear command registered');
            }

            // Expose helper functions for debugging from console (only in debug mode)
            if (DEBUG) {
              (window as any).__clearCanvas = () => {
                debug('Manual clear triggered from console');
                const wrapper = editor.DomComponents?.getWrapper();
                if (wrapper) {
                  const components = wrapper.components();
                  debug('Found', components.length, 'components');
                  components.forEach((c: any) => debug('  -', c.get('tagName') || c.get('type')));
                  components.reset();
                  debug('Components cleared');
                }
                setTimeout(forceCanvasUpdate, 100);
              };

              // Also expose editor for debugging
              (window as any).__editor = editor;
              debug('Debug helpers exposed: window.__clearCanvas(), window.__editor');
            }

            // Also listen for page changes which might need refresh
            editor.on('page:select', () => {
              debug('Page selected');
              setTimeout(forceCanvasUpdate, 100);
            });

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

                // Note: USWDS JavaScript (uswds.min.js) is NOT loaded here because:
                // - All components are web components that handle their own behavior internally
                // - Loading USWDS JS would conflict with web component event handlers
                // - The usa-header web component has its own mobile menu toggle via Lit events

                // 3. Wait for critical custom elements to be registered
                const iframeWindow = canvas.getWindow();
                if (iframeWindow) {
                  const criticalElements = ['usa-button', 'usa-header', 'usa-footer', 'usa-alert'];
                  await waitForCustomElements(iframeWindow, criticalElements);
                }

                debug('All USWDS resources loaded successfully');

                // 5. Trigger a canvas refresh
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

      {showEmbed && (slug || localPrototype?.id) && (
        <EmbedModal
          prototypeId={slug || localPrototype?.id || ''}
          onClose={() => setShowEmbed(false)}
        />
      )}
    </div>
  );
}
