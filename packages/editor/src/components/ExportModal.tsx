import { useState, useMemo } from 'react';
import { cleanExport, generateFullDocument, generateMultiPageDocument, type PageData } from '../lib/export';
import { COPY_FEEDBACK_MS, COPY_ERROR_FEEDBACK_MS } from '../lib/constants';

interface ExportModalProps {
  /** HTML content for single-page export */
  htmlContent: string;
  /** Optional pages data for multi-page export */
  pages?: PageData[];
  /** Prototype ID for embed URL (enables Embed tab) */
  prototypeId?: string;
  onClose: () => void;
}

type ExportMode = 'snippet' | 'full' | 'embed';

export function ExportModal({ htmlContent, pages, prototypeId, onClose }: ExportModalProps) {
  const [mode, setMode] = useState<ExportMode>('snippet');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);

  // Embed-specific state
  const [embedCopied, setEmbedCopied] = useState<'url' | 'iframe' | null>(null);
  const [embedPadding, setEmbedPadding] = useState('16');
  const [embedMaxWidth, setEmbedMaxWidth] = useState('');
  const [embedHeight, setEmbedHeight] = useState('400');

  const isMultiPage = pages && pages.length > 1;

  // For multi-page, get the selected page's content or combine all
  const getSnippetHtml = () => {
    if (isMultiPage) {
      // In snippet mode, show selected page or all pages combined
      if (selectedPageIndex === -1) {
        // All pages combined
        return pages.map(p => `<!-- Page: ${p.name} -->\n${cleanExport(p.html)}`).join('\n\n');
      }
      return cleanExport(pages[selectedPageIndex].html);
    }
    return cleanExport(htmlContent);
  };

  const getFullHtml = () => {
    if (isMultiPage) {
      return generateMultiPageDocument(pages);
    }
    return generateFullDocument(cleanExport(htmlContent));
  };

  const cleanHtml = getSnippetHtml();
  const fullHtml = getFullHtml();

  const displayHtml = mode === 'snippet' ? cleanHtml : fullHtml;

  // Embed URL and iframe code
  const embedUrl = useMemo(() => {
    if (!prototypeId) return '';
    const basePath = window.location.pathname.split('#')[0].replace(/\/$/, '');
    const baseUrl = window.location.origin + basePath;
    const embedPath = `#/embed/${prototypeId}`;

    const queryParams = new URLSearchParams();
    if (embedPadding !== '16') queryParams.set('padding', embedPadding);
    if (embedMaxWidth) queryParams.set('maxWidth', embedMaxWidth);

    const queryString = queryParams.toString();
    return `${baseUrl}/${embedPath}${queryString ? '?' + queryString : ''}`;
  }, [prototypeId, embedPadding, embedMaxWidth]);

  const iframeCode = useMemo(() => `<iframe
  src="${embedUrl}"
  width="100%"
  height="${embedHeight}"
  frameborder="0"
  title="USWDS Prototype"
></iframe>`, [embedUrl, embedHeight]);

  async function handleCopy() {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(displayHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      // Fallback for older browsers
      try {
        const textarea = document.createElement('textarea');
        textarea.value = displayHtml;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (success) {
          setCopied(true);
          setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
        } else {
          setCopyError(true);
          setTimeout(() => setCopyError(false), COPY_ERROR_FEEDBACK_MS);
        }
      } catch {
        setCopyError(true);
        setTimeout(() => setCopyError(false), COPY_ERROR_FEEDBACK_MS);
      }
    }
  }

  function handleDownload() {
    const filename = mode === 'full' ? 'prototype.html' : 'snippet.html';
    const blob = new Blob([displayHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleEmbedCopy(type: 'url' | 'iframe') {
    const text = type === 'url' ? embedUrl : iframeCode;
    try {
      await navigator.clipboard.writeText(text);
      setEmbedCopied(type);
      setTimeout(() => setEmbedCopied(null), COPY_FEEDBACK_MS);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setEmbedCopied(type);
      setTimeout(() => setEmbedCopied(null), COPY_FEEDBACK_MS);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
      >
        <div className="modal-header">
          <h2 id="export-modal-title">Export Prototype</h2>
          <button
            className="btn"
            onClick={onClose}
            style={{ padding: '4px 8px' }}
            aria-label="Close export dialog"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="export-tabs" role="tablist" aria-label="Export format options">
            <button
              className={`export-tab ${mode === 'snippet' ? 'active' : ''}`}
              onClick={() => setMode('snippet')}
              role="tab"
              aria-selected={mode === 'snippet'}
              aria-controls="export-content"
            >
              Snippet
            </button>
            <button
              className={`export-tab ${mode === 'full' ? 'active' : ''}`}
              onClick={() => setMode('full')}
              role="tab"
              aria-selected={mode === 'full'}
              aria-controls="export-content"
            >
              Full Document
            </button>
            {prototypeId && (
              <button
                className={`export-tab ${mode === 'embed' ? 'active' : ''}`}
                onClick={() => setMode('embed')}
                role="tab"
                aria-selected={mode === 'embed'}
                aria-controls="export-content"
              >
                Embed
              </button>
            )}
          </div>

          {/* Snippet & Full Document content */}
          {mode !== 'embed' && (
            <>
              <p style={{ color: 'var(--color-base-light)', marginBottom: '16px' }}>
                {mode === 'snippet'
                  ? 'Clean component markup ready to paste into your codebase.'
                  : 'Full HTML document with USWDS imports for sharing and testing.'}
              </p>

              {/* Page selector for multi-page exports in snippet mode */}
              {isMultiPage && mode === 'snippet' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                    Select page to export:
                  </label>
                  <select
                    value={selectedPageIndex}
                    onChange={(e) => setSelectedPageIndex(Number(e.target.value))}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid var(--color-base-lighter)',
                      width: '100%',
                      maxWidth: '300px',
                    }}
                  >
                    <option value={-1}>All pages (combined)</option>
                    {pages.map((page, index) => (
                      <option key={page.id} value={index}>
                        {page.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isMultiPage && mode === 'full' && (
                <p style={{ color: 'var(--color-success)', marginBottom: '16px', fontSize: '0.875rem' }}>
                  All {pages.length} pages included with navigation support
                </p>
              )}

              <pre className="export-code" id="export-content" role="tabpanel">
                <code>{displayHtml || '<!-- No content to export -->'}</code>
              </pre>
            </>
          )}

          {/* Embed content */}
          {mode === 'embed' && (
            <div id="export-content" role="tabpanel">
              <p style={{ color: 'var(--color-base-light)', marginBottom: '16px' }}>
                Embed this prototype in documentation or other websites using an iframe.
              </p>

              {/* Options */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="embed-padding" style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem' }}>
                    Padding (px)
                  </label>
                  <select
                    id="embed-padding"
                    value={embedPadding}
                    onChange={(e) => setEmbedPadding(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-base-lighter)' }}
                  >
                    <option value="0">0</option>
                    <option value="8">8</option>
                    <option value="16">16</option>
                    <option value="24">24</option>
                    <option value="32">32</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="embed-max-width" style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem' }}>
                    Max Width
                  </label>
                  <select
                    id="embed-max-width"
                    value={embedMaxWidth}
                    onChange={(e) => setEmbedMaxWidth(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-base-lighter)' }}
                  >
                    <option value="">None</option>
                    <option value="480px">480px</option>
                    <option value="640px">640px</option>
                    <option value="800px">800px</option>
                    <option value="1024px">1024px</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="embed-height" style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem' }}>
                    Frame Height
                  </label>
                  <select
                    id="embed-height"
                    value={embedHeight}
                    onChange={(e) => setEmbedHeight(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-base-lighter)' }}
                  >
                    <option value="200">200px</option>
                    <option value="300">300px</option>
                    <option value="400">400px</option>
                    <option value="500">500px</option>
                    <option value="600">600px</option>
                  </select>
                </div>
              </div>

              {/* Embed URL */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', fontWeight: 600 }}>
                  Embed URL
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={embedUrl}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid var(--color-base-lighter)',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                    }}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleEmbedCopy('url')}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {embedCopied === 'url' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Iframe Code */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', fontWeight: 600 }}>
                  Iframe Code
                </label>
                <pre className="export-code" style={{ marginBottom: '8px' }}>
                  <code>{iframeCode}</code>
                </pre>
                <button
                  className="btn btn-primary"
                  onClick={() => handleEmbedCopy('iframe')}
                  style={{ width: '100%' }}
                >
                  {embedCopied === 'iframe' ? 'Copied!' : 'Copy Iframe Code'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {mode === 'embed' ? (
            <>
              <a
                href={embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                Open Embed Preview
              </a>
              <button className="btn" onClick={onClose}>
                Close
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={handleDownload}>
                Download
              </button>
              <button
                className={`btn ${copyError ? 'btn-secondary' : 'btn-primary'}`}
                onClick={handleCopy}
              >
                {copied ? 'Copied!' : copyError ? 'Copy failed - try again' : 'Copy to Clipboard'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
