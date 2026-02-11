/**
 * useEditorUsers Hook
 *
 * Manages named user personas for component visibility toggling.
 * Users are stored in projectData.users (JSONB) — no DB migration needed.
 * Active user is ephemeral (not persisted) and synced via editor events.
 *
 * Works alongside useEditorStates with AND logic:
 * a component must match BOTH the active state AND active user to be visible.
 */

import { useState, useCallback, useEffect } from 'react';
import { useEditorMaybe } from '@grapesjs/react';
import type { UserDefinition } from '@uswds-pt/shared';

export interface UseEditorUsersReturn {
  users: UserDefinition[];
  activeUserId: string | null;
  addUser: (name: string) => void;
  renameUser: (id: string, name: string) => void;
  removeUser: (id: string) => void;
  setActiveUser: (id: string | null) => void;
}

/**
 * Read users from project data
 */
function readUsers(editor: any): UserDefinition[] {
  try {
    const data = editor.getProjectData?.();
    return Array.isArray(data?.users) ? data.users : [];
  } catch {
    return [];
  }
}

/**
 * Write users to project data without triggering a full reload.
 */
function writeUsers(editor: any, users: UserDefinition[]): void {
  try {
    const data = editor.getProjectData?.();
    if (data) {
      data.users = users;
      editor.loadProjectData(data);
    }
  } catch {
    // Silently ignore — editor may not be ready
  }
}

export function useEditorUsers(): UseEditorUsersReturn {
  const editor = useEditorMaybe();
  const [users, setUsers] = useState<UserDefinition[]>([]);
  const [activeUserId, setActiveUserIdLocal] = useState<string | null>(null);

  // Read users on mount and when editor becomes available
  useEffect(() => {
    if (!editor) return;

    const syncUsers = () => setUsers(readUsers(editor));
    syncUsers();

    // Re-sync when project data is loaded (e.g. after save/restore)
    const handler = () => syncUsers();
    editor.on('load', handler);
    return () => { editor.off('load', handler); };
  }, [editor]);

  // Listen for user:select events from other components
  useEffect(() => {
    if (!editor) return;

    const handler = (id: string | null) => {
      setActiveUserIdLocal(id);
    };
    editor.on('user:select', handler);
    return () => { editor.off('user:select', handler); };
  }, [editor]);

  const addUser = useCallback((name: string) => {
    if (!editor) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    const newUser: UserDefinition = {
      id: `user-${Date.now()}`,
      name: trimmed,
    };
    const updated = [...readUsers(editor), newUser];
    writeUsers(editor, updated);
    setUsers(updated);
  }, [editor]);

  const renameUser = useCallback((id: string, name: string) => {
    if (!editor) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    const current = readUsers(editor);
    const updated = current.map(u => u.id === id ? { ...u, name: trimmed } : u);
    writeUsers(editor, updated);
    setUsers(updated);
  }, [editor]);

  const removeUser = useCallback((id: string) => {
    if (!editor) return;

    // Remove user from definitions
    const current = readUsers(editor);
    const updated = current.filter(u => u.id !== id);
    writeUsers(editor, updated);
    setUsers(updated);

    // Clean up data-users attributes that reference the deleted user
    const wrapper = editor.DomComponents?.getWrapper?.();
    if (wrapper) {
      const cleanComponent = (comp: any) => {
        const attrs = comp.getAttributes?.() || {};
        const dataUsers = attrs['data-users'];
        if (dataUsers) {
          const userIds = dataUsers.split(',').map((s: string) => s.trim()).filter((s: string) => s !== id);
          if (userIds.length === 0) {
            // No users left — remove attribute (visible for all users)
            comp.removeAttributes?.(['data-users']);
          } else {
            comp.addAttributes?.({ 'data-users': userIds.join(',') });
          }
        }
        const children = comp.components?.();
        if (children) {
          children.forEach((child: any) => cleanComponent(child));
        }
      };
      cleanComponent(wrapper);
    }

    // If the active user was deleted, clear it
    if (activeUserId === id) {
      setActiveUser(null);
    }
  }, [editor, activeUserId]);

  const setActiveUser = useCallback((id: string | null) => {
    if (!editor) return;
    (editor as any).__activeUserId = id;
    setActiveUserIdLocal(id);
    editor.trigger('user:select', id);
  }, [editor]);

  return {
    users,
    activeUserId,
    addUser,
    renameUser,
    removeUser,
    setActiveUser,
  };
}
