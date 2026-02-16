/**
 * Local Storage utilities for demo mode prototype persistence
 *
 * Includes error handling for quota exceeded and localStorage unavailability.
 */

import { createDebugLogger } from '@uswds-pt/shared';
import { STORAGE_KEYS } from './constants';

const debug = createDebugLogger('LocalStorage');

export interface LocalPrototype {
  id: string;
  name: string;
  htmlContent: string;
  gjsData?: string; // GrapesJS project data for restoring editor state
  createdAt: string;
  updatedAt: string;
}

interface StorageError {
  type: 'quota_exceeded' | 'storage_unavailable' | 'parse_error' | 'unknown';
  message: string;
}

interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: StorageError;
}

const STORAGE_KEY = STORAGE_KEYS.PROTOTYPES;
const MAX_STORAGE_SIZE_MB = 4; // Leave buffer below 5MB limit
const MAX_STORAGE_SIZE_BYTES = MAX_STORAGE_SIZE_MB * 1024 * 1024;

/**
 * Check if localStorage is available
 */
function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get estimated size of data in bytes
 */
function getDataSize(data: string): number {
  // UTF-16 encoding (2 bytes per character) + overhead
  return new Blob([data]).size;
}

/**
 * Get current storage usage
 */
function getStorageUsage(): { used: number; available: number; percentage: number } {
  try {
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          used += getDataSize(key) + getDataSize(value);
        }
      }
    }
    return {
      used,
      available: MAX_STORAGE_SIZE_BYTES - used,
      percentage: (used / MAX_STORAGE_SIZE_BYTES) * 100,
    };
  } catch {
    return { used: 0, available: MAX_STORAGE_SIZE_BYTES, percentage: 0 };
  }
}

/**
 * Safe localStorage write with quota checking
 */
function safeSetItem(key: string, value: string): StorageResult<void> {
  if (!isStorageAvailable()) {
    return {
      success: false,
      error: {
        type: 'storage_unavailable',
        message: 'localStorage is not available in this browser',
      },
    };
  }

  const dataSize = getDataSize(value);
  const usage = getStorageUsage();

  // Check if we have enough space (with some buffer)
  if (dataSize > usage.available) {
    debug('Storage quota would be exceeded:', {
      dataSize,
      available: usage.available,
      percentage: usage.percentage,
    });
    return {
      success: false,
      error: {
        type: 'quota_exceeded',
        message: `Not enough storage space. Data size: ${(dataSize / 1024).toFixed(1)}KB, Available: ${(usage.available / 1024).toFixed(1)}KB`,
      },
    };
  }

  try {
    localStorage.setItem(key, value);
    debug('Saved to localStorage:', key, `(${(dataSize / 1024).toFixed(1)}KB)`);
    return { success: true };
  } catch (error) {
    // Handle QuotaExceededError
    if (
      error instanceof DOMException &&
      (error.code === 22 || // Legacy
        error.code === 1014 || // Firefox
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    ) {
      debug('QuotaExceededError caught');
      return {
        success: false,
        error: {
          type: 'quota_exceeded',
          message: 'Storage quota exceeded. Try deleting some prototypes.',
        },
      };
    }

    debug('Unknown localStorage error:', error);
    return {
      success: false,
      error: {
        type: 'unknown',
        message: error instanceof Error ? error.message : 'Failed to save to storage',
      },
    };
  }
}

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
    if (!isStorageAvailable()) return [];
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    debug('Error reading prototypes:', error);
    return [];
  }
}

/**
 * Get a single prototype by ID
 */
export function getPrototype(id: string): LocalPrototype | null {
  const prototypes = getPrototypes();
  return prototypes.find((p) => p.id === id) || null;
}

/**
 * Save a new prototype with error handling
 */
export function createPrototype(
  name: string,
  htmlContent: string,
  gjsData?: string
): LocalPrototype {
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

  let result = safeSetItem(STORAGE_KEY, JSON.stringify(prototypes));

  if (!result.success) {
    debug('Error: Failed to save prototype:', result.error?.message);
    // Try to clean up old prototypes and retry on quota exceeded
    if (result.error?.type === 'quota_exceeded' && prototypes.length > 5) {
      debug('Attempting to clean up old prototypes...');
      const trimmed = prototypes.slice(0, 5); // Keep only 5 most recent
      result = safeSetItem(STORAGE_KEY, JSON.stringify(trimmed));
      if (result.success) {
        debug('Cleanup successful, saved with trimmed list');
      }
    }
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to save prototype to local storage');
    }
  }

  return newPrototype;
}

/**
 * Update an existing prototype with error handling
 */
export function updatePrototype(
  id: string,
  updates: Partial<Pick<LocalPrototype, 'name' | 'htmlContent' | 'gjsData'>>
): LocalPrototype | null {
  const prototypes = getPrototypes();
  const index = prototypes.findIndex((p) => p.id === id);

  if (index === -1) return null;

  prototypes[index] = {
    ...prototypes[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const result = safeSetItem(STORAGE_KEY, JSON.stringify(prototypes));

  if (!result.success) {
    debug('Error: Failed to update prototype:', result.error?.message);
    // Return the updated prototype anyway - it's in memory even if storage failed
  }

  return prototypes[index];
}

/**
 * Delete a prototype
 */
export function deletePrototype(id: string): boolean {
  const prototypes = getPrototypes();
  const filtered = prototypes.filter((p) => p.id !== id);

  if (filtered.length === prototypes.length) return false;

  const result = safeSetItem(STORAGE_KEY, JSON.stringify(filtered));

  if (!result.success) {
    debug('Error: Failed to delete prototype:', result.error?.message);
    return false;
  }

  return true;
}

