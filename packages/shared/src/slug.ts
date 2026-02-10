/**
 * Convert a prototype name to a git-safe branch slug.
 * Used for GitHub branch names: uswds-pt/<branchSlug>
 */
export function toBranchSlug(name: string): string {
  if (name == null) return 'prototype';
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200)
    .replace(/^-|-$/g, '')
    || 'prototype';
}
