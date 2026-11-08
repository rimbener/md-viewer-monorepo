import {
  canRedo,
  canUndo,
  emptyEditHistory,
  recordEdit,
  redoEdit,
  undoEdit,
  type EditHistory,
  type HistoryStep,
} from './editHistory';

// Past this size the document is almost certainly not prose, and parsing blocks the page.
export const MAX_RENDERED_CHARACTERS = 500_000;

export interface DocumentSession {
  path: string | null;
  source: string | null;
  drafts: ReadonlyMap<string, string>;
  histories: ReadonlyMap<string, EditHistory>;
  // Trails the draft by the reparse delay, so a burst of keystrokes parses once.
  settled: string | null;
  isLoading: boolean;
  error: string | null;
  diskChanged: boolean;
  isSaving: boolean;
  saveError: string | null;
}

export type DocumentEvent =
  | { type: 'opened'; path: string | null }
  | { type: 'read'; path: string; text: string }
  | { type: 'readFailed'; path: string; message: string }
  | { type: 'reread'; path: string; text: string }
  | { type: 'edited'; text: string; at: number }
  | { type: 'replaced'; text: string }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'settled' }
  | { type: 'saveStarted' }
  | { type: 'saved'; path: string; contents: string }
  | { type: 'saveFailed'; path: string; message: string };

export const initialDocumentSession: DocumentSession = {
  path: null,
  source: null,
  drafts: new Map(),
  histories: new Map(),
  settled: null,
  isLoading: false,
  error: null,
  diskChanged: false,
  isSaving: false,
  saveError: null,
};

export function draftOf(state: DocumentSession): string | null {
  return state.path === null ? null : (state.drafts.get(state.path) ?? null);
}

function historyOf(state: DocumentSession): EditHistory {
  return state.path === null
    ? emptyEditHistory()
    : (state.histories.get(state.path) ?? emptyEditHistory());
}

export function textOf(state: DocumentSession): string | null {
  return draftOf(state) ?? state.source;
}

export function renderedOf(state: DocumentSession): string | null {
  return state.settled ?? state.source;
}

export function isTooLarge(text: string | null): boolean {
  return text !== null && text.length > MAX_RENDERED_CHARACTERS;
}

export function canUndoIn(state: DocumentSession): boolean {
  return canUndo(historyOf(state));
}

export function canRedoIn(state: DocumentSession): boolean {
  return canRedo(historyOf(state));
}

function withEntry<V>(
  map: ReadonlyMap<string, V>,
  key: string,
  value: V | null,
): ReadonlyMap<string, V> {
  const next = new Map(map);
  if (value === null) {
    next.delete(key);
  } else {
    next.set(key, value);
  }
  return next;
}

function open(state: DocumentSession, path: string | null): DocumentSession {
  const reset = { ...state, path, diskChanged: false, saveError: null };
  if (path === null) {
    return { ...reset, source: null, settled: null, error: null };
  }
  return {
    ...reset,
    settled: state.drafts.get(path) ?? null,
    isLoading: true,
    error: null,
  };
}

// Text that matches the file on disk is not a draft.
function apply(
  state: DocumentSession,
  path: string,
  next: string,
  history: EditHistory,
): DocumentSession {
  const draft = next === state.source ? null : next;
  return {
    ...state,
    histories: withEntry(state.histories, path, history),
    drafts: withEntry(state.drafts, path, draft),
    diskChanged: draft === null ? false : state.diskChanged,
    saveError: null,
  };
}

function change(
  state: DocumentSession,
  next: string,
  record: (history: EditHistory, before: string) => EditHistory,
): DocumentSession {
  const before = textOf(state) ?? '';
  if (state.path === null || next === before) {
    return state;
  }
  return apply(state, state.path, next, record(historyOf(state), before));
}

function step(
  state: DocumentSession,
  move: (history: EditHistory, current: string) => HistoryStep | null,
): DocumentSession {
  const next =
    state.path === null ? null : move(historyOf(state), textOf(state) ?? '');
  return state.path === null || next === null
    ? state
    : apply(state, state.path, next.text, next.history);
}

function save(
  state: DocumentSession,
  path: string,
  contents: string,
): DocumentSession {
  // Typing during the write leaves a newer draft, which stays unsaved.
  const isWritten = state.drafts.get(path) === contents;
  const drafts = isWritten ? withEntry(state.drafts, path, null) : state.drafts;
  if (state.path !== path) {
    return { ...state, drafts, isSaving: false };
  }
  const settled = isWritten
    ? { settled: null, diskChanged: false }
    : { settled: state.settled, diskChanged: state.diskChanged };
  return { ...state, ...settled, drafts, source: contents, isSaving: false };
}

export function reduceDocumentSession(
  state: DocumentSession,
  event: DocumentEvent,
): DocumentSession {
  switch (event.type) {
    case 'opened':
      return open(state, event.path);
    case 'read':
      return event.path === state.path
        ? { ...state, source: event.text, isLoading: false }
        : state;
    case 'readFailed':
      return event.path === state.path
        ? { ...state, source: null, error: event.message, isLoading: false }
        : state;
    case 'reread':
      if (event.path !== state.path || event.text === state.source) {
        return state;
      }
      if (event.text === draftOf(state)) {
        return {
          ...state,
          source: event.text,
          drafts: withEntry(state.drafts, event.path, null),
          settled: null,
          diskChanged: false,
        };
      }
      return {
        ...state,
        source: event.text,
        diskChanged: draftOf(state) !== null || state.diskChanged,
      };
    case 'edited':
      return change(state, event.text, (history, before) =>
        recordEdit(history, before, event.at),
      );
    case 'replaced':
      // A replace is one undo step of its own, never merged with the typing around it.
      return change(state, event.text, (history, before) => ({
        ...recordEdit({ ...history, lastAt: null }, before, 0),
        lastAt: null,
      }));
    case 'undo':
      return step(state, undoEdit);
    case 'redo':
      return step(state, redoEdit);
    case 'settled':
      return { ...state, settled: draftOf(state) };
    case 'saveStarted':
      return { ...state, isSaving: true, saveError: null };
    case 'saved':
      return save(state, event.path, event.contents);
    case 'saveFailed':
      return {
        ...state,
        isSaving: false,
        saveError: event.path === state.path ? event.message : state.saveError,
      };
  }
}
