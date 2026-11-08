import type { CSSProperties, ReactNode, SyntheticEvent } from 'react';

import { M3eSplitPane, type M3eSplitPaneElement } from '../m3e';
import {
  clampEditorFraction,
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
  /** The end of a drag or key press: the value to keep. */
  onCommit: (next: number) => void;
  editor: ReactNode;
  preview: ReactNode;
}

const percent = (fraction: number) => fraction * 100;

function paneFraction(event: Event): number | null {
  if (event.target !== event.currentTarget) {
    return null;
  }
  return (event.currentTarget as M3eSplitPaneElement).value / 100;
}

const RESIZE_CURSOR_ID = 'editor-split-cursor';

/** m3e shows a grab cursor; the sidebar handle shows col-resize. */
function addResizeCursor(pane: M3eSplitPaneElement | null): void {
  const root = pane?.shadowRoot;
  if (!root || root.getElementById(RESIZE_CURSOR_ID) !== null) {
    return;
  }
  const style = document.createElement('style');
  style.id = RESIZE_CURSOR_ID;
  style.textContent =
    '.drag-handle:not([aria-disabled]) { cursor: col-resize !important; }';
  root.append(style);
}

function isOnHandle(event: SyntheticEvent): boolean {
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
  onCommit,
  editor,
  preview,
}: EditorSplitProps) {
  return (
    <M3eSplitPane
      ref={addResizeCursor}
      orientation="horizontal"
      label="Resize editor"
      value={percent(fraction)}
      min={percent(MIN_EDITOR_FRACTION)}
      max={percent(MAX_EDITOR_FRACTION)}
      step={percent(EDITOR_FRACTION_STEP)}
      disabled={!isSplit}
      style={isSplit ? styles.split : { ...styles.split, ...styles.alone }}
      // The pane moves itself during a drag; a render per move would be slow.
      onChange={(event: Event) => {
        const next = paneFraction(event);
        if (next !== null) {
          onCommit(clampEditorFraction(next));
        }
      }}
      onPointerDown={event => {
        // Else the press starts a text selection that the drag extends.
        if (isOnHandle(event)) {
          event.preventDefault();
        }
      }}
      onDoubleClick={event => {
        if (isSplit && isOnHandle(event)) {
          event.currentTarget.value = percent(DEFAULT_EDITOR_FRACTION);
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
  // Without inline-size containment each pane's width follows its content,
  // not the split value, and every move measures the whole document.
  source: {
    height: '100%',
    contain: 'inline-size',
    display: 'flex',
  },
  preview: {
    height: '100%',
    contain: 'inline-size',
    display: 'flex',
    flexDirection: 'column',
  },
} satisfies Record<string, CSSProperties>;
