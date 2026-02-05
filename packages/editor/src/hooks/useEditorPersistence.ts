/**
 * Editor Persistence Hook
 *
 * Handles all save/load/create operations for prototypes.
 * Works with the state machine to ensure operations only occur in valid states.
 * Includes retry logic for network reliability.
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Prototype } from '@uswds-pt/shared';
import { createDebugLogger } from '@uswds-pt/shared';
import { authFetch } from './useAuth';
import { useOrganization } from './useOrganization';
import type { UseEditorStateMachineReturn } from './useEditorStateMachine';
import {
  getPrototype,
  createPrototype as createLocalPrototype,
  updatePrototype as updateLocalPrototype,
  type LocalPrototype,
} from '../lib/localStorage';
import { extractEditorData, isEditorReadyForExtraction } from '../lib/grapesjs/data-extractor';
import { DEFAULT_CONTENT } from '@uswds-pt/adapter';
import { withRetry, classifyError, isOnline, subscribeToOnlineStatus } from '../lib/retry';
import { validateAndPrepareForSave, validatePrototype, isPrototypeUsable } from '../lib/prototype-validation';
import type { EditorInstance } from '../types/grapesjs';

const debug = createDebugLogger('EditorPersistence');

export interface UseEditorPersistenceOptions {
  /** State machine instance */
  stateMachine: UseEditorStateMachineReturn;
  /** Editor ref */
  editorRef: React.MutableRefObject<EditorInstance | null>;
  /** Whether in demo mode (localStorage) */
  isDemoMode: boolean;
  /** Current URL slug */
  slug?: string;
  /** Callback when prototype name changes */
  onNameChange?: (name: string) => void;
  /** Current prototype name */
  name: string;
  /** Current HTML content (fallback) */
  htmlContent: string;
  /** Set HTML content */
  setHtmlContent: (html: string) => void;
  /** Set local prototype */
  setLocalPrototype: (proto: LocalPrototype | null) => void;
  /** Local prototype state */
  localPrototype: LocalPrototype | null;
  /** Callback after successful save */
  onSaveComplete?: () => void;
}

export interface UseEditorPersistenceReturn {
  /** Save current content (manual or autosave) - returns saved prototype or null */
  save: (type: 'manual' | 'autosave') => Promise<Prototype | null>;
  /** Load a prototype by slug - returns the loaded prototype or null */
  load: (slug: string) => Promise<Prototype | null>;
  /** Create a new prototype */
  createNew: () => Promise<string | null>;
  /** Whether a save operation is in progress */
  isSaving: boolean;
  /** Whether any operation is in progress */
  isOperating: boolean;
  /** Whether we're currently online */
  isOnline: boolean;
  /** Number of retry attempts for last failed save */
  lastSaveRetries: number;
}

export function useEditorPersistence({
  stateMachine,
  editorRef,
  isDemoMode,
  slug,
  onNameChange,
  name,
  htmlContent,
  setHtmlContent,
  setLocalPrototype,
  localPrototype,
  onSaveComplete,
}: UseEditorPersistenceOptions): UseEditorPersistenceReturn {
  const navigate = useNavigate();
  const { currentTeam, isLoading: isLoadingTeam, teams } = useOrganization();

  // Track if a create operation is in progress (prevents duplicate calls)
  const isCreatingRef = useRef(false);

  // Track if a save is in progress (prevents concurrent saves)
  const isSavingRef = useRef(false);

  // Track online status
  const [online, setOnline] = useState(isOnline());
  const [lastSaveRetries, setLastSaveRetries] = useState(0);

  // Subscribe to online status changes
  useEffect(() => {
    return subscribeToOnlineStatus((status) => {
      setOnline(status.isOnline);
    });
  }, []);

  /**
   * Save current content - returns the saved prototype or null on failure
   */
  const save = useCallback(
    async (type: 'manual' | 'autosave'): Promise<Prototype | null> => {
      const { state, canSave, saveStart, saveSuccess, saveFailed } = stateMachine;

      // Prevent concurrent saves
      if (isSavingRef.current) {
        debug(`Save blocked: another save is in progress`);
        return null;
      }

      // Check guards
      if (!canSave) {
        debug(`Save blocked: state is ${state.status}, canSave=${canSave}`);
        if (type === 'manual') {
          saveFailed('Editor is not ready. Please wait a moment.');
        }
        return null;
      }

      const editor = editorRef.current;
      if (!editor) {
        debug('Save blocked: editor not initialized');
        saveFailed('Editor not initialized');
        return null;
      }

      // Check if editor is ready for data extraction
      if (!isEditorReadyForExtraction(editor)) {
        debug('Save blocked: editor not ready for extraction');
        if (type === 'manual') {
          saveFailed('Editor is still loading. Please wait a moment.');
        }
        return null;
      }

      // Check if online for API mode
      if (!isDemoMode && !isOnline()) {
        debug('Save blocked: offline');
        if (type === 'manual') {
          saveFailed('You are offline. Changes will be saved when you reconnect.');
        }
        return null;
      }

      // Acquire save lock
      isSavingRef.current = true;

      // Start save
      saveStart(type);
      debug(`Save started (${type})`);

      try {
        // Extract data from editor
        const { html: currentHtml, projectData: grapesData, warnings } = extractEditorData(
          editor,
          htmlContent
        );

        if (warnings.length > 0) {
          debug('Extraction warnings:', warnings);
        }

        if (isDemoMode) {
          // Save to localStorage
          const gjsDataStr = JSON.stringify(grapesData);

          if (localPrototype) {
            // Update existing
            const updated = updateLocalPrototype(localPrototype.id, {
              name,
              htmlContent: currentHtml,
              gjsData: gjsDataStr,
            });
            if (updated) {
              setLocalPrototype(updated);
              setHtmlContent(currentHtml);
              // Create a mock prototype for state machine
              const savedPrototype: Prototype = {
                id: updated.id,
                slug: updated.id,
                name: updated.name,
                htmlContent: updated.htmlContent,
                grapesData: grapesData,
                teamId: '',
                createdBy: '',
                createdAt: new Date(updated.createdAt),
                updatedAt: new Date(updated.updatedAt),
                isPublic: false,
              } as Prototype;
              saveSuccess(savedPrototype);
              debug('Demo mode save successful');
              onSaveComplete?.();
              return savedPrototype;
            }
          } else {
            // Create new in demo mode
            const created = createLocalPrototype(name, currentHtml, gjsDataStr);
            setLocalPrototype(created);
            setHtmlContent(currentHtml);
            navigate(`/edit/${created.id}`, { replace: true });
            const savedPrototype: Prototype = {
              id: created.id,
              slug: created.id,
              name: created.name,
              htmlContent: created.htmlContent,
              grapesData: grapesData,
              teamId: '',
              createdBy: '',
              createdAt: new Date(created.createdAt),
              updatedAt: new Date(created.updatedAt),
              isPublic: false,
            } as Prototype;
            saveSuccess(savedPrototype);
            debug('Demo mode create successful');
            onSaveComplete?.();
            return savedPrototype;
          }
        } else {
          // Save to API
          const prototypeSlug = state.prototype?.slug || slug;
          const isUpdate = !!prototypeSlug;

          debug('Save mode:', isUpdate ? 'UPDATE' : 'CREATE', 'slug:', prototypeSlug);

          // For new prototypes, require a team to be selected
          // This throws for all error cases so we can safely use currentTeam below
          if (!isUpdate && !currentTeam) {
            if (isLoadingTeam) {
              throw new Error('Still loading teams. Please wait a moment and try again.');
            } else if (!teams || teams.length === 0) {
              throw new Error('No team available. Please go to Settings to create a team first.');
            } else {
              // Teams exist but none is selected (user needs to pick one)
              throw new Error('Please select a team before creating a prototype.');
            }
          }

          const url = isUpdate
            ? `/api/prototypes/${prototypeSlug}`
            : '/api/prototypes';
          const method = isUpdate ? 'PUT' : 'POST';

          const body: Record<string, unknown> = {
            name,
            htmlContent: currentHtml,
            grapesData,
          };

          // For new prototypes, always include teamId
          // At this point, currentTeam is guaranteed to exist due to the check above
          if (!isUpdate) {
            if (!currentTeam) {
              // This should never happen due to the check above, but defensive coding
              throw new Error('Cannot create prototype: no team selected');
            }
            body.teamId = currentTeam.id;
          }

          debug('Making API call:', method, url);

          // Use retry logic for API call
          const result = await withRetry<Prototype>(
            async () => {
              const response = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              });

              if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                const errorType = classifyError(null, response);

                // Don't retry client errors (4xx except 429)
                if (errorType === 'permanent' || errorType === 'auth') {
                  const error = new Error(`Failed to save: ${response.status} - ${errorText}`);
                  (error as any).noRetry = true;
                  throw error;
                }

                throw new Error(`Failed to save prototype: ${response.status}`);
              }

              return response.json();
            },
            {
              maxRetries: type === 'manual' ? 3 : 2, // More retries for manual saves
              initialDelayMs: 1000,
              maxDelayMs: 10000,
              operationName: `save ${prototypeSlug || 'new'}`,
              onRetry: (attempt, error, delay) => {
                debug(`Save retry ${attempt}, waiting ${delay}ms`);
                setLastSaveRetries(attempt);
              },
            }
          );

          if (!result.success) {
            setLastSaveRetries(result.attempts);
            throw result.error;
          }

          setLastSaveRetries(0);
          const data = result.data!;
          debug('Save successful, slug:', data.slug);

          if (!isUpdate) {
            navigate(`/edit/${data.slug}`, { replace: true });
          }

          setHtmlContent(currentHtml);
          saveSuccess(data);
          onSaveComplete?.();
          return data;
        }

        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save';
        debug('Save error:', err);
        saveFailed(message);
        return null;
      } finally {
        // Release save lock
        isSavingRef.current = false;
      }
    },
    [
      stateMachine,
      editorRef,
      isDemoMode,
      slug,
      name,
      htmlContent,
      setHtmlContent,
      setLocalPrototype,
      localPrototype,
      currentTeam,
      teams,
      isLoadingTeam,
      navigate,
      onSaveComplete,
    ]
  );

  /**
   * Load a prototype by slug - returns the loaded prototype or null
   */
  const load = useCallback(
    async (prototypeSlug: string): Promise<Prototype | null> => {
      const { loadPrototype, prototypeLoaded, prototypeLoadFailed } = stateMachine;

      loadPrototype(prototypeSlug);
      debug('Loading prototype:', prototypeSlug);

      try {
        if (isDemoMode) {
          // Load from localStorage
          const data = getPrototype(prototypeSlug);
          if (!data) {
            prototypeLoadFailed('Prototype not found');
            navigate('/');
            return null;
          }

          setLocalPrototype(data);
          onNameChange?.(data.name);
          setHtmlContent(data.htmlContent);

          // Create mock prototype for state machine
          const prototype: Prototype = {
            id: data.id,
            slug: data.id,
            name: data.name,
            htmlContent: data.htmlContent,
            grapesData: data.gjsData ? JSON.parse(data.gjsData) : { pages: [], styles: [], assets: [] },
            teamId: '',
            createdBy: '',
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
            isPublic: false,
          } as Prototype;

          prototypeLoaded(prototype);
          debug('Demo mode load successful');
          return prototype;
        } else {
          // Load from API
          const response = await authFetch(`/api/prototypes/${prototypeSlug}`);

          if (!response.ok) {
            if (response.status === 404) {
              prototypeLoadFailed('Prototype not found');
              navigate('/');
              return null;
            }
            throw new Error('Failed to load prototype');
          }

          const data: Prototype = await response.json();

          onNameChange?.(data.name);
          setHtmlContent(data.htmlContent || '');
          prototypeLoaded(data);

          debug('API load successful, slug:', data.slug);
          return data;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load prototype';
        debug('Load error:', err);
        prototypeLoadFailed(message);
        return null;
      }
    },
    [stateMachine, isDemoMode, navigate, onNameChange, setHtmlContent, setLocalPrototype]
  );

  /**
   * Create a new prototype
   */
  const createNew = useCallback(async (): Promise<string | null> => {
    const { createPrototype, prototypeCreated, prototypeCreateFailed } = stateMachine;

    // Guard against multiple creation attempts
    if (isCreatingRef.current) {
      debug('Create blocked: already creating');
      return null;
    }

    // In demo mode, don't create immediately - let the editor initialize with blank content
    if (isDemoMode) {
      debug('Demo mode: skipping immediate create');
      return null;
    }

    if (!currentTeam) {
      debug('Create blocked: no team available');
      return null;
    }

    isCreatingRef.current = true;
    createPrototype();
    debug('Creating new prototype...');

    try {
      const blankTemplate = DEFAULT_CONTENT['blank-template']?.replace('__FULL_HTML__', '') || '';

      const response = await authFetch('/api/prototypes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Untitled Prototype',
          htmlContent: blankTemplate,
          grapesData: {
            pages: [
              {
                id: 'page-1',
                name: 'Prototype',
                frames: [{ component: { type: 'wrapper', components: [] } }],
              },
            ],
            styles: [],
            assets: [],
          },
          teamId: currentTeam.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create prototype');
      }

      const data: Prototype = await response.json();
      debug('Create successful, slug:', data.slug);

      prototypeCreated(data);
      navigate(`/edit/${data.slug}`, { replace: true });

      return data.slug;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create prototype';
      debug('Create error:', err);
      prototypeCreateFailed(message);
      return null;
    } finally {
      isCreatingRef.current = false;
    }
  }, [stateMachine, isDemoMode, currentTeam, navigate]);

  return {
    save,
    load,
    createNew,
    isSaving: stateMachine.state.status === 'saving' || isSavingRef.current,
    isOperating: stateMachine.isBusy,
    isOnline: online,
    lastSaveRetries,
  };
}
