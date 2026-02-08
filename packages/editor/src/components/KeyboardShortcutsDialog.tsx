/**
 * Keyboard Shortcuts Dialog
 *
 * Accessible modal showing all available keyboard shortcuts.
 * Triggered by the ? key or the help button in the editor header.
 */

import { useEffect, useRef, useCallback } from 'react';

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent);
const mod = isMac ? '⌘' : 'Ctrl';

const shortcuts = [
  { keys: `${mod}+S`, description: 'Save' },
  { keys: `${mod}+Z`, description: 'Undo' },
  { keys: `${mod}+Shift+Z`, description: 'Redo' },
  { keys: `${mod}+C`, description: 'Copy' },
  { keys: `${mod}+V`, description: 'Paste' },
  { keys: `${mod}+X`, description: 'Cut' },
  { keys: 'Delete / Backspace', description: 'Remove selected component' },
  { keys: 'Escape', description: 'Deselect component' },
  { keys: '?', description: 'Show this dialog' },
];

export function KeyboardShortcutsDialog({ isOpen, onClose }: KeyboardShortcutsDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store the previously focused element and focus the dialog on open
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        dialogRef.current?.focus();
      });
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Handle keydown: Escape to close, Tab focus trap
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    // Focus trap: keep Tab/Shift+Tab within the dialog
    if (e.key === 'Tab') {
      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to prevent the opening click from immediately closing
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-dialog-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '24px 32px',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
          outline: 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 id="shortcuts-dialog-title" style={{ margin: 0, fontSize: '1.25rem' }}>Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.25rem',
              color: '#71767a',
              padding: '4px',
            }}
          >
            ×
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {shortcuts.map((s) => (
              <tr key={s.keys} style={{ borderBottom: '1px solid #e6e6e6' }}>
                <td style={{ padding: '8px 12px 8px 0', fontSize: '0.875rem' }}>
                  {s.description}
                </td>
                <td style={{ padding: '8px 0', textAlign: 'right' }}>
                  <kbd
                    style={{
                      background: '#f0f0f0',
                      border: '1px solid #ccc',
                      borderRadius: '3px',
                      padding: '2px 6px',
                      fontSize: '0.8125rem',
                      fontFamily: 'system-ui, sans-serif',
                    }}
                  >
                    {s.keys}
                  </kbd>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
