import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Prototype } from '@uswds-pt/shared';
import { authFetch } from '../hooks/useAuth';
import { useOrganization } from '../hooks/useOrganization';
import { useVersionHistory } from '../hooks/useVersionHistory';
import { useAutosave } from '../hooks/useAutosave';
import { ExportModal } from './ExportModal';
import { EmbedModal } from './EmbedModal';
import { VersionHistoryPanel } from './VersionHistoryPanel';
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

// Debug logging flag - can be enabled via URL param ?debug=true or localStorage
const DEBUG = (() => {
  if (typeof window !== 'undefined') {
    // Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true') return true;
    // Check localStorage
    if (localStorage.getItem('uswds_pt_debug') === 'true') return true;
  }
  return false;
})();

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
    const traitDefinitions = componentRegistry.getTraitDefinitions(registration.tagName) || [];

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

  // Track page transitions to prevent saves during unstable state
  const isPageSwitchingRef = useRef(false);
  const editorReadyRef = useRef(false);

  // Autosave refs - declared early for cleanup access and to avoid stale closures
  const pendingChangesRef = useRef(false);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerDebouncedAutosaveRef = useRef<() => void>(() => {});

  // Track if new prototype creation is in progress to prevent duplicate API calls
  const isCreatingPrototypeRef = useRef(false);

  // Track registered editor event listeners for cleanup (prevents memory leaks)
  const editorListenersRef = useRef<Array<{ event: string; handler: (...args: any[]) => void }>>([]);

  // Unique key for each editor session - changes when slug changes or on new prototype
  const [editorKey, setEditorKey] = useState(() => slug || `new-${Date.now()}`);

  // Helper to register editor event listeners with automatic tracking for cleanup
  // This prevents memory leaks when the editor is destroyed or component unmounts
  const registerEditorListener = useCallback((editor: EditorInstance, event: string, handler: (...args: any[]) => void) => {
    editor.on(event, handler);
    editorListenersRef.current.push({ event, handler });
  }, []);

  // Check if we're in demo mode (no API URL configured)
  const isDemoMode = !import.meta.env.VITE_API_URL;

  // Get current team for team-scoped prototypes (only used in authenticated mode)
  const { currentTeam, isLoading: isLoadingTeam, teams } = useOrganization();

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

  // Version history panel state
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Version history hook - only for authenticated prototypes
  const {
    versions,
    isLoading: versionsLoading,
    isRestoring,
    error: versionError,
    fetchVersions,
    restoreVersion,
  } = useVersionHistory(!isDemoMode && slug ? slug : null);

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

      // CRITICAL: Clean up all registered editor event listeners to prevent memory leaks
      const editor = editorRef.current;
      if (editor) {
        editorListenersRef.current.forEach(({ event, handler }) => {
          try {
            editor.off(event, handler);
          } catch (e) {
            // Ignore errors during cleanup
          }
        });
        debug('Cleaned up', editorListenersRef.current.length, 'editor event listeners');
      }
      editorListenersRef.current = [];

      // Clear editor ref
      editorRef.current = null;
      // Clear autosave timeout
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
    };
  }, []);

  // Create a new prototype immediately and redirect to it
  // This prevents the delayed page refresh and enables autosave from the start
  const createAndRedirectToNewPrototype = useCallback(async () => {
    // Guard against multiple creation attempts
    if (isDemoMode || !currentTeam || isCreatingPrototypeRef.current) return;

    isCreatingPrototypeRef.current = true;
    debug('[New prototype] Creating immediately...');
    setIsLoading(true);

    try {
      // Get blank template content for the new prototype
      const blankTemplate = DEFAULT_CONTENT['blank-template']?.replace('__FULL_HTML__', '') || '';

      const response = await authFetch('/api/prototypes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Untitled Prototype',
          htmlContent: blankTemplate,
          grapesData: {
            pages: [{
              id: 'page-1',
              name: 'Prototype',
              frames: [{
                component: { type: 'wrapper', components: [] }
              }]
            }],
            styles: [],
            assets: [],
          },
          teamId: currentTeam.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create prototype');
      }

      const data: Prototype = await response.json();
      debug('[New prototype] Created with slug:', data.slug);

      // Navigate to the new prototype immediately (before editor loads)
      navigate(`/edit/${data.slug}`, { replace: true });
    } catch (err) {
      console.error('[New prototype] Creation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to create prototype');
      setIsLoading(false);
      isCreatingPrototypeRef.current = false; // Allow retry on error
    }
  }, [isDemoMode, currentTeam, navigate]);

  // Load existing prototype if editing, or create new prototype immediately
  useEffect(() => {
    if (slug) {
      setEditorKey(slug);
      if (isDemoMode) {
        loadLocalPrototype(slug);
      } else {
        loadPrototype(slug);
      }
    } else if (!isDemoMode && currentTeam) {
      // In authenticated mode with a team, create prototype immediately and redirect
      // This prevents the delayed page refresh and enables autosave from the start
      createAndRedirectToNewPrototype();
    } else if (isDemoMode) {
      // Demo mode: reset state for a new prototype with a unique key
      setEditorKey(`new-${Date.now()}`);
      setLocalPrototype(null);
      setPrototype(null);
      setName('Untitled Prototype');
      setHtmlContent('');
      setError(null);
      editorReadyRef.current = false;
      setIsLoading(false);
    } else {
      // Authenticated mode but no team yet (loading) - show loading state
      setIsLoading(true);
    }
  }, [slug, isDemoMode, currentTeam, createAndRedirectToNewPrototype]);

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
    // Don't save during page transitions - GrapesJS state is unstable
    if (isPageSwitchingRef.current) {
      debug('Save blocked: page switch in progress');
      setError('Please wait for page switch to complete');
      return;
    }

    // Don't save if editor isn't ready
    if (!editorReadyRef.current) {
      debug('Save blocked: editor not ready');
      setError('Editor is still loading. Please wait a moment.');
      return;
    }

    setIsSaving(true);
    setError(null);
    debug('handleSave started, prototype:', !!prototype, 'slug:', slug);

    try {
      const editor = editorRef.current;

      if (!editor) {
        throw new Error('Editor not initialized');
      }

      let currentHtml = htmlContent;
      let grapesData: any = { pages: [], styles: [], assets: [] };

      // Get HTML content with defensive error handling
      try {
        currentHtml = editor.getHtml() || htmlContent;
      } catch (htmlErr) {
        console.warn('[USWDS-PT] Error getting HTML from editor, using fallback:', htmlErr);
        // Continue with existing htmlContent
      }

      // Get project data with defensive error handling
      // GrapesJS's getProjectData() can throw "Cannot read properties of undefined (reading 'forEach')"
      // when internal page/component state isn't fully initialized
      try {
        // Double-check page switching state before calling getProjectData
        if (isPageSwitchingRef.current) {
          throw new Error('Page switch started during save');
        }

        // Verify Pages manager is ready before calling getProjectData
        const pages = editor.Pages;
        if (!pages || typeof pages.getAll !== 'function') {
          throw new Error('Pages manager not initialized');
        }

        const allPages = pages.getAll?.();
        if (!allPages || !Array.isArray(allPages) || allPages.length === 0) {
          throw new Error('No pages available');
        }

        const rawData = editor.getProjectData();
        if (rawData && typeof rawData === 'object') {
          grapesData = rawData;
        }
      } catch (dataErr: any) {
        // Check if this is the forEach error
        const errMsg = dataErr?.message || String(dataErr);
        if (errMsg.includes('forEach') || errMsg.includes('Page switch')) {
          console.warn('[USWDS-PT] getProjectData() failed, reconstructing from editor state:', errMsg);
        } else {
          console.warn('[USWDS-PT] Error getting project data:', dataErr);
        }

        // Reconstruct project data from editor state
        try {
          const wrapper = editor.DomComponents?.getWrapper();
          const pagesManager = editor.Pages;
          const allPages = pagesManager?.getAll?.() || [];
          const styles = editor.CssComposer?.getAll?.() || [];
          const assets = editor.AssetManager?.getAll?.() || [];

          // Try to get all pages
          if (allPages.length > 0) {
            grapesData.pages = allPages.map((page: any) => {
              try {
                const pageId = page.getId?.() || page.id || `page-${Date.now()}`;
                const pageName = page.get?.('name') || page.getName?.() || 'Page';
                const mainFrame = page.getMainFrame?.();
                const mainComponent = mainFrame?.getComponent?.();

                return {
                  id: pageId,
                  name: pageName,
                  frames: [{
                    component: mainComponent?.toJSON?.() || { type: 'wrapper', components: [] }
                  }]
                };
              } catch (pageErr) {
                console.warn('[USWDS-PT] Error serializing page:', pageErr);
                return {
                  id: `page-${Date.now()}`,
                  name: 'Page',
                  frames: [{ component: { type: 'wrapper', components: [] } }]
                };
              }
            });
          } else {
            // Fallback to wrapper
            grapesData.pages = [{
              id: 'page-1',
              name: 'Page 1',
              frames: [{
                component: wrapper?.toJSON?.() || { type: 'wrapper', components: [] }
              }]
            }];
          }

          grapesData.styles = Array.isArray(styles) ? styles.map((s: any) => {
            try { return s.toJSON?.() || s; } catch { return s; }
          }) : [];
          grapesData.assets = Array.isArray(assets) ? assets.map((a: any) => {
            try { return a.toJSON?.() || a; } catch { return a; }
          }) : [];

        } catch (reconstructErr) {
          console.error('[USWDS-PT] Failed to reconstruct project data:', reconstructErr);
          // Use minimal valid structure
          grapesData = { pages: [], styles: [], assets: [] };
        }
      }

      // NORMALIZE: Ensure grapesData has proper structure
      // This fixes issues where new prototypes don't have properly initialized pages
      if (editor) {
        const normalizedData = grapesData as any;

        // Ensure pages array exists
        if (!normalizedData.pages || !Array.isArray(normalizedData.pages)) {
          debug('Normalizing: pages was undefined or not an array, reconstructing...');
          const allPages = editor.Pages?.getAll?.() || [];

          if (allPages.length > 0) {
            normalizedData.pages = allPages.map((page: any) => {
              const pageId = page.getId?.() || page.id || `page-${Date.now()}`;
              const pageName = page.get?.('name') || page.getName?.() || 'Page';
              const mainFrame = page.getMainFrame?.() || page.get?.('frames')?.[0];
              const mainComponent = mainFrame?.getComponent?.() || page.getMainComponent?.();

              return {
                id: pageId,
                name: pageName,
                frames: [{
                  component: mainComponent?.toJSON?.() || { type: 'wrapper', components: [] }
                }]
              };
            });
          } else {
            // Fallback: reconstruct from wrapper
            const wrapper = editor.DomComponents?.getWrapper();
            normalizedData.pages = [{
              id: 'page-1',
              name: 'Page 1',
              frames: [{
                component: wrapper?.toJSON?.() || { type: 'wrapper', components: [] }
              }]
            }];
          }
          debug('Normalized pages:', normalizedData.pages.length);
        }

        // Ensure other arrays exist
        if (!normalizedData.styles) normalizedData.styles = [];
        if (!normalizedData.assets) normalizedData.assets = [];

        grapesData = normalizedData;
      }

      // Debug: log what we're saving
      debug('Saving - HTML length:', currentHtml.length);
      const pages = (grapesData as any)?.pages;
      debug('Saving - Project data pages:', Array.isArray(pages) ? pages.length : 0);
      if (Array.isArray(pages)) {
        pages.forEach((page: any, i: number) => {
          debug(`  - Page ${i}:`, page.name || 'unnamed', 'components:', page.frames?.[0]?.component?.components?.length || 0);
        });
      }

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
        // Use slug from URL params if prototype isn't loaded yet (handles refresh case)
        const prototypeSlug = prototype?.slug || slug;
        const isUpdate = !!prototypeSlug;

        debug('Save mode:', isUpdate ? 'UPDATE' : 'CREATE', 'slug:', prototypeSlug);

        const url = isUpdate
          ? `/api/prototypes/${prototypeSlug}`
          : '/api/prototypes';
        const method = isUpdate ? 'PUT' : 'POST';

        // For new prototypes, require a team
        if (!isUpdate && !currentTeam) {
          if (isLoadingTeam) {
            throw new Error('Still loading teams. Please wait a moment and try again.');
          } else if (!teams || teams.length === 0) {
            throw new Error('No team available. Please go to Settings to create a team first.');
          } else {
            throw new Error('Please select a team before creating a prototype.');
          }
        }

        const body: Record<string, unknown> = {
          name,
          htmlContent: currentHtml,
          grapesData,
        };

        // Include teamId when creating a new prototype
        if (!isUpdate && currentTeam) {
          body.teamId = currentTeam.id;
        }

        debug('Making API call:', method, url);

        const response = await authFetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          debug('API error:', response.status, errorText);
          throw new Error(`Failed to save prototype: ${response.status}`);
        }

        const data: Prototype = await response.json();
        debug('Save successful, new slug:', data.slug);

        if (!isUpdate) {
          navigate(`/edit/${data.slug}`, { replace: true });
        }

        setPrototype(data);
        setHtmlContent(currentHtml);

        // Refresh version history after save (versions are created on PUT)
        if (isUpdate) {
          fetchVersions();
        }
      }
    } catch (err) {
      console.error('[USWDS-PT] Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [prototype, localPrototype, name, htmlContent, navigate, isDemoMode, currentTeam, teams, isLoadingTeam, slug, fetchVersions]);

  // Get current editor content for autosave comparison
  const getEditorContent = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return null;

    // Don't try to get content if editor isn't fully ready
    if (!editorReadyRef.current) {
      debug('[getEditorContent] Editor not ready yet');
      return null;
    }

    // Don't try to get content during page switches
    if (isPageSwitchingRef.current) {
      debug('[getEditorContent] Page switch in progress');
      return null;
    }

    // Check if Pages manager is initialized - this is often the source of forEach errors
    const pages = editor.Pages;
    if (!pages || typeof pages.getAll !== 'function') {
      debug('[getEditorContent] Pages manager not ready');
      return null;
    }

    // Verify pages exist before trying to get project data
    const allPages = pages.getAll?.();
    if (!allPages || !Array.isArray(allPages) || allPages.length === 0) {
      debug('[getEditorContent] No pages available');
      return null;
    }

    try {
      return {
        html: editor.getHtml(),
        projectData: editor.getProjectData(),
      };
    } catch (err) {
      console.warn('[USWDS-PT] Error getting editor content:', err);
      return null;
    }
  }, []);

  // Autosave handler - saves without navigation or error display
  const handleAutosave = useCallback(async () => {
    // Skip if no existing prototype or in demo mode
    if (!prototype || isDemoMode) return;

    // Skip if page switch in progress or editor not ready
    if (isPageSwitchingRef.current || !editorReadyRef.current) {
      debug('[Autosave] Skipped: page switching or editor not ready');
      return;
    }

    const editor = editorRef.current;
    if (!editor) return;

    // Check if Pages manager is initialized - prevents forEach errors
    const pages = editor.Pages;
    if (!pages || typeof pages.getAll !== 'function') {
      debug('[Autosave] Skipped: Pages manager not ready');
      return;
    }

    const allPages = pages.getAll?.();
    if (!allPages || !Array.isArray(allPages) || allPages.length === 0) {
      debug('[Autosave] Skipped: No pages available');
      return;
    }

    setAutosaveStatus('saving');

    try {

      let currentHtml: string = htmlContent;
      let grapesData: any = { pages: [], styles: [], assets: [] };

      // Get HTML with defensive error handling
      try {
        currentHtml = editor.getHtml() || htmlContent;
      } catch (htmlErr) {
        console.warn('[Autosave] Error getting HTML:', htmlErr);
        // Continue with existing htmlContent
      }

      // Get project data with defensive error handling
      try {
        const rawData = editor.getProjectData();
        if (rawData && typeof rawData === 'object') {
          grapesData = rawData;
        }
      } catch (dataErr) {
        console.warn('[Autosave] Error getting project data, reconstructing:', dataErr);
        try {
          const wrapper = editor.DomComponents?.getWrapper();
          grapesData = {
            pages: [{
              id: 'page-1',
              name: 'Page 1',
              frames: [{
                component: wrapper?.toJSON?.() || { type: 'wrapper', components: [] }
              }]
            }],
            styles: [],
            assets: [],
          };
        } catch (reconstructErr) {
          console.warn('[Autosave] Failed to reconstruct, skipping:', reconstructErr);
          setAutosaveStatus('error');
          setTimeout(() => setAutosaveStatus('idle'), 5000);
          return;
        }
      }

      const response = await authFetch(`/api/prototypes/${prototype.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          htmlContent: currentHtml,
          grapesData,
        }),
      });

      if (!response.ok) {
        throw new Error('Autosave failed');
      }

      const data: Prototype = await response.json();
      setPrototype(data);
      setHtmlContent(currentHtml);
      setAutosaveStatus('saved');

      // Refresh version history (autosave creates versions via PUT)
      fetchVersions();

      // Reset to idle after 3 seconds
      setTimeout(() => setAutosaveStatus('idle'), 3000);
    } catch (err) {
      console.warn('[Autosave] Failed:', err);
      setAutosaveStatus('error');

      // Reset to idle after 5 seconds
      setTimeout(() => setAutosaveStatus('idle'), 5000);
    }
  }, [prototype, isDemoMode, name, htmlContent, fetchVersions]);

  // Autosave hook - only for authenticated prototypes that already exist
  const autosave = useAutosave({
    interval: 30000, // 30 seconds
    getContent: getEditorContent,
    onSave: handleAutosave,
    enabled: !isDemoMode && !!prototype && !!slug,
    isSaving,
  });

  // Note: New prototypes are now created immediately in the useEffect above (createAndRedirectToNewPrototype)
  // This eliminates the need for delayed auto-save and prevents the page refresh issue

  // Debounced autosave triggered by GrapesJS change events
  // Uses triggerDebouncedAutosaveRef to avoid stale closure in onReady event listeners
  const triggerDebouncedAutosave = useCallback(() => {
    debug('[Event autosave] Change detected, prototype:', !!prototype, 'slug:', slug);

    // Only for existing prototypes
    if (!prototype || isDemoMode || !slug) {
      debug('[Event autosave] Skipping - no prototype yet');
      return;
    }

    // Don't trigger during page switches
    if (isPageSwitchingRef.current) {
      debug('[Event autosave] Skipping - page switch in progress');
      return;
    }

    pendingChangesRef.current = true;

    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    // Debounce: wait 5 seconds after last change before saving
    autosaveTimeoutRef.current = setTimeout(() => {
      if (pendingChangesRef.current && !isSaving && !isPageSwitchingRef.current && editorReadyRef.current) {
        debug('[Event autosave] Triggering save after changes detected');
        pendingChangesRef.current = false;
        handleAutosave();
      }
    }, 5000);
  }, [prototype, isDemoMode, slug, isSaving, handleAutosave]);

  // Keep the ref updated with the latest callback
  useEffect(() => {
    triggerDebouncedAutosaveRef.current = triggerDebouncedAutosave;
  }, [triggerDebouncedAutosave]);

  // Handle version restore with autosave pause
  const handleVersionRestore = useCallback(async (versionNumber: number): Promise<boolean> => {
    // Pause autosave during restore
    autosave.pause();

    try {
      const success = await restoreVersion(versionNumber);

      if (success && slug) {
        // Reload the prototype to get updated content
        const response = await authFetch(`/api/prototypes/${slug}`);
        if (response.ok) {
          const data: Prototype = await response.json();
          setPrototype(data);
          setHtmlContent(data.htmlContent || '');

          // Reload editor content
          const editor = editorRef.current;
          if (editor && data.grapesData) {
            editor.loadProjectData(data.grapesData as any);
          }
        }

        // Refresh version list
        await fetchVersions();

        // Mark as saved to reset autosave comparison
        autosave.markAsSaved();
      }

      return success;
    } finally {
      // Resume autosave
      autosave.resume();
    }
  }, [restoreVersion, slug, fetchVersions, autosave]);

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
          {/* Version History button - only for authenticated mode with existing prototype */}
          {!isDemoMode && slug && (
            <button
              className={`btn btn-secondary ${showVersionHistory ? 'active' : ''}`}
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              title="Version History"
            >
              History
            </button>
          )}
          {/* Autosave indicator - only show in authenticated mode with existing prototype */}
          {!isDemoMode && prototype && (
            <div className={`autosave-indicator ${autosaveStatus}`}>
              <span className="autosave-dot" />
              <span>
                {autosaveStatus === 'saving' && 'Saving...'}
                {autosaveStatus === 'saved' && 'Saved'}
                {autosaveStatus === 'error' && 'Save failed'}
                {autosaveStatus === 'idle' && 'Autosave on'}
              </span>
            </div>
          )}
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving || (!prototype && isLoadingTeam)}
          >
            {isSaving ? 'Saving...' : (!prototype && isLoadingTeam) ? 'Loading...' : 'Save'}
          </button>
        </div>
      </header>

      <div className="editor-main" style={{ flex: 1, position: 'relative' }}>
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
            editorReadyRef.current = true;
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

            // Clear registered listeners from previous editor session (if any)
            editorListenersRef.current = [];

            // Set up change event listeners for autosave
            // These fire when the user makes changes to the canvas
            // Use ref to always get the latest callback (avoids stale closure issue)
            registerEditorListener(editor, 'component:add', () => {
              debug('[Change detected] component:add');
              triggerDebouncedAutosaveRef.current();
            });
            registerEditorListener(editor, 'component:remove', () => {
              debug('[Change detected] component:remove');
              triggerDebouncedAutosaveRef.current();
            });
            registerEditorListener(editor, 'component:update', () => {
              debug('[Change detected] component:update');
              triggerDebouncedAutosaveRef.current();
            });
            registerEditorListener(editor, 'style:change', () => {
              debug('[Change detected] style:change');
              triggerDebouncedAutosaveRef.current();
            });

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
                    const allComponents = wrapper.components() || [];
                    debug('Components after load:', allComponents.length);
                    allComponents.forEach?.((c: any) => {
                      debug('  -', c.get('type'), c.getClasses?.());
                    });
                  }
                }, 500);
              } catch (e) {
                console.warn('Failed to load project data:', e);
              }
            } else if (!isDemoMode && prototype?.grapesData) {
              try {
                const projectData = prototype.grapesData as any;
                debug('Loading project data from API');
                debug('Project data pages:', projectData.pages?.length || 0);

                // Check if grapesData has actual content (not just empty wrapper)
                // If the first page's frame has no components, skip loading grapesData
                // and let the htmlContent from project config be used instead
                const firstPageComponents = projectData.pages?.[0]?.frames?.[0]?.component?.components;
                const hasActualContent = Array.isArray(firstPageComponents) && firstPageComponents.length > 0;

                if (!hasActualContent) {
                  debug('grapesData is empty, using htmlContent instead');
                  // Don't load empty grapesData - the htmlContent will be parsed from project config
                } else {
                  editor.loadProjectData(projectData);

                  // Log loaded pages for debugging
                  setTimeout(() => {
                    const pages = editor.Pages?.getAll?.() || [];
                    debug('Pages after load:', pages.length);
                    pages.forEach?.((page: any) => {
                      debug('  - Page:', page.get?.('name') || page.getName?.() || 'unnamed');
                    });
                  }, 100);
                }
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
            registerEditorListener(editor, 'component:selected', (component: any) => {
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
            registerEditorListener(editor, 'component:update', (component: any) => {
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
                const canvas = editor.Canvas;

                // Check if canvas is ready before attempting refresh
                // GrapesJS's refresh() fails if Canvas isn't fully initialized
                if (!canvas?.getFrame?.()) {
                  debug('Canvas not ready, skipping refresh');
                  return;
                }

                // Trigger events that help clear internal caches
                editor.trigger?.('frame:updated');

                // Use Canvas.refresh() with spots update
                if (canvas?.refresh) {
                  canvas.refresh({ spots: true });
                }

                // Only call editor.refresh() if Canvas has a frame
                // This prevents "Cannot read properties of undefined (reading 'refresh')" errors
                if (canvas?.getFrame?.()) {
                  editor.refresh?.();
                }

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
                // Silently ignore canvas update errors - they're usually timing issues
                debug('Canvas update skipped due to:', err);
              }
            };

            // Force canvas refresh after component removal
            registerEditorListener(editor, 'component:remove', (component: any) => {
              const tagName = component?.get?.('tagName') || component?.get?.('type');
              debug('Component removed:', tagName);
              // Trigger canvas update after a short delay
              setTimeout(forceCanvasUpdate, 100);
            });

            // Force canvas refresh after component move/reorder (from layers panel or drag)
            registerEditorListener(editor, 'component:drag:end', () => {
              debug('Component drag ended');
              setTimeout(forceCanvasUpdate, 100);
            });

            registerEditorListener(editor, 'sorter:drag:end', () => {
              debug('Sorter drag ended');
              setTimeout(forceCanvasUpdate, 100);
            });

            // Listen for any component update that might affect ordering
            registerEditorListener(editor, 'component:update', () => {
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
            registerEditorListener(editor, 'run:core:canvas-clear', () => {
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
            registerEditorListener(editor, 'run', (commandId: string) => {
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
            registerEditorListener(editor, 'run:core:component-delete', () => {
              debug('core:component-delete command executed');
              setTimeout(forceCanvasUpdate, 100);
            });

            // Override the clear command to ensure it works properly
            const Commands = editor.Commands;
            if (Commands) {
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
                  const components = wrapper.components() || [];
                  debug('Found', components.length || 0, 'components');
                  components.forEach?.((c: any) => debug('  -', c.get('tagName') || c.get('type')));
                  components.reset?.();
                  debug('Components cleared');
                }
                setTimeout(forceCanvasUpdate, 100);
              };

              // Also expose editor for debugging
              (window as any).__editor = editor;
              debug('Debug helpers exposed: window.__clearCanvas(), window.__editor');
            }

            // Page event handlers - GrapesJS handles page state internally
            // We ensure USWDS resources are loaded and refresh the editor
            registerEditorListener(editor, 'page:select', async (page: any) => {
              const pageId = page?.getId?.() || page?.id;
              const pageName = page?.get?.('name') || page?.getName?.() || 'unnamed';
              debug('Page selected:', pageId, '-', pageName);

              // Block saves during page transition
              isPageSwitchingRef.current = true;

              // Wait for GrapesJS to complete the page switch (increased from 100ms to 500ms)
              await new Promise(resolve => setTimeout(resolve, 500));

              try {
                // Ensure USWDS resources are loaded in the frame
                await loadUSWDSResources();

                // Log page state for debugging
                const wrapper = editor.DomComponents?.getWrapper();
                if (wrapper) {
                  const components = wrapper.components();
                  debug('Page has', components?.length || 0, 'top-level components');
                }

                // Force canvas update (includes refresh with safety checks)
                forceCanvasUpdate();

                debug('Page switch completed');
              } catch (err) {
                debug('Page switch warning:', err);
              } finally {
                // Allow saves again after page switch completes
                // Add a small additional delay to ensure GrapesJS internal state is stable
                setTimeout(() => {
                  isPageSwitchingRef.current = false;
                  debug('Page switch lock released');
                }, 200);
              }
            });

            // Track pages that need template (newly created, not loaded from data)
            const pagesNeedingTemplate = new Set<string>();

            registerEditorListener(editor, 'page:add', (page: any) => {
              const pageId = page?.getId?.() || page?.id;
              const pageName = page?.get?.('name') || page?.getName?.() || 'New Page';
              debug('Page added:', pageId, '-', pageName);

              // Log total pages for debugging
              const allPages = editor.Pages?.getAll?.() || [];
              debug('Total pages:', allPages.length);

              // Mark this page as needing a template
              // We'll add the template when the page is selected (fully loaded)
              if (pageId) {
                pagesNeedingTemplate.add(pageId);
                debug('Marked page for template:', pageId);
              }
            });

            // Add template when page is selected (ensures frame is ready)
            registerEditorListener(editor, 'page:select', (page: any) => {
              const pageId = page?.getId?.() || page?.id;
              debug('Page selected:', pageId, 'needs template:', pagesNeedingTemplate.has(pageId));

              if (pageId && pagesNeedingTemplate.has(pageId)) {
                // Remove from set first to prevent re-adding
                pagesNeedingTemplate.delete(pageId);

                // Wait for the frame to be fully ready
                setTimeout(() => {
                  try {
                    // Try multiple ways to get the page's main component
                    let mainComponent = null;

                    // Method 1: getMainComponent (GrapesJS standard)
                    mainComponent = page.getMainComponent?.();
                    debug('Method 1 (getMainComponent):', !!mainComponent);

                    // Method 2: getMainFrame -> getComponent
                    if (!mainComponent) {
                      const mainFrame = page.getMainFrame?.();
                      mainComponent = mainFrame?.getComponent?.();
                      debug('Method 2 (getMainFrame):', !!mainComponent);
                    }

                    // Method 3: frames collection
                    if (!mainComponent) {
                      const frames = page.get?.('frames');
                      if (frames && frames.length > 0) {
                        mainComponent = frames.at?.(0)?.get?.('component');
                      }
                      debug('Method 3 (frames):', !!mainComponent);
                    }

                    // Method 4: Use the editor's current wrapper
                    if (!mainComponent) {
                      mainComponent = editor.DomComponents?.getWrapper?.();
                      debug('Method 4 (editor wrapper):', !!mainComponent);
                    }

                    if (mainComponent) {
                      const existingComponents = mainComponent.components?.();
                      const componentCount = existingComponents?.length || 0;
                      debug('Existing components:', componentCount);

                      // Check if this is GrapesJS default content (heading + text)
                      // or if the page is empty - in either case, apply our template
                      let shouldAddTemplate = componentCount === 0;

                      if (!shouldAddTemplate && componentCount <= 3) {
                        // Check if the existing content is just GrapesJS default
                        // (typically a heading and/or paragraph)
                        const componentTypes = existingComponents.map((c: any) =>
                          c.get?.('tagName')?.toLowerCase() || c.get?.('type') || ''
                        );
                        debug('Component types:', componentTypes);

                        // If it's just simple text elements (h1-h6, p, div), replace with our template
                        const isDefaultContent = componentTypes.every((type: string) =>
                          ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'text', 'default', 'heading-block', 'text-block'].includes(type)
                        );

                        if (isDefaultContent) {
                          debug('Detected GrapesJS default content, will replace with template');
                          shouldAddTemplate = true;
                        }
                      }

                      if (shouldAddTemplate) {
                        debug('Adding USWDS template to new page');

                        // Get the blank template content (without __FULL_HTML__ prefix)
                        const blankTemplate = DEFAULT_CONTENT['blank-template']?.replace('__FULL_HTML__', '') || '';

                        if (blankTemplate) {
                          // Replace all existing content with our template
                          mainComponent.components(blankTemplate);
                          debug('Added default template to new page');

                          // Refresh the canvas to ensure components render
                          setTimeout(() => {
                            editor.refresh();
                          }, 100);
                        }
                      } else {
                        debug('Page has custom content, skipping template');
                      }
                    } else {
                      debug('Could not find main component for page');
                    }
                  } catch (err) {
                    console.warn('[USWDS-PT] Error adding template to new page:', err);
                  }
                }, 200);
              }
            });

            registerEditorListener(editor, 'page:remove', (page: any) => {
              const pageId = page?.getId?.() || page?.id;
              debug('Page removed:', pageId);
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
            registerEditorListener(editor, 'component:selected', (component: any) => {
              updatePageLinkOptions(component);
            });

            // Also update when pages change
            registerEditorListener(editor, 'page', () => {
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

            // Handle usa-banner action button clicks in the canvas
            // This allows the "Here's how you know" toggle to work in edit mode
            const handledBannerDocs = new WeakSet<Document>();
            const setupBannerClickHandler = () => {
              const canvas = editor.Canvas;
              const doc = canvas?.getDocument?.();
              if (doc && !handledBannerDocs.has(doc)) {
                handledBannerDocs.add(doc);
                doc.addEventListener('click', (e: MouseEvent) => {
                  const target = e.target as HTMLElement;

                  // Check if click is within a usa-banner's action button area
                  // The usa-banner web component renders a button with class usa-banner__button
                  // or a link with class usa-banner__button that toggles the expanded state
                  const banner = target.closest('usa-banner') as HTMLElement;
                  if (!banner) return;

                  // Check if click is on the action button or its container
                  // The action area typically includes the header link/button with "Here's how you know"
                  const isActionButton = target.closest('.usa-banner__button') ||
                    target.closest('.usa-banner__header-action') ||
                    target.closest('[aria-controls]');

                  if (isActionButton) {
                    e.preventDefault();
                    e.stopPropagation();

                    // Toggle the expanded state
                    const isCurrentlyExpanded = banner.hasAttribute('expanded');
                    if (isCurrentlyExpanded) {
                      banner.removeAttribute('expanded');
                      (banner as any).expanded = false;
                    } else {
                      banner.setAttribute('expanded', '');
                      (banner as any).expanded = true;
                    }

                    // Trigger Lit component update if available
                    if (typeof (banner as any).requestUpdate === 'function') {
                      (banner as any).requestUpdate();
                    }

                    // Update the GrapesJS component model to keep traits in sync
                    const gjsComponent = editor.DomComponents?.getWrapper()?.find('usa-banner')?.[0];
                    if (gjsComponent) {
                      const attrs = gjsComponent.get('attributes') || {};
                      if (isCurrentlyExpanded) {
                        delete attrs.expanded;
                      } else {
                        attrs.expanded = true;
                      }
                      gjsComponent.set('attributes', { ...attrs });
                    }

                    debug('Toggled usa-banner expanded state:', !isCurrentlyExpanded);
                  }
                }, true); // Use capture phase to intercept before GrapesJS
              }
            };

            // Handle usa-accordion header clicks in the canvas
            // This allows accordion sections to expand/collapse when clicking headers
            const handledAccordionDocs = new WeakSet<Document>();
            const setupAccordionClickHandler = () => {
              const canvas = editor.Canvas;
              const doc = canvas?.getDocument?.();
              if (doc && !handledAccordionDocs.has(doc)) {
                handledAccordionDocs.add(doc);
                doc.addEventListener('click', (e: MouseEvent) => {
                  const target = e.target as HTMLElement;

                  // Check if click is within a usa-accordion's header button
                  const accordion = target.closest('usa-accordion') as HTMLElement;
                  if (!accordion) return;

                  // Check if click is on an accordion header button
                  const headerButton = target.closest('.usa-accordion__button') ||
                    target.closest('[aria-controls^="accordion"]') ||
                    target.closest('button[aria-expanded]');

                  if (headerButton && headerButton.closest('usa-accordion') === accordion) {
                    e.preventDefault();
                    e.stopPropagation();

                    // Find which section this button controls
                    const ariaControls = headerButton.getAttribute('aria-controls');
                    const isExpanded = headerButton.getAttribute('aria-expanded') === 'true';

                    // Toggle the section
                    headerButton.setAttribute('aria-expanded', String(!isExpanded));

                    // Find and toggle the content panel
                    if (ariaControls) {
                      const content = accordion.querySelector(`#${ariaControls}`) as HTMLElement;
                      if (content) {
                        content.hidden = isExpanded;
                      }
                    }

                    // Trigger Lit component update if available
                    if (typeof (accordion as any).requestUpdate === 'function') {
                      (accordion as any).requestUpdate();
                    }

                    debug('Toggled usa-accordion section:', ariaControls, 'expanded:', !isExpanded);
                  }
                }, true);
              }
            };

            // Handle usa-modal trigger clicks in the canvas
            // This allows the modal trigger button to open the modal
            const handledModalDocs = new WeakSet<Document>();
            const setupModalClickHandler = () => {
              const canvas = editor.Canvas;
              const doc = canvas?.getDocument?.();
              if (doc && !handledModalDocs.has(doc)) {
                handledModalDocs.add(doc);
                doc.addEventListener('click', (e: MouseEvent) => {
                  const target = e.target as HTMLElement;

                  // Check if click is within a usa-modal's trigger
                  const modal = target.closest('usa-modal') as HTMLElement;
                  if (!modal) return;

                  // Check if click is on the modal trigger
                  const isTrigger = target.closest('.usa-modal__trigger') ||
                    target.closest('[data-open-modal]') ||
                    target.closest('.usa-button[aria-controls]');

                  // Check if click is on a close button
                  const isCloseButton = target.closest('[data-close-modal]') ||
                    target.closest('.usa-modal__close');

                  if (isTrigger) {
                    e.preventDefault();
                    e.stopPropagation();

                    // Open the modal by setting the open attribute
                    modal.setAttribute('open', '');
                    (modal as any).open = true;

                    if (typeof (modal as any).requestUpdate === 'function') {
                      (modal as any).requestUpdate();
                    }

                    debug('Opened usa-modal');
                  } else if (isCloseButton) {
                    e.preventDefault();
                    e.stopPropagation();

                    // Close the modal
                    modal.removeAttribute('open');
                    (modal as any).open = false;

                    if (typeof (modal as any).requestUpdate === 'function') {
                      (modal as any).requestUpdate();
                    }

                    debug('Closed usa-modal');
                  }
                }, true);
              }
            };

            // Set up handler when canvas is ready and on page changes
            registerEditorListener(editor, 'canvas:frame:load', setupPageLinkHandler);
            registerEditorListener(editor, 'canvas:frame:load', setupBannerClickHandler);
            registerEditorListener(editor, 'canvas:frame:load', setupAccordionClickHandler);
            registerEditorListener(editor, 'canvas:frame:load', setupModalClickHandler);
            registerEditorListener(editor, 'page:select', setupPageLinkHandler);
            registerEditorListener(editor, 'page:select', setupBannerClickHandler);
            registerEditorListener(editor, 'page:select', setupAccordionClickHandler);
            registerEditorListener(editor, 'page:select', setupModalClickHandler);

            // Note: Project data is already loaded above (line ~1062-1065)
            // Do NOT call loadProjectData again here as it causes duplicate loading
            // and can interfere with page state

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

              // Check if resources are already loaded AND functional in this document
              const existingLink = doc.querySelector('link[href*="uswds"]') as HTMLLinkElement;
              if (existingLink && existingLink.sheet) {
                debug('USWDS resources already loaded in this canvas');
                return;
              }

              // If link exists but stylesheet not loaded, remove stale links
              if (existingLink && !existingLink.sheet) {
                debug('Removing stale USWDS link tags');
                doc.querySelectorAll('link[href*="uswds"]').forEach(el => el.remove());
                doc.querySelectorAll('script[src*="uswds"]').forEach(el => el.remove());
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
            registerEditorListener(editor, 'canvas:frame:load', loadUSWDSResources);

            // Also load on initial ready
            loadUSWDSResources();
          }}
        />

        {/* Version History Sidebar */}
        {showVersionHistory && !isDemoMode && slug && (
          <VersionHistoryPanel
            versions={versions}
            isLoading={versionsLoading}
            isRestoring={isRestoring}
            error={versionError}
            onRestore={handleVersionRestore}
            onRefresh={fetchVersions}
            onClose={() => setShowVersionHistory(false)}
          />
        )}
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
