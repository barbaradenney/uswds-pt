import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { cleanExport } from '../lib/export';
import { getPrototype, createPrototype } from '../lib/localStorage';
import { initializeUSWDSComponents } from '../lib/uswds-init';

// CDN URLs for USWDS resources
const USWDS_VERSION = '3.8.1';
const USWDS_WC_BUNDLE_VERSION = '2.5.12';

const PREVIEW_CDN_URLS = {
  uswdsCss: `https://cdn.jsdelivr.net/npm/@uswds/uswds@${USWDS_VERSION}/dist/css/uswds.min.css`,
  uswdsWcJs: `https://cdn.jsdelivr.net/npm/@uswds-wc/bundle@${USWDS_WC_BUNDLE_VERSION}/uswds-wc.js`,
  uswdsWcCss: `https://cdn.jsdelivr.net/npm/@uswds-wc/bundle@${USWDS_WC_BUNDLE_VERSION}/uswds-wc.css`,
};

// Check if we're in demo mode
const isDemoMode = !import.meta.env.VITE_API_URL;

interface PreviewData {
  name: string;
  htmlContent: string;
  gjsData?: string;
}

export function Preview() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stylesLoaded, setStylesLoaded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Inject stylesheets into document head
  useEffect(() => {
    const head = document.head;
    const existingLinks = head.querySelectorAll('link[data-uswds-preview]');

    // Only add if not already present
    if (existingLinks.length === 0) {
      // Add USWDS CSS
      const uswdsCssLink = document.createElement('link');
      uswdsCssLink.rel = 'stylesheet';
      uswdsCssLink.href = PREVIEW_CDN_URLS.uswdsCss;
      uswdsCssLink.setAttribute('data-uswds-preview', 'true');
      head.appendChild(uswdsCssLink);

      // Add USWDS Web Components CSS
      const wcCssLink = document.createElement('link');
      wcCssLink.rel = 'stylesheet';
      wcCssLink.href = PREVIEW_CDN_URLS.uswdsWcCss;
      wcCssLink.setAttribute('data-uswds-preview', 'true');
      head.appendChild(wcCssLink);

      // Add USWDS Web Components JS
      const wcScript = document.createElement('script');
      wcScript.type = 'module';
      wcScript.src = PREVIEW_CDN_URLS.uswdsWcJs;
      wcScript.setAttribute('data-uswds-preview', 'true');
      head.appendChild(wcScript);

      // Wait for CSS to load
      uswdsCssLink.onload = () => setStylesLoaded(true);
      uswdsCssLink.onerror = () => setStylesLoaded(true); // Continue even if CSS fails
    } else {
      setStylesLoaded(true);
    }

    return () => {
      // Cleanup on unmount
      const links = head.querySelectorAll('[data-uswds-preview]');
      links.forEach(link => link.remove());
    };
  }, []);

  useEffect(() => {
    if (slug) {
      loadPreview(slug);
    }
  }, [slug]);

  // Set document title when data is loaded
  useEffect(() => {
    if (data?.name) {
      document.title = `${data.name} - Preview`;
    }
  }, [data?.name]);

  // Clean the HTML content (memoized to avoid recalculating on every render)
  const cleanedHtml = data?.htmlContent ? cleanExport(data.htmlContent) : '';

  // Initialize USWDS components after content is rendered
  useEffect(() => {
    if (contentRef.current && stylesLoaded && data) {
      // Small delay to ensure web components are defined
      const timer = setTimeout(() => {
        initializeUSWDSComponents(contentRef.current!);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [cleanedHtml, stylesLoaded, data]);

  async function loadPreview(prototypeSlug: string) {
    try {
      setIsLoading(true);
      setError(null);

      // In demo mode, try to load from localStorage first
      if (isDemoMode) {
        const localProto = getPrototype(prototypeSlug);
        if (localProto) {
          setData({
            name: localProto.name,
            htmlContent: localProto.htmlContent,
            gjsData: localProto.gjsData,
          });
          return;
        }
      }

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

  function handleMakeCopy() {
    if (!data) return;

    // Create a copy of the prototype in localStorage
    const copyName = `${data.name} (Copy)`;
    const newPrototype = createPrototype(copyName, data.htmlContent, data.gjsData);

    // Open the editor with the new prototype
    const baseUrl = window.location.origin;
    window.open(`${baseUrl}/edit/${newPrototype.id}`, '_blank');
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

  // Wait for both data and styles before rendering
  if (!stylesLoaded) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <p style={{ color: '#71767a' }}>Loading styles...</p>
      </div>
    );
  }

  const copyButtonStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '16px',
    right: '16px',
    padding: '8px 16px',
    backgroundColor: '#005ea2',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'system-ui, sans-serif',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    zIndex: 1000,
  };

  // Render the prototype content (styles are injected via useEffect into document head)
  return (
    <>
      <div ref={contentRef} dangerouslySetInnerHTML={{ __html: cleanedHtml }} />
      <button
        style={copyButtonStyle}
        onClick={handleMakeCopy}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1a4480')}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#005ea2')}
      >
        Make a Copy
      </button>
    </>
  );
}
