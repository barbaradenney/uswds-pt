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

  const cleanHtml = cleanExport(htmlContent);
  const fullHtml = generateFullDocument(cleanHtml);

  const displayHtml = mode === 'snippet' ? cleanHtml : fullHtml;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(displayHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = displayHtml;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Export Prototype</h2>
          <button
            className="btn"
            onClick={onClose}
            style={{ padding: '4px 8px' }}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="export-tabs">
            <button
              className={`export-tab ${mode === 'snippet' ? 'active' : ''}`}
              onClick={() => setMode('snippet')}
            >
              Snippet
            </button>
            <button
              className={`export-tab ${mode === 'full' ? 'active' : ''}`}
              onClick={() => setMode('full')}
            >
              Full Document
            </button>
          </div>

          <p style={{ color: 'var(--color-base-light)', marginBottom: '16px' }}>
            {mode === 'snippet'
              ? 'Clean component markup ready to paste into your codebase.'
              : 'Full HTML document with USWDS imports for sharing and testing.'}
          </p>

          <pre className="export-code">
            <code>{displayHtml || '<!-- No content to export -->'}</code>
          </pre>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleDownload}>
            Download
          </button>
          <button className="btn btn-primary" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
