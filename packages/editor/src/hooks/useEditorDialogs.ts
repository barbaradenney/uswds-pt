/**
 * Editor Dialogs Hook
 *
 * Groups modal/dialog visibility state from Editor.tsx into one hook
 * to reduce prop drilling and simplify the main component.
 */

import { useState, useCallback } from 'react';

export interface UseEditorDialogsReturn {
  showExport: boolean;
  showEmbed: boolean;
  showVersionHistory: boolean;
  showShortcuts: boolean;
  openExport: () => void;
  closeExport: () => void;
  openEmbed: () => void;
  closeEmbed: () => void;
  toggleVersionHistory: () => void;
  closeVersionHistory: () => void;
  openShortcuts: () => void;
  closeShortcuts: () => void;
}

/**
 * Manages open/close state for editor modal dialogs (export, embed,
 * version history, keyboard shortcuts) to reduce prop drilling.
 * @returns Visibility booleans and open/close/toggle callbacks for each dialog
 */
export function useEditorDialogs(): UseEditorDialogsReturn {
  const [showExport, setShowExport] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const openExport = useCallback(() => setShowExport(true), []);
  const closeExport = useCallback(() => setShowExport(false), []);
  const openEmbed = useCallback(() => setShowEmbed(true), []);
  const closeEmbed = useCallback(() => setShowEmbed(false), []);
  const toggleVersionHistory = useCallback(() => setShowVersionHistory(prev => !prev), []);
  const closeVersionHistory = useCallback(() => setShowVersionHistory(false), []);
  const openShortcuts = useCallback(() => setShowShortcuts(true), []);
  const closeShortcuts = useCallback(() => setShowShortcuts(false), []);

  return {
    showExport,
    showEmbed,
    showVersionHistory,
    showShortcuts,
    openExport,
    closeExport,
    openEmbed,
    closeEmbed,
    toggleVersionHistory,
    closeVersionHistory,
    openShortcuts,
    closeShortcuts,
  };
}
