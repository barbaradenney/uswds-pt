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
 * Read users from the editor instance property.
 * Falls back to an empty array if not yet initialized.
 */
function readUsers(editor: any): UserDefinition[] {
  const users = (editor as any).__projectUsers;
  return Array.isArray(users) ? users : [];
}

/**
 * Write users to the editor instance property.
 * This avoids calling loadProjectData() which would reset the entire editor.
 * Users are merged into the project data snapshot at save time.
 */
function writeUsers(editor: any, users: UserDefinition[]): void {
  (editor as any).__projectUsers = users;
}

export function useEditorUsers(): UseEditorUsersReturn {
  const editor = useEditorMaybe();
  const [users, setUsers] = useState<UserDefinition[]>([]);
  const [activeUserId, setActiveUserIdLocal] = useState<string | null>(null);

  // Initialize __projectUsers from project data on mount, and re-seed on 'load'
  // (covers crash recovery / version restore which call loadProjectData).
  useEffect(() => {
    if (!editor) return;

    const seedFromProjectData = () => {
      try {
        const data = editor.getProjectData?.();
        const stored = Array.isArray(data?.users) ? data.users : [];
        (editor as any).__projectUsers = stored;
        setUsers(stored);
      } catch {
        (editor as any).__projectUsers = [];
        setUsers([]);
      }
    };

    seedFromProjectData();

    // Re-seed when project data is fully reloaded (e.g. crash recovery, version restore)
    editor.on('load', seedFromProjectData);
    return () => { editor.off('load', seedFromProjectData); };
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
