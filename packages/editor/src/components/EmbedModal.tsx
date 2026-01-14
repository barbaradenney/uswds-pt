import { useState, useMemo } from 'react';

interface EmbedModalProps {
  prototypeId: string;
  onClose: () => void;
}

export function EmbedModal({ prototypeId, onClose }: EmbedModalProps) {
  const [copied, setCopied] = useState<'url' | 'iframe' | null>(null);
  const [padding, setPadding] = useState('16');
  const [maxWidth, setMaxWidth] = useState('');
  const [height, setHeight] = useState('400');

  // Memoize the embed URL to avoid recalculating on every render
  const embedUrl = useMemo(() => {
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/edit\/.*$/, '').replace(/\/new$/, '');
    const embedPath = `/embed/${prototypeId}`;

    const queryParams = new URLSearchParams();
    if (padding !== '16') queryParams.set('padding', padding);
    if (maxWidth) queryParams.set('maxWidth', maxWidth);

    const queryString = queryParams.toString();
    return `${baseUrl}${embedPath}${queryString ? '?' + queryString : ''}`;
  }, [prototypeId, padding, maxWidth]);

  // Memoize the iframe code
  const iframeCode = useMemo(() => `<iframe
  src="${embedUrl}"
  width="100%"
  height="${height}"
  frameborder="0"
  title="USWDS Prototype"
></iframe>`, [embedUrl, height]);

  async function handleCopy(type: 'url' | 'iframe') {
    const text = type === 'url' ? embedUrl : iframeCode;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="embed-modal-title"
      >
        <div className="modal-header">
          <h2 id="embed-modal-title">Embed Prototype</h2>
          <button
            className="btn"
            onClick={onClose}
            style={{ padding: '4px 8px' }}
            aria-label="Close embed dialog"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
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
                value={padding}
                onChange={(e) => setPadding(e.target.value)}
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
                value={maxWidth}
                onChange={(e) => setMaxWidth(e.target.value)}
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
                value={height}
                onChange={(e) => setHeight(e.target.value)}
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
                onClick={() => handleCopy('url')}
                style={{ whiteSpace: 'nowrap' }}
              >
                {copied === 'url' ? 'Copied!' : 'Copy'}
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
              onClick={() => handleCopy('iframe')}
              style={{ width: '100%' }}
            >
              {copied === 'iframe' ? 'Copied!' : 'Copy Iframe Code'}
            </button>
          </div>
        </div>

        <div className="modal-footer">
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
        </div>
      </div>
    </div>
  );
}
