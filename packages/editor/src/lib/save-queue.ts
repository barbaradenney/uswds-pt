/**
 * Save Queue
 *
 * Manages a queue of pending save operations to prevent concurrent saves
 * and provide offline support with automatic sync when back online.
 */

import { subscribeToOnlineStatus, isOnline, getOnlineStatus } from './retry';

// Debug logging
const DEBUG =
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).get('debug') === 'true' ||
    localStorage.getItem('uswds_pt_debug') === 'true');

function debug(...args: unknown[]): void {
  if (DEBUG) {
    console.log('[SaveQueue]', ...args);
  }
}

const OFFLINE_QUEUE_KEY = 'uswds_pt_offline_queue';

/**
 * Validate a queued save object has required fields
 * Returns null if valid, error message if invalid
 */
function validateQueuedSave(save: unknown): string | null {
  if (!save || typeof save !== 'object') {
    return 'Save must be an object';
  }

  const s = save as Record<string, unknown>;

  // Required string fields
  if (typeof s.id !== 'string' || !s.id) {
    return 'Save must have a valid id';
  }
  if (typeof s.name !== 'string') {
    return 'Save must have a name';
  }
  if (typeof s.htmlContent !== 'string') {
    return 'Save must have htmlContent string';
  }

  // grapesData can be any valid JSON, but must exist
  if (s.grapesData === undefined) {
    return 'Save must have grapesData';
  }

  // timestamp must be a number
  if (typeof s.timestamp !== 'number' || s.timestamp <= 0) {
    return 'Save must have a valid timestamp';
  }

  // retryCount must be a non-negative number
  if (typeof s.retryCount !== 'number' || s.retryCount < 0) {
    return 'Save must have a valid retryCount';
  }

  // slug can be null or string
  if (s.slug !== null && typeof s.slug !== 'string') {
    return 'Save slug must be null or string';
  }

  return null; // Valid
}

/**
 * Validate an array of queued saves, returning only valid ones
 */
function validateQueuedSaveArray(data: unknown): QueuedSave[] {
  if (!Array.isArray(data)) {
    debug('Offline queue is not an array, resetting');
    return [];
  }

  const validSaves: QueuedSave[] = [];
  for (const item of data) {
    const error = validateQueuedSave(item);
    if (error) {
      debug('Skipping invalid queued save:', error, item);
    } else {
      validSaves.push(item as QueuedSave);
    }
  }

  return validSaves;
}

/**
 * Queued save operation
 */
export interface QueuedSave {
  id: string;
  slug: string | null;
  name: string;
  htmlContent: string;
  grapesData: unknown;
  teamId?: string;
  timestamp: number;
  retryCount: number;
}

/**
 * Save queue state
 */
export interface SaveQueueState {
  /** Whether a save is currently in progress */
  isSaving: boolean;
  /** Number of queued saves waiting */
  queueLength: number;
  /** Current online status */
  isOnline: boolean;
  /** Last successful save timestamp */
  lastSavedAt: number | null;
  /** Last error message */
  lastError: string | null;
  /** Whether we have offline saves waiting to sync */
  hasOfflineSaves: boolean;
}

type SaveQueueListener = (state: SaveQueueState) => void;

/**
 * Save Queue Manager
 *
 * Ensures saves happen one at a time and handles offline scenarios.
 */
class SaveQueueManager {
  private queue: QueuedSave[] = [];
  private isSaving = false;
  private lastSavedAt: number | null = null;
  private lastError: string | null = null;
  private listeners: Set<SaveQueueListener> = new Set();
  private saveFunction: ((save: QueuedSave) => Promise<{ slug: string }>) | null = null;
  private unsubscribeOnline: (() => void) | null = null;

  constructor() {
    // Load offline queue from localStorage
    this.loadOfflineQueue();

    // Subscribe to online status changes
    this.unsubscribeOnline = subscribeToOnlineStatus((status) => {
      debug('Online status changed:', status.isOnline);
      this.notifyListeners();

      // If we came back online and have queued saves, process them
      if (status.isOnline && this.queue.length > 0) {
        debug('Back online, processing queued saves');
        this.processQueue();
      }
    });
  }

  /**
   * Set the save function to use for processing saves
   */
  setSaveFunction(fn: (save: QueuedSave) => Promise<{ slug: string }>): void {
    this.saveFunction = fn;

    // If we have queued saves and are online, process them
    if (this.queue.length > 0 && isOnline()) {
      this.processQueue();
    }
  }

  /**
   * Get current state
   */
  getState(): SaveQueueState {
    return {
      isSaving: this.isSaving,
      queueLength: this.queue.length,
      isOnline: isOnline(),
      lastSavedAt: this.lastSavedAt,
      lastError: this.lastError,
      hasOfflineSaves: this.queue.some((s) => s.retryCount > 0),
    };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: SaveQueueListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  /**
   * Queue a save operation
   */
  async queueSave(save: Omit<QueuedSave, 'id' | 'timestamp' | 'retryCount'>): Promise<{ slug: string } | null> {
    // Validate required fields before creating queued save
    if (typeof save.name !== 'string') {
      debug('Invalid save: name must be a string');
      this.lastError = 'Cannot save: missing prototype name';
      this.notifyListeners();
      return null;
    }
    if (typeof save.htmlContent !== 'string') {
      debug('Invalid save: htmlContent must be a string');
      this.lastError = 'Cannot save: missing HTML content';
      this.notifyListeners();
      return null;
    }
    if (save.grapesData === undefined || save.grapesData === null) {
      debug('Invalid save: grapesData is required');
      this.lastError = 'Cannot save: missing editor data';
      this.notifyListeners();
      return null;
    }

    const queuedSave: QueuedSave = {
      ...save,
      id: `save-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    debug('Queueing save:', queuedSave.id, 'slug:', save.slug);

    // If offline, queue for later
    if (!isOnline()) {
      debug('Offline - queueing save for later');
      this.queue.push(queuedSave);
      this.saveOfflineQueue();
      this.notifyListeners();
      return null;
    }

    // If already saving, queue this one
    if (this.isSaving) {
      debug('Save in progress - queueing');
      this.queue.push(queuedSave);
      this.notifyListeners();
      return null;
    }

    // Process this save immediately
    return this.processSave(queuedSave);
  }

  /**
   * Process a single save
   */
  private async processSave(save: QueuedSave): Promise<{ slug: string } | null> {
    if (!this.saveFunction) {
      debug('No save function set');
      this.lastError = 'Save function not configured';
      this.notifyListeners();
      return null;
    }

    this.isSaving = true;
    this.lastError = null;
    this.notifyListeners();

    try {
      debug('Processing save:', save.id);
      const result = await this.saveFunction(save);

      this.lastSavedAt = Date.now();
      this.lastError = null;
      debug('Save successful:', save.id, 'slug:', result.slug);

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed';
      debug('Save failed:', save.id, message);

      this.lastError = message;

      // If offline, queue for later
      if (!isOnline()) {
        save.retryCount++;
        this.queue.push(save);
        this.saveOfflineQueue();
      }

      return null;
    } finally {
      this.isSaving = false;
      this.notifyListeners();

      // Process next in queue if any
      if (this.queue.length > 0 && isOnline()) {
        // Small delay before processing next
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  /**
   * Process the queue of pending saves
   */
  private async processQueue(): Promise<void> {
    if (this.isSaving || !isOnline() || this.queue.length === 0) {
      return;
    }

    const save = this.queue.shift()!;
    this.saveOfflineQueue(); // Update localStorage

    await this.processSave(save);
  }

  /**
   * Load offline queue from localStorage
   */
  private loadOfflineQueue(): void {
    try {
      const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate all items in the queue
        this.queue = validateQueuedSaveArray(parsed);
        debug('Loaded offline queue:', this.queue.length, 'valid saves');

        // If we filtered out invalid items, save the cleaned queue
        if (Array.isArray(parsed) && this.queue.length !== parsed.length) {
          debug('Removed', parsed.length - this.queue.length, 'invalid saves from queue');
          this.saveOfflineQueue();
        }
      }
    } catch (error) {
      debug('Failed to load offline queue:', error);
      this.queue = [];
      // Remove corrupted data
      try {
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
      } catch {
        // Ignore localStorage errors
      }
    }
  }

  /**
   * Save offline queue to localStorage
   */
  private saveOfflineQueue(): void {
    try {
      if (this.queue.length > 0) {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue));
      } else {
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
      }
    } catch (error) {
      debug('Failed to save offline queue:', error);
    }
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        debug('Listener error:', error);
      }
    });
  }

  /**
   * Clear the queue (use with caution)
   */
  clearQueue(): void {
    this.queue = [];
    this.saveOfflineQueue();
    this.notifyListeners();
  }

  /**
   * Get pending saves count
   */
  getPendingCount(): number {
    return this.queue.length;
  }

  /**
   * Full cleanup for hot reload or unmount scenarios
   * Saves any pending queue to localStorage before destroying
   */
  destroy(): void {
    debug('Destroying SaveQueueManager');

    // Save any pending saves to localStorage so they survive reload
    if (this.queue.length > 0) {
      this.saveOfflineQueue();
      debug('Saved', this.queue.length, 'pending saves to localStorage');
    }

    // Unsubscribe from online status
    this.unsubscribeOnline?.();
    this.unsubscribeOnline = null;

    // Clear all listeners
    this.listeners.clear();

    // Clear save function reference
    this.saveFunction = null;

    // Reset state
    this.isSaving = false;
    this.lastError = null;
  }

  /**
   * Reinitialize after hot reload
   */
  reinitialize(): void {
    debug('Reinitializing SaveQueueManager');

    // Reload offline queue
    this.loadOfflineQueue();

    // Re-subscribe to online status
    if (!this.unsubscribeOnline) {
      this.unsubscribeOnline = subscribeToOnlineStatus((status) => {
        debug('Online status changed:', status.isOnline);
        this.notifyListeners();
        if (status.isOnline && this.queue.length > 0) {
          debug('Back online, processing queued saves');
          this.processQueue();
        }
      });
    }
  }
}

// Singleton instance
let saveQueueInstance: SaveQueueManager | null = null;

/**
 * Get or create the SaveQueueManager singleton
 */
function getSaveQueue(): SaveQueueManager {
  if (!saveQueueInstance) {
    saveQueueInstance = new SaveQueueManager();
  }
  return saveQueueInstance;
}

export const saveQueue = getSaveQueue();

// Hot Module Replacement cleanup for Vite
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    debug('HMR dispose: cleaning up SaveQueueManager');
    saveQueue.destroy();
  });

  import.meta.hot.accept(() => {
    debug('HMR accept: reinitializing SaveQueueManager');
    saveQueue.reinitialize();
  });
}

/**
 * Hook-friendly function to check if save is in progress
 */
export function isSaveInProgress(): boolean {
  return saveQueue.getState().isSaving;
}

/**
 * Hook-friendly function to get queue length
 */
export function getQueueLength(): number {
  return saveQueue.getState().queueLength;
}
