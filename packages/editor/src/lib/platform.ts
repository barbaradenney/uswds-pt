/**
 * Platform detection utilities
 */

export const isMac = typeof navigator !== 'undefined' && /Macintosh/.test(navigator.userAgent);
export const mod = isMac ? '⌘' : 'Ctrl';
