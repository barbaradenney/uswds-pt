import { useState } from 'react';
import { cleanExport, generateFullDocument } from '../lib/export';

interface ExportModalProps {
  htmlContent: string;
  onClose: () => void;
}

type ExportMode = 'snippet' | 'full';

export function ExportModal({ htmlContent, onClose }: ExportModalProps) {
  const [mode, setMode] = useState<ExportMode>('snippet');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const cleanHtml = cleanExport(htmlContent);
  const fullHtml = generateFullDocument(cleanHtml);

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
