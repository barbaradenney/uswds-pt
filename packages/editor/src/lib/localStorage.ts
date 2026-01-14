/**
 * Local Storage utilities for demo mode prototype persistence
 */

export interface LocalPrototype {
  id: string;
  name: string;
  htmlContent: string;
  gjsData?: string; // GrapesJS project data for restoring editor state
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'uswds-pt-prototypes';

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `proto-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Get all prototypes from localStorage
 */
export function getPrototypes(): LocalPrototype[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * Get a single prototype by ID
 */
export function getPrototype(id: string): LocalPrototype | null {
  const prototypes = getPrototypes();
  return prototypes.find(p => p.id === id) || null;
}

/**
 * Save a new prototype
 */
export function createPrototype(name: string, htmlContent: string, gjsData?: string): LocalPrototype {
  const prototypes = getPrototypes();
  const now = new Date().toISOString();

  const newPrototype: LocalPrototype = {
    id: generateId(),
    name,
    htmlContent,
    gjsData,
    createdAt: now,
    updatedAt: now,
  };

  prototypes.unshift(newPrototype); // Add to beginning
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prototypes));

  return newPrototype;
}

/**
 * Update an existing prototype
 */
export function updatePrototype(id: string, updates: Partial<Pick<LocalPrototype, 'name' | 'htmlContent' | 'gjsData'>>): LocalPrototype | null {
  const prototypes = getPrototypes();
  const index = prototypes.findIndex(p => p.id === id);

  if (index === -1) return null;

  prototypes[index] = {
    ...prototypes[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(prototypes));

  return prototypes[index];
}

/**
 * Delete a prototype
 */
export function deletePrototype(id: string): boolean {
  const prototypes = getPrototypes();
  const filtered = prototypes.filter(p => p.id !== id);

  if (filtered.length === prototypes.length) return false;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Clear all prototypes
 */
export function clearAllPrototypes(): void {
  localStorage.removeItem(STORAGE_KEY);
}
