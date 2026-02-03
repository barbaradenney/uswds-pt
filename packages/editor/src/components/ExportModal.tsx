import { useState } from 'react';
import { cleanExport, generateFullDocument, generateMultiPageDocument, type PageData } from '../lib/export';

interface ExportModalProps {
  /** HTML content for single-page export */
  htmlContent: string;
  /** Optional pages data for multi-page export */
  pages?: PageData[];
  onClose: () => void;
}

type ExportMode = 'snippet' | 'full';

export function ExportModal({ htmlContent, pages, onClose }: ExportModalProps) {
  const [mode, setMode] = useState<ExportMode>('snippet');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);

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

  async function handleCopy() {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(displayHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
          setTimeout(() => setCopied(false), 2000);
        } else {
          setCopyError(true);
          setTimeout(() => setCopyError(false), 3000);
        }
      } catch {
        setCopyError(true);
        setTimeout(() => setCopyError(false), 3000);
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
          </div>

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
              ✓ All {pages.length} pages included with navigation support
            </p>
          )}

          <pre className="export-code" id="export-content" role="tabpanel">
            <code>{displayHtml || '<!-- No content to export -->'}</code>
          </pre>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleDownload}>
            Download
          </button>
          <button
            className={`btn ${copyError ? 'btn-secondary' : 'btn-primary'}`}
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : copyError ? 'Copy failed - try again' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
