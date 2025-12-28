import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { cleanExport } from '../lib/export';

// CDN URLs for USWDS resources
const USWDS_VERSION = '3.8.1';
const USWDS_WC_BUNDLE_VERSION = '2.5.7';

const PREVIEW_CDN_URLS = {
  uswdsCss: `https://cdn.jsdelivr.net/npm/@uswds/uswds@${USWDS_VERSION}/dist/css/uswds.min.css`,
  uswdsWcJs: `https://cdn.jsdelivr.net/npm/@uswds-wc/bundle@${USWDS_WC_BUNDLE_VERSION}/uswds-wc.js`,
  uswdsWcCss: `https://cdn.jsdelivr.net/npm/@uswds-wc/bundle@${USWDS_WC_BUNDLE_VERSION}/uswds-wc.css`,
};

interface PreviewData {
  name: string;
  htmlContent: string;
}

export function Preview() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      loadPreview(slug);
    }
  }, [slug]);

  async function loadPreview(prototypeSlug: string) {
    try {
      setIsLoading(true);
      setError(null);

      // Use the public preview API endpoint (no auth required)
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/preview/${prototypeSlug}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Prototype not found');
          return;
        }
        throw new Error('Failed to load preview');
      }

      const result: PreviewData = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e0e0e0',
            borderTopColor: '#005ea2',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#71767a' }}>Loading preview...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{
          textAlign: 'center',
          padding: '48px',
          maxWidth: '400px',
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            color: '#1b1b1b',
            marginBottom: '12px',
          }}>
            Unable to Load Preview
          </h1>
          <p style={{ color: '#71767a' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Clean the HTML content
  const cleanedHtml = cleanExport(data.htmlContent);

  // Render the full preview with USWDS resources
  return (
    <>
      {/* Inject USWDS styles */}
      <link rel="stylesheet" href={PREVIEW_CDN_URLS.uswdsCss} />
      <link rel="stylesheet" href={PREVIEW_CDN_URLS.uswdsWcCss} />
      <script type="module" src={PREVIEW_CDN_URLS.uswdsWcJs} />

      {/* Set document title */}
      <title>{data.name} - Preview</title>

      {/* Render the prototype content */}
      <div dangerouslySetInnerHTML={{ __html: cleanedHtml }} />
    </>
  );
}
