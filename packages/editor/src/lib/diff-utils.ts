/**
 * Diff utilities for comparing HTML content between prototype versions
 */

import { diffLines } from 'diff';
import { cleanExport } from './export';

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

/**
 * Compute a unified diff between two HTML strings.
 * Cleans GrapesJS artifacts before diffing to produce meaningful output.
 */
export function computeHtmlDiff(html1: string, html2: string): DiffLine[] {
  const clean1 = cleanExport(html1);
  const clean2 = cleanExport(html2);
  return diffLines(clean1, clean2).map((part) => ({
    type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged',
    value: part.value,
  }));
}
