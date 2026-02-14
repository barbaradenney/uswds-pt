import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { cleanExport } from '../lib/export';
import { getPrototype, createPrototype } from '../lib/localStorage';
import { isDemoMode, API_URL, API_ENDPOINTS } from '../lib/api';

// CDN URLs for USWDS resources
const USWDS_VERSION = '3.8.1';
const USWDS_WC_BUNDLE_VERSION = '2.5.12';

const EMBED_CDN_URLS = {
  uswdsCss: `https://cdn.jsdelivr.net/npm/@uswds/uswds@${USWDS_VERSION}/dist/css/uswds.min.css`,
  uswdsWcJs: `https://cdn.jsdelivr.net/npm/@uswds-wc/bundle@${USWDS_WC_BUNDLE_VERSION}/uswds-wc.js`,
  uswdsWcCss: `https://cdn.jsdelivr.net/npm/@uswds-wc/bundle@${USWDS_WC_BUNDLE_VERSION}/uswds-wc.css`,
};

interface EmbedData {
  name: string;
  htmlContent: string;
  gjsData?: string;
}

/**
 * Embed component for iframe embedding in documentation
 *
 * Query parameters:
 * - padding: Padding around content in pixels (default: 16)
 * - bg: Background color (default: white, use 'transparent' for no background)
 * - maxWidth: Max width of content (default: none)
 * - hideOverflow: Hide overflow content (default: false)
 * - copy: Show "Make a Copy" button (default: true, use 'false' to hide)
 *
 * Example usage:
 * <iframe src="https://site.com/embed/my-prototype?padding=24&bg=f5f5f5" />
 * <iframe src="https://site.com/embed/my-prototype?copy=false" /> <!-- Hide copy button -->
 */
export function Embed() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<EmbedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stylesLoaded, setStylesLoaded] = useState(false);

  // Parse query parameters
  const padding = searchParams.get('padding') || '16';
  const bg = searchParams.get('bg') || 'white';
  const maxWidth = searchParams.get('maxWidth') || '';
  const hideOverflow = searchParams.get('hideOverflow') === 'true';
  const showCopyButton = searchParams.get('copy') !== 'false'; // Show by default

  // Inject stylesheets into document head
  useEffect(() => {
    const head = document.head;
    const existingLinks = head.querySelectorAll('link[data-uswds-embed]');

    // Only add if not already present
    if (existingLinks.length === 0) {
      // Add USWDS CSS
      const uswdsCssLink = document.createElement('link');
      uswdsCssLink.rel = 'stylesheet';
      uswdsCssLink.href = EMBED_CDN_URLS.uswdsCss;
      uswdsCssLink.setAttribute('data-uswds-embed', 'true');
      head.appendChild(uswdsCssLink);

      // Add USWDS Web Components CSS
      const wcCssLink = document.createElement('link');
      wcCssLink.rel = 'stylesheet';
      wcCssLink.href = EMBED_CDN_URLS.uswdsWcCss;
      wcCssLink.setAttribute('data-uswds-embed', 'true');
      head.appendChild(wcCssLink);

      // Add USWDS Web Components JS
      const wcScript = document.createElement('script');
      wcScript.type = 'module';
      wcScript.src = EMBED_CDN_URLS.uswdsWcJs;
      wcScript.setAttribute('data-uswds-embed', 'true');
      head.appendChild(wcScript);

      // Wait for CSS to load
      uswdsCssLink.onload = () => setStylesLoaded(true);
      uswdsCssLink.onerror = () => setStylesLoaded(true);
    } else {
      setStylesLoaded(true);
    }

    // Set body styles for embed
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.background = bg === 'transparent' ? 'transparent' : `#${bg.replace('#', '')}`;
    if (bg === 'white') {
      document.body.style.background = 'white';
    }

    return () => {
      const links = head.querySelectorAll('[data-uswds-embed]');
      links.forEach(link => link.remove());
    };
  }, [bg]);

  useEffect(() => {
    if (slug) {
      loadEmbed(slug);
    }
  }, [slug]);

  async function loadEmbed(prototypeSlug: string) {
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

      const response = await fetch(`${API_URL}${API_ENDPOINTS.PREVIEW(prototypeSlug)}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Not found');
          return;
        }
        throw new Error('Failed to load');
      }

      const result: EmbedData = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
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
    // Use hash-based URL for GitHub Pages compatibility with HashRouter
    const basePath = window.location.pathname.split('#')[0].replace(/\/$/, '');
    const baseUrl = window.location.origin + basePath;
    window.open(`${baseUrl}/#/edit/${newPrototype.id}`, '_blank');
  }

  // Minimal loading state for embeds
  if (isLoading || !stylesLoaded) {
    return (
      <div style={{
        padding: `${padding}px`,
        fontFamily: 'system-ui, sans-serif',
        color: '#71767a',
        fontSize: '14px',
      }}>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: `${padding}px`,
        fontFamily: 'system-ui, sans-serif',
        color: '#b50909',
        fontSize: '14px',
      }}>
        {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const cleanedHtml = cleanExport(data.htmlContent);

  const containerStyle: React.CSSProperties = {
    padding: `${padding}px`,
    maxWidth: maxWidth || undefined,
    margin: maxWidth ? '0 auto' : undefined,
    overflow: hideOverflow ? 'hidden' : undefined,
  };

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

  return (
    <>
      <div style={containerStyle} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cleanedHtml) }} />
      {showCopyButton && (
        <button
          style={copyButtonStyle}
          onClick={handleMakeCopy}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1a4480')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#005ea2')}
        >
          Make a Copy
        </button>
      )}
    </>
  );
}
