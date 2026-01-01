import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { cleanExport } from '../lib/export';

// CDN URLs for USWDS resources
const USWDS_VERSION = '3.8.1';
const USWDS_WC_BUNDLE_VERSION = '2.5.10';

const EMBED_CDN_URLS = {
  uswdsCss: `https://cdn.jsdelivr.net/npm/@uswds/uswds@${USWDS_VERSION}/dist/css/uswds.min.css`,
  uswdsWcJs: `https://cdn.jsdelivr.net/npm/@uswds-wc/bundle@${USWDS_WC_BUNDLE_VERSION}/uswds-wc.js`,
  uswdsWcCss: `https://cdn.jsdelivr.net/npm/@uswds-wc/bundle@${USWDS_WC_BUNDLE_VERSION}/uswds-wc.css`,
};

interface EmbedData {
  name: string;
  htmlContent: string;
}

/**
 * Embed component for iframe embedding in documentation
 *
 * Query parameters:
 * - padding: Padding around content in pixels (default: 16)
 * - bg: Background color (default: white, use 'transparent' for no background)
 * - maxWidth: Max width of content (default: none)
 * - hideOverflow: Hide overflow content (default: false)
 *
 * Example usage:
 * <iframe src="https://site.com/embed/my-prototype?padding=24&bg=f5f5f5" />
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

      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/preview/${prototypeSlug}`);

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

  return (
    <div style={containerStyle} dangerouslySetInnerHTML={{ __html: cleanedHtml }} />
  );
}
