/**
 * Date Formatting Utilities
 * Shared date formatting functions for consistent display across the app
 */

/**
 * Format a date for display (e.g., "Jan 15, 2024")
 */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date with time (e.g., "Jan 15, 2024, 3:30 PM")
 */
export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format a relative time (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = new Date(date);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      return 'just now';
    }
    if (diffHours > 0) {
      return `in ${diffHours} hour${diffHours === 1 ? '' : 's'}`;
    }
    return `${Math.abs(diffHours)} hour${Math.abs(diffHours) === 1 ? '' : 's'} ago`;
  }

  if (diffDays > 0) {
    return `in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  }

  return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
}
