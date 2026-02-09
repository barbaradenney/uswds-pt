/**
 * Branch Prompt Toast
 *
 * A small, dismissable toast that appears after the first save of a new prototype.
 * Suggests creating a branch to experiment safely. Only shown once per session.
 */

import { useEffect, useState, useRef, useCallback } from 'react';

interface BranchPromptToastProps {
  onCreateBranch: () => void;
  onDismiss: () => void;
}

export function BranchPromptToast({ onCreateBranch, onDismiss }: BranchPromptToastProps) {
  const [visible, setVisible] = useState(false);
  const fadeOutTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const autoDismissTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Stabilize onDismiss via ref so effects don't reset timers on parent re-render
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  // Fade in after mount + auto-dismiss after 15s
  useEffect(() => {
    const fadeInTimer = setTimeout(() => setVisible(true), 50);
    autoDismissTimerRef.current = setTimeout(() => {
      setVisible(false);
      fadeOutTimerRef.current = setTimeout(() => onDismissRef.current(), 200);
    }, 15_000);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(autoDismissTimerRef.current);
      clearTimeout(fadeOutTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount; uses refs for latest callbacks
  }, []);

  const handleDismiss = useCallback(() => {
    clearTimeout(autoDismissTimerRef.current);
    setVisible(false);
    fadeOutTimerRef.current = setTimeout(() => onDismissRef.current(), 200);
  }, []);

  // Escape key dismisses the toast
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
        border: '1px solid #e0e0e0',
        maxWidth: '360px',
        fontSize: '0.875rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}
    >
      <div style={{ flex: 1 }}>
        <p style={{ margin: '0 0 8px', fontWeight: 500 }}>
          Create a branch to experiment safely?
        </p>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-base-light, #71767a)' }}>
          Branches let you try changes without affecting the main version.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
        <button
          className="btn btn-primary"
          onClick={onCreateBranch}
          style={{ fontSize: '0.75rem', padding: '4px 12px' }}
        >
          Create Branch
        </button>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.75rem',
            color: 'var(--color-base-light, #71767a)',
            padding: '4px',
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
