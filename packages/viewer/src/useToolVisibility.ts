import { useCallback } from 'react';

import {
  loadFindVisible,
  loadToolbarVisible,
  saveFindVisible,
  saveToolbarVisible,
} from './preferences';
import { useShortcut } from './shortcuts';
import { useStoredPreference } from './useStoredPreference';

/** Whether the tools row and the find row show; both are kept for the next launch. */
export function useToolVisibility() {
  const [isToolbarVisible, chooseToolbar] = useStoredPreference(
    loadToolbarVisible,
    saveToolbarVisible,
    true,
  );
  const [isFindVisible, chooseFind] = useStoredPreference(
    loadFindVisible,
    saveFindVisible,
    true,
  );

  const toggleToolbar = useCallback(
    () => chooseToolbar(!isToolbarVisible),
    [chooseToolbar, isToolbarVisible],
  );
  const toggleFind = useCallback(
    () => chooseFind(!isFindVisible),
    [chooseFind, isFindVisible],
  );
  const showFind = useCallback(() => chooseFind(true), [chooseFind]);

  // A hidden find row shows first; the field's own handler then focuses it.
  useShortcut(
    'f',
    () => {
      if (isFindVisible) {
        return false;
      }
      showFind();
      return new Promise(resolve => setTimeout(resolve));
    },
    { withShift: true, first: true },
  );

  return {
    isToolbarVisible,
    isFindVisible,
    toggleToolbar,
    toggleFind,
    showFind,
  };
}
