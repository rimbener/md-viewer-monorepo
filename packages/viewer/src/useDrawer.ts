import { useCallback, useRef, type MouseEvent } from 'react';

import type { M3eDrawerContainerElement } from './m3e';
import { loadSidebarVisible, saveSidebarVisible } from './preferences';
import { useShortcut } from './shortcuts';
import { useStoredPreference } from './useStoredPreference';

/** Narrower than this, the `auto` drawer covers or pushes the document. */
const MODAL_DRAWER_QUERY = '(max-width: 959.98px)';

function isDrawerModal(): boolean {
  return window.matchMedia?.(MODAL_DRAWER_QUERY).matches ?? false;
}

function isScrim(event: Event): boolean {
  const origin = event.composedPath()[0];
  return origin instanceof HTMLElement && origin.classList.contains('scrim');
}

export function useDrawer() {
  // The tree shows by default; hiding it is how you get a full-width read.
  const [isSidebarVisible, chooseSidebar, setIsSidebarVisible] =
    useStoredPreference(loadSidebarVisible, saveSidebarVisible, true);

  const toggleSidebar = useCallback(
    () => chooseSidebar(!isSidebarVisible),
    [chooseSidebar, isSidebarVisible],
  );

  const drawerRef = useRef<M3eDrawerContainerElement>(null);
  const isScrimClick = useRef(false);

  // The drawer closes itself on a scrim click (a choice, so it is kept) and
  // when the window narrows past a breakpoint (not a choice, or a phone would
  // store "hidden" at every launch).
  const onChange = useCallback(
    (event: Event) => {
      if (event.target !== event.currentTarget) {
        return;
      }
      const isOpen = (event.currentTarget as M3eDrawerContainerElement).start;
      if (isScrimClick.current) {
        isScrimClick.current = false;
        chooseSidebar(isOpen);
      } else {
        setIsSidebarVisible(isOpen);
      }
    },
    [chooseSidebar, setIsSidebarVisible],
  );

  const onClickCapture = useCallback((event: MouseEvent) => {
    isScrimClick.current = isScrim(event.nativeEvent);
  }, []);

  const closeModal = useCallback(() => {
    if (isDrawerModal()) {
      setIsSidebarVisible(false);
    }
  }, [setIsSidebarVisible]);

  useShortcut('b', toggleSidebar);
  useShortcut(
    'f',
    () => {
      const drawer = drawerRef.current;
      if (drawer === null || !drawer.start || !isDrawerModal()) {
        return false;
      }
      // An open modal drawer makes the document inert, so the find field
      // cannot take the focus until the drawer has closed.
      setIsSidebarVisible(false);
      drawer.start = false;
      return drawer.updateComplete;
    },
    { withShift: true, first: true },
  );

  return {
    isSidebarVisible,
    toggleSidebar,
    closeModal,
    containerProps: {
      ref: drawerRef,
      start: isSidebarVisible,
      onClickCapture,
      onChange,
    },
  };
}
