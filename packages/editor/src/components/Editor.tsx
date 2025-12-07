import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Prototype, GrapesProjectData } from '@uswds-pt/shared';
import { authFetch } from '../hooks/useAuth';
import { ExportModal } from './ExportModal';

/**
 * Placeholder Editor Component
 *
 * NOTE: This is a placeholder. The actual GrapesJS Studio SDK integration
 * requires an Enterprise license. Once acquired, replace this with:
 *
 * import StudioEditor from '@grapesjs/studio-sdk/react';
 * import '@grapesjs/studio-sdk/style';
 */

export function Editor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [prototype, setPrototype] = useState<Prototype | null>(null);
  const [name, setName] = useState('Untitled Prototype');
  const [htmlContent, setHtmlContent] = useState('');
  const [grapesData, setGrapesData] = useState<GrapesProjectData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setGrapesData(data.grapesData);
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
      const url = prototype
        ? `/api/prototypes/${prototype.slug}`
        : '/api/prototypes';
      const method = prototype ? 'PUT' : 'POST';

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          htmlContent,
          grapesData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save prototype');
      }

      const data: Prototype = await response.json();

      if (!prototype) {
        // Navigate to the edit URL after creating
        navigate(`/edit/${data.slug}`, { replace: true });
      }

      setPrototype(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [prototype, name, htmlContent, grapesData, navigate]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading editor...</p>
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
            onClick={() => setShowExport(true)}
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

      <div className="editor-main">
        {/*
          PLACEHOLDER: GrapesJS Studio SDK Editor

          Once you have the Enterprise license, replace this with:

          <StudioEditor
            options={editorConfig}
            onReady={(editor) => {
              // Load existing project data
              if (grapesData.pages) {
                editor.loadProjectData(grapesData);
              }
            }}
          />
        */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5f5',
            padding: '48px',
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '48px',
              borderRadius: '8px',
              maxWidth: '600px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <h2 style={{ marginBottom: '16px' }}>GrapesJS Studio SDK Required</h2>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              This editor requires the GrapesJS Studio SDK Enterprise license.
              Once acquired, the full visual editor will be available here.
            </p>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              The adapter package is ready to integrate with the SDK. See the
              plan document for integration details.
            </p>

            <div
              style={{
                background: '#f0f0f0',
                padding: '16px',
                borderRadius: '4px',
                textAlign: 'left',
                fontFamily: 'monospace',
                fontSize: '14px',
              }}
            >
              <p style={{ margin: 0 }}>npm install @grapesjs/studio-sdk</p>
            </div>

            <div style={{ marginTop: '24px' }}>
              <h3 style={{ marginBottom: '12px' }}>Temporary HTML Editor</h3>
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="<usa-button>Click me</usa-button>"
                style={{
                  width: '100%',
                  minHeight: '200px',
                  padding: '12px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
            </div>
          </div>
        </div>
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
