/**
 * CanvasToolbar Component
 *
 * Compact toolbar above the canvas with device viewport switcher
 * and view toggle buttons (outline, code view, fullscreen).
 *
 * Uses useEditorMaybe() from @grapesjs/react to access the editor instance.
 */

import { useState, useEffect, useCallback } from 'react';
import { useEditorMaybe } from '@grapesjs/react';

type DeviceId = 'Desktop' | 'Tablet' | 'Mobile portrait';

interface DeviceOption {
  id: DeviceId;
  label: string;
  icon: JSX.Element;
}

const DEVICES: DeviceOption[] = [
  {
    id: 'Desktop',
    label: 'Desktop',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M21 2H3a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h7v2H8v2h8v-2h-2v-2h7a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1zm-1 14H4V4h16v12z" />
      </svg>
    ),
  },
  {
    id: 'Tablet',
    label: 'Tablet',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M18 0H6a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zm-4 22h-4v-1h4v1zm5-3H5V3h14v16z" />
      </svg>
    ),
  },
  {
    id: 'Mobile portrait',
    label: 'Mobile',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M17 1H7a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zm-3 20h-4v-1h4v1zm4-3H6V4h12v14z" />
      </svg>
    ),
  },
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

  const [activeDevice, setActiveDevice] = useState<DeviceId>('Desktop');
  const [activeCommands, setActiveCommands] = useState<Set<string>>(new Set());

  // Sync device state from editor events
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

    // Track command run/stop for toggle state
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

  const handleDeviceSelect = useCallback(
    (deviceId: DeviceId) => {
      if (!editor) return;
      editor.Devices?.select?.(deviceId);
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
      {/* Left: Device switcher */}
      <div className="canvas-toolbar-group">
        {DEVICES.map((device) => (
          <button
            key={device.id}
            className={`canvas-toolbar-btn${activeDevice === device.id ? ' canvas-toolbar-btn--active' : ''}`}
            onClick={() => handleDeviceSelect(device.id)}
            aria-label={device.label}
            title={device.label}
          >
            {device.icon}
          </button>
        ))}
      </div>

      {/* Right: View toggles */}
      <div className="canvas-toolbar-group">
        {TOGGLE_COMMANDS.map((cmd, i) => (
          <span key={cmd.id}>
            {i > 0 && <span className="canvas-toolbar-separator" />}
            <button
              className={`canvas-toolbar-btn${activeCommands.has(cmd.id) ? ' canvas-toolbar-btn--active' : ''}`}
              onClick={() => handleToggleCommand(cmd.id)}
              aria-label={cmd.ariaLabel}
              title={cmd.label}
            >
              {cmd.icon}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
