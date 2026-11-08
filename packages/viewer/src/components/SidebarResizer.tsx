import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react';

import {
  clampSidebarWidth,
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_STEP,
} from '../sidebarWidth';

export const SIDEBAR_WIDTH_PROPERTY = '--m3e-drawer-container-width';

const RESIZING = 'data-resizing';
const NO_TRANSITION_ID = 'sidebar-resizer';

type SidebarResizerProps = {
  width: number;
  /** The drawer container whose width the handle drives. */
  drawerRef: RefObject<HTMLElement | null>;
  onCommit: (width: number) => void;
};

type Drag = { pointerId: number; startX: number; startWidth: number };

/**
 * The drawer animates its margins, so a drag would trail the pointer. The
 * drawer has no part for that, so a rule goes into its shadow root once.
 */
function stopTransitions(drawer: HTMLElement): void {
  const root = drawer.shadowRoot;
  if (root === null || root.getElementById(NO_TRANSITION_ID) !== null) {
    return;
  }
  const style = document.createElement('style');
  style.id = NO_TRANSITION_ID;
  style.textContent = `:host([${RESIZING}]) .start, :host([${RESIZING}]) .content { transition: none; }`;
  root.append(style);
}

/** A handle on the sidebar's end edge: drag, arrow keys, double click resets. */
export function SidebarResizer({
  width,
  drawerRef,
  onCommit,
}: SidebarResizerProps) {
  const drag = useRef<Drag | null>(null);
  const [isActive, setIsActive] = useState(false);

  // A render per move would be slow; the drawer takes the width directly.
  const show = (next: number) =>
    drawerRef.current?.style.setProperty(SIDEBAR_WIDTH_PROPERTY, `${next}px`);

  const end = (event: PointerEvent<HTMLDivElement>, isCancelled: boolean) => {
    const current = drag.current;
    if (current === null || current.pointerId !== event.pointerId) {
      return;
    }
    drag.current = null;
    setIsActive(false);
    drawerRef.current?.removeAttribute(RESIZING);
    // A cancelled pointer has no usable position, often 0.
    if (isCancelled) {
      show(current.startWidth);
      return;
    }
    onCommit(
      clampSidebarWidth(current.startWidth + event.clientX - current.startX),
    );
  };

  const commit = (next: number) => {
    const clamped = clampSidebarWidth(next);
    show(clamped);
    onCommit(clamped);
  };

  return (
    <div
      role="separator"
      aria-label="Resize sidebar"
      aria-orientation="vertical"
      aria-valuemin={MIN_SIDEBAR_WIDTH}
      aria-valuemax={MAX_SIDEBAR_WIDTH}
      aria-valuenow={width}
      tabIndex={0}
      style={{
        ...styles.handle,
        backgroundColor: isActive
          ? 'var(--md-sys-color-outline)'
          : 'transparent',
      }}
      onPointerDown={event => {
        if (event.button !== 0) {
          return;
        }
        // Else the press starts a text selection that the drag extends.
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        drag.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startWidth: width,
        };
        setIsActive(true);
        const drawer = drawerRef.current;
        if (drawer !== null) {
          stopTransitions(drawer);
          drawer.setAttribute(RESIZING, '');
        }
      }}
      onPointerMove={event => {
        const current = drag.current;
        if (current !== null && current.pointerId === event.pointerId) {
          show(
            clampSidebarWidth(
              current.startWidth + event.clientX - current.startX,
            ),
          );
        }
      }}
      onPointerUp={event => end(event, false)}
      onPointerCancel={event => end(event, true)}
      onDoubleClick={() => commit(DEFAULT_SIDEBAR_WIDTH)}
      onKeyDown={(event: KeyboardEvent) => {
        const next =
          event.key === 'ArrowLeft'
            ? width - SIDEBAR_WIDTH_STEP
            : event.key === 'ArrowRight'
              ? width + SIDEBAR_WIDTH_STEP
              : event.key === 'Home'
                ? MIN_SIDEBAR_WIDTH
                : event.key === 'End'
                  ? MAX_SIDEBAR_WIDTH
                  : null;
        if (next !== null) {
          event.preventDefault();
          commit(next);
        }
      }}
    />
  );
}

const styles = {
  handle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    insetInlineEnd: 0,
    width: 6,
    zIndex: 1,
    cursor: 'col-resize',
    touchAction: 'none',
    outlineOffset: -2,
  },
} as const;
