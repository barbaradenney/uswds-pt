import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Prototype } from '@uswds-pt/shared';
import { authFetch } from '../hooks/useAuth';
import { ExportModal } from './ExportModal';
import { DEFAULT_CONTENT, COMPONENT_ICONS } from '@uswds-pt/adapter';
import StudioEditor from '@grapesjs/studio-sdk/react';
import '@grapesjs/studio-sdk/style';

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

  // Generate blocks from USWDS components
  const blocks = Object.entries(DEFAULT_CONTENT).map(([tagName, content]) => ({
    id: tagName,
    label: tagName.replace('usa-', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    content,
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

            // Load existing project data if available
            if (prototype?.grapesData && Object.keys(prototype.grapesData).length > 0) {
              editor.loadProjectData(prototype.grapesData as any);
            }

            // Add USWDS-WC styles and scripts to canvas
            const canvas = editor.Canvas;
            if (canvas) {
              const frame = canvas.getFrameEl();
              if (frame?.contentDocument) {
                // Load USWDS-WC core styles
                const styles = frame.contentDocument.createElement('link');
                styles.rel = 'stylesheet';
                styles.href = 'https://unpkg.com/@uswds-wc/core@2.5.3/styles.css';
                frame.contentDocument.head.appendChild(styles);

                // Load USWDS-WC component packages via ES modules
                const importMap = frame.contentDocument.createElement('script');
                importMap.type = 'importmap';
                importMap.textContent = JSON.stringify({
                  imports: {
                    'lit': 'https://unpkg.com/lit@3/index.js?module',
                    'lit/': 'https://unpkg.com/lit@3/',
                    '@lit/reactive-element': 'https://unpkg.com/@lit/reactive-element@2?module',
                    '@lit/reactive-element/': 'https://unpkg.com/@lit/reactive-element@2/',
                    'lit-html': 'https://unpkg.com/lit-html@3?module',
                    'lit-html/': 'https://unpkg.com/lit-html@3/',
                    'lit-element/': 'https://unpkg.com/lit-element@4/',
                  }
                });
                frame.contentDocument.head.appendChild(importMap);

                // Load all USWDS-WC component packages
                const packages = ['actions', 'forms', 'feedback', 'navigation', 'data-display', 'layout', 'patterns'];
                packages.forEach(pkg => {
                  const script = frame.contentDocument!.createElement('script');
                  script.type = 'module';
                  script.src = `https://unpkg.com/@uswds-wc/${pkg}@2.5.3/dist/index.js`;
                  frame.contentDocument!.head.appendChild(script);
                });
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
