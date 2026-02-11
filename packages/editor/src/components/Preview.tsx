import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { cleanExport, generateFullDocument, generateMultiPageDocument } from '../lib/export';
import type { PageData } from '../lib/export';
import { getPrototype } from '../lib/localStorage';
import { getAuthToken } from '../contexts/AuthContext';
import { escapeHtml, createDebugLogger } from '@uswds-pt/shared';

const debug = createDebugLogger('Preview');

// Check if we're in demo mode
const isDemoMode = !import.meta.env.VITE_API_URL;

interface PreviewData {
  name: string;
  htmlContent: string;
  gjsData?: string;
  stateDefinitions?: Array<{ id: string; name: string }>;
  userDefinitions?: Array<{ id: string; name: string }>;
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
    debug('Failed to parse gjsData:', e);
    return [];
  }
}

/**
 * Recursively build HTML from GrapesJS component tree
 */
function buildHtmlFromComponent(component: any): string {
  if (!component) return '';

  // Handle text nodes — output content as escaped plain text, no wrapping tag
  if (component.type === 'textnode') {
    return escapeHtml(component.content || '');
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

  return `<${tagName}${attrString}>${escapeHtml(content)}${childrenHtml}</${tagName}>`;
}

export function Preview() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStateId, setActiveStateId] = useState<string | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

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

  // State/user definitions from API response (org-level)
  const states = useMemo(() => {
    return data?.stateDefinitions || [];
  }, [data?.stateDefinitions]);

  const users = useMemo(() => {
    return data?.userDefinitions || [];
  }, [data?.userDefinitions]);

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
      return generateMultiPageDocument(pages, { title: data?.name, activeStateId, activeUserId });
    }
    if (cleanedHtml) {
      return generateFullDocument(cleanedHtml, { title: data?.name, activeStateId, activeUserId });
    }
    return '';
  }, [cleanedHtml, isMultiPage, pages, data?.name, activeStateId, activeUserId]);

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

      // Use the preview API endpoint (sends auth token if available for non-public prototypes)
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const headers: Record<string, string> = {};
      const token = getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${apiUrl}/api/preview/${prototypeSlug}`, { headers });

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

  // Render preview content in a sandboxed iframe to isolate it from
  // the parent application context (prevents stored XSS from accessing
  // cookies/localStorage). allow-scripts is needed for web component JS.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {(states.length > 0 || users.length > 0) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '6px 12px',
          background: '#f0f0f0',
          borderBottom: '1px solid #ddd',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '0.8125rem',
          flexShrink: 0,
        }}>
          {states.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label htmlFor="preview-state-select" style={{ fontWeight: 500, color: '#1b1b1b' }}>
                State:
              </label>
              <select
                id="preview-state-select"
                value={activeStateId || ''}
                onChange={(e) => setActiveStateId(e.target.value || null)}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '0.8125rem',
                }}
              >
                <option value="">All States</option>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          {users.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label htmlFor="preview-user-select" style={{ fontWeight: 500, color: '#1b1b1b' }}>
                User:
              </label>
              <select
                id="preview-user-select"
                value={activeUserId || ''}
                onChange={(e) => setActiveUserId(e.target.value || null)}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '0.8125rem',
                }}
              >
                <option value="">All Users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
      <iframe
        sandbox="allow-scripts"
        srcDoc={previewDoc}
        title={`Preview: ${data.name || 'Prototype'}`}
        style={{
          width: '100%',
          flex: 1,
          border: 'none',
          display: 'block',
        }}
      />
    </div>
  );
}
