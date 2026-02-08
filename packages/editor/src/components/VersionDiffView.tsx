/**
 * Version Diff View
 * Modal that shows a unified diff between two prototype versions
 */

import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS, apiGet } from '../lib/api';
import { computeHtmlDiff, type DiffLine } from '../lib/diff-utils';

interface VersionData {
  versionNumber: number | 'current';
  htmlContent: string | null;
}

interface CompareResponse {
  version1: VersionData;
  version2: VersionData;
}

interface VersionDiffViewProps {
  slug: string;
  version1: number;
  version2: number | 'current';
  onClose: () => void;
}

export function VersionDiffView({
  slug,
  version1,
  version2,
  onClose,
}: VersionDiffViewProps) {
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDiff() {
      setIsLoading(true);
      setError(null);

      const result = await apiGet<CompareResponse>(
        API_ENDPOINTS.PROTOTYPE_VERSION_COMPARE(slug, version1, version2),
        'Failed to load version comparison'
      );

      if (cancelled) return;

      if (!result.success || !result.data) {
        setError(result.error || 'Failed to load versions');
        setIsLoading(false);
        return;
      }

      const { version1: v1Data, version2: v2Data } = result.data;
      const lines = computeHtmlDiff(
        v1Data.htmlContent || '',
        v2Data.htmlContent || ''
      );
      setDiffLines(lines);
      setIsLoading(false);
    }

    loadDiff();
    return () => { cancelled = true; };
  }, [slug, version1, version2]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const v2Label = version2 === 'current' ? 'Current' : `Version ${version2}`;

  return (
    <div className="version-diff-overlay" onClick={onClose}>
      <div className="version-diff-modal" onClick={(e) => e.stopPropagation()}>
        <div className="version-diff-header">
          <h3>
            Version {version1} vs {v2Label}
          </h3>
          <button
            className="btn"
            onClick={onClose}
            aria-label="Close diff view"
            style={{ padding: '4px 8px', minWidth: 'auto' }}
          >
            &times;
          </button>
        </div>

        <div className="version-diff-content">
          {isLoading ? (
            <div className="version-diff-loading">
              <div className="loading-spinner" />
              <p>Computing diff...</p>
            </div>
          ) : error ? (
            <div className="version-diff-error">{error}</div>
          ) : diffLines.length === 0 ? (
            <div className="version-diff-empty">
              <p>No differences found.</p>
            </div>
          ) : (
            <DiffDisplay lines={diffLines} />
          )}
        </div>
      </div>
    </div>
  );
}

interface NumberedDiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNum: number | null;
  key: string;
}

function buildNumberedLines(lines: DiffLine[]): NumberedDiffLine[] {
  const result: NumberedDiffLine[] = [];
  let lineNum = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const subLines = line.value.replace(/\n$/, '').split('\n');
    for (let j = 0; j < subLines.length; j++) {
      if (line.type !== 'removed') {
        lineNum++;
      }
      result.push({
        type: line.type,
        content: subLines[j],
        lineNum: line.type === 'removed' ? null : lineNum,
        key: `${i}-${j}`,
      });
    }
  }

  return result;
}

function DiffDisplay({ lines }: { lines: DiffLine[] }) {
  const numberedLines = buildNumberedLines(lines);
  const prefixMap = { added: '+', removed: '-', unchanged: ' ' } as const;

  return (
    <pre className="version-diff-pre">
      <code>
        {numberedLines.map((line) => (
          <div key={line.key} className={`diff-line diff-line-${line.type}`}>
            <span className="diff-line-number">
              {line.lineNum ?? ''}
            </span>
            <span className="diff-line-prefix">{prefixMap[line.type]}</span>
            <span className="diff-line-content">{line.content}</span>
          </div>
        ))}
      </code>
    </pre>
  );
}
