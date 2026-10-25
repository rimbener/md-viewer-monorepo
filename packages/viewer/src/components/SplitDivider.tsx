import { useRef, type CSSProperties } from 'react';

import {
  clampEditorFraction,
  DEFAULT_EDITOR_FRACTION,
  EDITOR_FRACTION_STEP,
  MAX_EDITOR_FRACTION,
  MIN_EDITOR_FRACTION,
} from '../split';
import { useTheme } from '../theme';

/** The grab area each side of the 1 px line. */
const GRAB = 4;

interface SplitDividerProps {
  /** The editor's share of the split, 0 to 1. */
  fraction: number;
  /** Every move of a drag or key press. */
  onChange: (next: number) => void;
  /** The end of a drag or key press: the value to keep. */
  onCommit: (next: number) => void;
}

/** The line between the editor and the preview, dragged to resize them. */
export function SplitDivider({
  fraction,
  onChange,
  onCommit,
}: SplitDividerProps) {
  const theme = useTheme();
  const drag = useRef<{ left: number; width: number } | null>(null);
  const latest = useRef(fraction);
  latest.current = fraction;

  function fractionAt(clientX: number): number {
    const box = drag.current;
    if (box === null || box.width <= 0) {
      return latest.current;
    }
    return clampEditorFraction((clientX - box.left) / box.width);
  }

  function keep(next: number): void {
    onChange(next);
    onCommit(next);
  }

  return (
    <div style={{ ...styles.line, backgroundColor: theme.border }}>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize editor"
        aria-valuemin={Math.round(MIN_EDITOR_FRACTION * 100)}
        aria-valuemax={Math.round(MAX_EDITOR_FRACTION * 100)}
        aria-valuenow={Math.round(fraction * 100)}
        tabIndex={0}
        className="field"
        style={styles.grab}
        onPointerDown={event => {
          const split = event.currentTarget.parentElement?.parentElement;
          if (split == null || event.button !== 0) {
            return;
          }
          // Without this the drag selects the text on both sides.
          event.preventDefault();
          const box = split.getBoundingClientRect();
          drag.current = { left: box.left, width: box.width };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={event => {
          if (drag.current !== null) {
            onChange(fractionAt(event.clientX));
          }
        }}
        onPointerUp={event => {
          if (drag.current !== null) {
            const next = fractionAt(event.clientX);
            drag.current = null;
            keep(next);
          }
        }}
        onPointerCancel={() => {
          if (drag.current !== null) {
            drag.current = null;
            onCommit(latest.current);
          }
        }}
        onDoubleClick={() => keep(DEFAULT_EDITOR_FRACTION)}
        onKeyDown={event => {
          const direction =
            event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
          if (direction !== 0) {
            event.preventDefault();
            keep(
              clampEditorFraction(fraction + direction * EDITOR_FRACTION_STEP),
            );
          }
        }}
      />
    </div>
  );
}

const styles = {
  line: {
    position: 'relative',
    width: 1,
    flexShrink: 0,
  },
  grab: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -GRAB,
    right: -GRAB,
    zIndex: 1,
    cursor: 'col-resize',
    touchAction: 'none',
  },
} satisfies Record<string, CSSProperties>;
