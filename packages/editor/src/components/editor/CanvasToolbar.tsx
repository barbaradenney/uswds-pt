/**
 * CanvasToolbar Component
 *
 * Compact toolbar above the canvas with a device viewport dropdown
 * and view toggle buttons (outline, code view, fullscreen).
 *
 * Uses useEditorMaybe() from @grapesjs/react to access the editor instance.
 * State/user dropdowns read org-level definitions via useOrganization.
 */

import { useState, useEffect, useCallback } from 'react';
import { useEditorMaybe } from '@grapesjs/react';
import { useOrganization } from '../../hooks/useOrganization';
import { EDITOR_EVENTS, EDITOR_PROPS } from '../../lib/contracts';

type DeviceId = 'Desktop' | 'Tablet' | 'Mobile portrait';

const DEVICE_OPTIONS: { id: DeviceId; label: string }[] = [
  { id: 'Desktop', label: 'Desktop' },
  { id: 'Tablet', label: 'Tablet' },
  { id: 'Mobile portrait', label: 'Mobile' },
];

interface ToggleCommand {
  id: string;
  label: string;
  ariaLabel: string;
  icon: JSX.Element;
}

const TOGGLE_COMMANDS: ToggleCommand[] = [
  {
    id: 'sw-visibility',
    label: 'Outline',
    ariaLabel: 'Toggle component outlines',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm8-2h8v8h-8v-8zm2 2v4h4v-4h-4z" />
      </svg>
    ),
  },
  {
    id: 'core:open-code',
    label: 'Code',
    ariaLabel: 'Toggle code view',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M8.293 6.293 2.586 12l5.707 5.707 1.414-1.414L5.414 12l4.293-4.293-1.414-1.414zm7.414 0-1.414 1.414L18.586 12l-4.293 4.293 1.414 1.414L21.414 12l-5.707-5.707z" />
      </svg>
    ),
  },
  {
    id: 'core:fullscreen',
    label: 'Fullscreen',
    ariaLabel: 'Toggle fullscreen',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M3 3h6v2H5v4H3V3zm12 0h6v6h-2V5h-4V3zM3 15h2v4h4v2H3v-6zm16 0h2v6h-6v-2h4v-4z" />
      </svg>
    ),
  },
];

export function CanvasToolbar() {
  const editor = useEditorMaybe();
  const { organization } = useOrganization();

  const states = organization?.stateDefinitions || [];
  const users = organization?.userDefinitions || [];

  const [activeStateId, setActiveStateId] = useState<string | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [activeDevice, setActiveDevice] = useState<DeviceId>('Desktop');
  const [activeCommands, setActiveCommands] = useState<Set<string>>(new Set());

  const handleSetActiveState = useCallback((id: string | null) => {
    setActiveStateId(id);
    if (editor) {
      (editor as any)[EDITOR_PROPS.ACTIVE_STATE_ID] = id;
      editor.trigger(EDITOR_EVENTS.STATE_SELECT, id);
    }
  }, [editor]);

  const handleSetActiveUser = useCallback((id: string | null) => {
    setActiveUserId(id);
    if (editor) {
      (editor as any)[EDITOR_PROPS.ACTIVE_USER_ID] = id;
      editor.trigger(EDITOR_EVENTS.USER_SELECT, id);
    }
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const onDeviceSelect = () => {
      const device = editor.Devices?.getSelected?.();
      const name = device?.get?.('name') || device?.getName?.() || 'Desktop';
      setActiveDevice(name as DeviceId);
    };

    // Check initial active commands
    const initialActive = new Set<string>();
    for (const cmd of TOGGLE_COMMANDS) {
      if (editor.Commands?.isActive?.(cmd.id)) {
        initialActive.add(cmd.id);
      }
    }
    if (initialActive.size > 0) {
      setActiveCommands(initialActive);
    }

    editor.on('device:select', onDeviceSelect);

    const onRun = (id: string) => {
      if (TOGGLE_COMMANDS.some((c) => c.id === id)) {
        setActiveCommands((prev) => new Set(prev).add(id));
      }
    };
    const onStop = (id: string) => {
      if (TOGGLE_COMMANDS.some((c) => c.id === id)) {
        setActiveCommands((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    };

    editor.on('run', onRun);
    editor.on('stop', onStop);

    return () => {
      editor.off('device:select', onDeviceSelect);
      editor.off('run', onRun);
      editor.off('stop', onStop);
    };
  }, [editor]);

  const handleDeviceChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!editor) return;
      editor.Devices?.select?.(e.target.value);
    },
    [editor]
  );

  const handleToggleCommand = useCallback(
    (cmdId: string) => {
      if (!editor) return;
      if (editor.Commands?.isActive?.(cmdId)) {
        editor.Commands.stop(cmdId);
      } else {
        editor.Commands.run(cmdId);
      }
    },
    [editor]
  );

  return (
    <div className="canvas-toolbar">
      {/* Left: State switcher + Device dropdown */}
      <div className="canvas-toolbar-group">
        {states.length > 0 && (
          <select
            className="canvas-toolbar-select"
            value={activeStateId || ''}
            onChange={(e) => handleSetActiveState(e.target.value || null)}
            aria-label="Active state"
          >
            <option value="">All States</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        {users.length > 0 && (
          <select
            className="canvas-toolbar-select"
            value={activeUserId || ''}
            onChange={(e) => handleSetActiveUser(e.target.value || null)}
            aria-label="Active user"
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        )}
        <select
          className="canvas-toolbar-select"
          value={activeDevice}
          onChange={handleDeviceChange}
          aria-label="Viewport size"
        >
          {DEVICE_OPTIONS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {/* Right: View toggles */}
      <div className="canvas-toolbar-group">
        {TOGGLE_COMMANDS.map((cmd) => (
          <button
            key={cmd.id}
            className={`canvas-toolbar-btn${activeCommands.has(cmd.id) ? ' canvas-toolbar-btn--active' : ''}`}
            onClick={() => handleToggleCommand(cmd.id)}
            aria-label={cmd.ariaLabel}
            title={cmd.label}
          >
            {cmd.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
