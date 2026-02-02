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
        this.queue = JSON.parse(stored);
        debug('Loaded offline queue:', this.queue.length, 'saves');
      }
    } catch (error) {
      debug('Failed to load offline queue:', error);
      this.queue = [];
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
   * Cleanup
   */
  destroy(): void {
    this.unsubscribeOnline?.();
    this.listeners.clear();
  }
}

// Singleton instance
export const saveQueue = new SaveQueueManager();

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
