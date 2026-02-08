import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { cleanExport, generateFullDocument, generateMultiPageDocument } from '../lib/export';
import type { PageData } from '../lib/export';
import { getPrototype, createPrototype } from '../lib/localStorage';
import { escapeHtml } from '@uswds-pt/shared';

// Check if we're in demo mode
const isDemoMode = !import.meta.env.VITE_API_URL;

interface PreviewData {
  name: string;
  htmlContent: string;
  gjsData?: string;
}

/**
 * Extract pages from GrapesJS project data
 */
function extractPagesFromGjsData(gjsDataString: string | undefined): PageData[] {
  if (!gjsDataString) return [];

  try {
    const gjsData = typeof gjsDataString === 'string' ? JSON.parse(gjsDataString) : gjsDataString;
    const pages = gjsData?.pages || [];

    if (!Array.isArray(pages) || pages.length === 0) return [];

    return pages.map((page: any) => {
      // Prefer pre-rendered HTML stored at save time (new saves)
      let html = page.htmlContent || '';

      // Fall back to reconstructing from component tree (old data)
      if (!html) {
        const mainFrame = page.frames?.[0];
        const component = mainFrame?.component;
        if (component) {
          html = buildHtmlFromComponent(component);
        }
      }

      return {
        id: page.id || '',
        name: page.name || 'Page',
        html,
      };
    }).filter((page: PageData) => page.id && page.html);
  } catch (e) {
    console.error('Failed to parse gjsData:', e);
    return [];
  }
}

/**
 * Recursively build HTML from GrapesJS component tree
 */
function buildHtmlFromComponent(component: any): string {
  if (!component) return '';

  // Handle text nodes — output content as plain text, no wrapping tag
  if (component.type === 'textnode') {
    return component.content || '';
  }

  const tagName = component.tagName || 'div';
  const attributes = component.attributes || {};
  const components = component.components || [];
  const content = component.content || '';

  // Skip wrapper components that don't render
  if (tagName === 'wrapper' || component.type === 'wrapper') {
    return components.map((c: any) => buildHtmlFromComponent(c)).join('');
  }

  // Build attribute string — escape all HTML special characters
  const attrParts: string[] = [];
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined && value !== null && value !== '') {
      attrParts.push(`${key}="${escapeHtml(String(value))}"`);
    }
  }

  // Handle classes
  const classes = component.classes || [];
  if (classes.length > 0) {
    const classNames = classes.map((c: any) => typeof c === 'string' ? c : c.name).join(' ');
    if (classNames) {
      attrParts.push(`class="${escapeHtml(classNames)}"`);
    }
  }

  const attrString = attrParts.length > 0 ? ' ' + attrParts.join(' ') : '';

  // Self-closing tags
  const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
  if (voidElements.includes(tagName.toLowerCase())) {
    return `<${tagName}${attrString}>`;
  }

  // Build children HTML
  const childrenHtml = components.map((c: any) => buildHtmlFromComponent(c)).join('');

  return `<${tagName}${attrString}>${content}${childrenHtml}</${tagName}>`;
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

  // Set document title when data is loaded
  useEffect(() => {
    if (data?.name) {
      document.title = `${data.name} - Preview`;
    }
  }, [data?.name]);

  // Extract pages from gjsData if available
  const pages = useMemo(() => {
    return extractPagesFromGjsData(data?.gjsData);
  }, [data?.gjsData]);

  // Determine if we have multi-page content
  const isMultiPage = pages.length > 1;

  // Clean the HTML content - memoized to avoid recalculating on every render
  const cleanedHtml = useMemo(() => {
    if (!data?.htmlContent) return '';
    return cleanExport(data.htmlContent);
  }, [data?.htmlContent]);

  // Build a complete HTML document for the sandboxed iframe.
  // Uses generateFullDocument / generateMultiPageDocument from export.ts,
  // which include USWDS CDN resources, init scripts, and page navigation.
  const previewDoc = useMemo(() => {
    if (isMultiPage && pages.length > 0) {
      return generateMultiPageDocument(pages, { title: data?.name });
    }
    if (cleanedHtml) {
      return generateFullDocument(cleanedHtml, { title: data?.name });
    }
    return '';
  }, [cleanedHtml, isMultiPage, pages, data?.name]);

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

      const result = await response.json();

      // Validate response shape before using
      if (!result || typeof result.htmlContent !== 'string') {
        setError('Invalid prototype data');
        return;
      }

      setData(result as PreviewData);
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
    // Use hash-based URL for GitHub Pages compatibility with HashRouter
    const basePath = window.location.pathname.split('#')[0].replace(/\/$/, '');
    const baseUrl = window.location.origin + basePath;
    window.open(`${baseUrl}/#/edit/${newPrototype.id}`, '_blank');
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

  if (!data || !previewDoc) {
    return null;
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

  // Render preview content in a sandboxed iframe to isolate it from
  // the parent application context (prevents stored XSS from accessing
  // cookies/localStorage). allow-scripts is needed for web component JS.
  return (
    <>
      <iframe
        sandbox="allow-scripts"
        srcDoc={previewDoc}
        title={`Preview: ${data.name || 'Prototype'}`}
        style={{
          width: '100%',
          height: '100vh',
          border: 'none',
          display: 'block',
        }}
      />
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
