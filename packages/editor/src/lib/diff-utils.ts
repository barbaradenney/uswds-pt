/**
 * Diff utilities for comparing HTML content between prototype versions
 *
 * The `diff` library is lazy-loaded via dynamic import() so it is only
 * fetched when the user actually opens a version comparison, keeping
 * it out of the main bundle.
 */

import { cleanExport } from './export';

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

/**
 * Compute a unified diff between two HTML strings.
 * Cleans GrapesJS artifacts before diffing to produce meaningful output.
 *
 * The `diff` library is loaded on first call and cached for subsequent uses.
 */
export async function computeHtmlDiff(html1: string, html2: string): Promise<DiffLine[]> {
  const { diffLines } = await import('diff');
  const clean1 = cleanExport(html1);
  const clean2 = cleanExport(html2);
  return diffLines(clean1, clean2).map((part) => ({
    type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged',
    value: part.value,
  }));
}
