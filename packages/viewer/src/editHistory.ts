/**
 * Undo and Redo for one document's source. Each step is a whole snapshot of
 * the text, so a step costs the document's size and the stack stays short.
 */

/** How many steps one document can undo. Older ones fall off the front. */
const MAX_STEPS = 100;

/** Edits closer together than this are one step, so Undo takes back a burst. */
const MERGE_MS = 1000;

export interface EditHistory {
  past: readonly string[];
  future: readonly string[];
  /** When the newest step was recorded, or null when the next edit must not merge. */
  lastAt: number | null;
}

const EMPTY: EditHistory = { past: [], future: [], lastAt: null };

export function emptyEditHistory(): EditHistory {
  return EMPTY;
}

export function canUndo(history: EditHistory): boolean {
  return history.past.length > 0;
}

export function canRedo(history: EditHistory): boolean {
  return history.future.length > 0;
}

/** Records that `before` was replaced at `at`. A new edit drops the redo steps. */
export function recordEdit(
  history: EditHistory,
  before: string,
  at: number,
): EditHistory {
  if (
    history.lastAt !== null &&
    at - history.lastAt < MERGE_MS &&
    history.past.length > 0
  ) {
    return { past: history.past, future: [], lastAt: at };
  }
  const past = [...history.past, before].slice(-MAX_STEPS);
  return { past, future: [], lastAt: at };
}

export type HistoryStep = { history: EditHistory; text: string };

/** The text before the last step, or null when there is nothing to undo. */
export function undoEdit(
  history: EditHistory,
  current: string,
): HistoryStep | null {
  const text = history.past.at(-1);
  if (text === undefined) {
    return null;
  }
  return {
    text,
    history: {
      past: history.past.slice(0, -1),
      future: [...history.future, current],
      lastAt: null,
    },
  };
}

/** The text the last Undo took back, or null when there is nothing to redo. */
export function redoEdit(
  history: EditHistory,
  current: string,
): HistoryStep | null {
  const text = history.future.at(-1);
  if (text === undefined) {
    return null;
  }
  return {
    text,
    history: {
      past: [...history.past, current].slice(-MAX_STEPS),
      future: history.future.slice(0, -1),
      lastAt: null,
    },
  };
}
