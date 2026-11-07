import type { CSSProperties, MouseEvent, ReactNode } from 'react';

import { M3eSplitPane, type M3eSplitPaneElement } from '../m3e';
import {
  DEFAULT_EDITOR_FRACTION,
  EDITOR_FRACTION_STEP,
  MAX_EDITOR_FRACTION,
  MIN_EDITOR_FRACTION,
} from '../split';

interface EditorSplitProps {
  /** False shows the editor alone. */
  isSplit: boolean;
  /** The editor's share of the split, 0 to 1. */
  fraction: number;
  /** Every move of a drag or key press. */
  onChange: (next: number) => void;
  /** The end of a drag or key press: the value to keep. */
  onCommit: (next: number) => void;
  editor: ReactNode;
  preview: ReactNode;
}

const percent = (fraction: number) => Math.round(fraction * 100);

function paneFraction(event: Event): number | null {
  if (event.target !== event.currentTarget) {
    return null;
  }
  return (event.currentTarget as M3eSplitPaneElement).value / 100;
}

function isOnHandle(event: MouseEvent): boolean {
  return event.nativeEvent
    .composedPath()
    .some(node => node instanceof HTMLElement && node.id === 'drag-handle');
}

/**
 * Source on the left, rendered document on the right. The pane stays mounted
 * with the editor alone, so the textarea keeps caret, selection and scroll.
 */
export function EditorSplit({
  isSplit,
  fraction,
  onChange,
  onCommit,
  editor,
  preview,
}: EditorSplitProps) {
  return (
    <M3eSplitPane
      orientation="horizontal"
      label="Resize editor"
      value={percent(fraction)}
      min={percent(MIN_EDITOR_FRACTION)}
      max={percent(MAX_EDITOR_FRACTION)}
      step={percent(EDITOR_FRACTION_STEP)}
      disabled={!isSplit}
      style={isSplit ? styles.split : { ...styles.split, ...styles.alone }}
      onInput={(event: Event) => {
        const next = paneFraction(event);
        if (next !== null) {
          onChange(next);
        }
      }}
      onChange={(event: Event) => {
        const next = paneFraction(event);
        if (next !== null) {
          onCommit(next);
        }
      }}
      onDoubleClick={event => {
        if (isSplit && isOnHandle(event)) {
          onChange(DEFAULT_EDITOR_FRACTION);
          onCommit(DEFAULT_EDITOR_FRACTION);
        }
      }}
    >
      <div slot="start" style={styles.source}>
        {editor}
      </div>
      {isSplit ? (
        <div slot="end" style={styles.preview}>
          {preview}
        </div>
      ) : null}
    </M3eSplitPane>
  );
}

const styles = {
  split: {
    flex: 1,
    minHeight: 0,
  },
  // With no end pane the handle would still take its width.
  alone: {
    '--m3e-split-pane-drag-handle-container-width': '0px',
  } as CSSProperties,
  source: {
    height: '100%',
    minWidth: 0,
    display: 'flex',
  },
  preview: {
    height: '100%',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
} satisfies Record<string, CSSProperties>;
