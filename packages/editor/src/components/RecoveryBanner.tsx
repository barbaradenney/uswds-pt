/**
 * Recovery Banner
 *
 * Displayed when crash recovery data is available.
 * Shows a warning banner with Restore and Dismiss actions.
 */

export interface RecoveryBannerProps {
  timestamp: Date;
  onRestore: () => void;
  onDismiss: () => void;
}

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
}

const bannerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 16px',
  backgroundColor: '#faf3d1',
  borderBottom: '2px solid #e5a000',
  color: '#3d2c00',
  fontSize: '14px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  gap: '12px',
  flexShrink: 0,
};

const textStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap',
};

const buttonGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexShrink: 0,
};

const restoreButtonStyle: React.CSSProperties = {
  padding: '4px 12px',
  backgroundColor: '#005ea2',
  color: '#ffffff',
  border: 'none',
  borderRadius: '4px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

const dismissButtonStyle: React.CSSProperties = {
  padding: '4px 12px',
  backgroundColor: 'transparent',
  color: '#005ea2',
  border: '1px solid #005ea2',
  borderRadius: '4px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

export function RecoveryBanner({ timestamp, onRestore, onDismiss }: RecoveryBannerProps) {
  return (
    <div style={bannerStyle} role="alert" data-testid="recovery-banner">
      <span style={textStyle}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#e5a000" aria-hidden="true">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
        </svg>
        A local backup from {formatRelativeTime(timestamp)} was found. It may contain changes not in the last save.
      </span>
      <div style={buttonGroupStyle}>
        <button style={restoreButtonStyle} onClick={onRestore}>
          Restore
        </button>
        <button style={dismissButtonStyle} onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
