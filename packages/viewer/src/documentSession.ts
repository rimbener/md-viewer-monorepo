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
const MAX_RENDERED_CHARACTERS = 500_000;

export interface DocumentSession {
  path: string | null;
  source: string | null;
  drafts: ReadonlyMap<string, string>;
  // The disk text each draft started from; a different disk text is a change made elsewhere.
  draftBases: ReadonlyMap<string, string>;
  histories: ReadonlyMap<string, EditHistory>;
  // Trails the draft by the reparse delay, so a burst of keystrokes parses once.
  settled: string | null;
  isLoading: boolean;
  error: string | null;
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
  draftBases: new Map(),
  histories: new Map(),
  settled: null,
  isLoading: false,
  error: null,
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

export function diskChangedIn(state: DocumentSession): boolean {
  if (state.path === null || state.source === null) {
    return false;
  }
  const base = state.draftBases.get(state.path);
  return draftOf(state) !== null && base !== undefined && base !== state.source;
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
  return !state.isLoading && canUndo(historyOf(state));
}

export function canRedoIn(state: DocumentSession): boolean {
  return !state.isLoading && canRedo(historyOf(state));
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
  return {
    ...state,
    path,
    source: null,
    settled: path === null ? null : (state.drafts.get(path) ?? null),
    isLoading: path !== null,
    error: null,
    saveError: null,
  };
}

function withDraft(
  state: DocumentSession,
  path: string,
  draft: string | null,
  source: string | null,
): Pick<DocumentSession, 'drafts' | 'draftBases'> {
  const base = state.draftBases.get(path) ?? source;
  return {
    drafts: withEntry(state.drafts, path, draft),
    draftBases: withEntry(state.draftBases, path, draft === null ? null : base),
  };
}

function apply(
  state: DocumentSession,
  path: string,
  next: string,
  history: EditHistory,
): DocumentSession {
  const draft = next === state.source ? null : next;
  return {
    ...state,
    ...withDraft(state, path, draft, state.source),
    histories: withEntry(state.histories, path, history),
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

function take(state: DocumentSession, path: string, text: string) {
  const isMatched = state.drafts.get(path) === text;
  return {
    ...state,
    ...(isMatched
      ? { ...withDraft(state, path, null, text), settled: null }
      : {}),
    source: text,
    isLoading: false,
    error: null,
  };
}

function save(
  state: DocumentSession,
  path: string,
  contents: string,
): DocumentSession {
  const isOpen = state.path === path;
  // Typing, or an undo back to the old disk text, during the write leaves a
  // text that differs from what was written: it stays a draft on top of it.
  const current = state.drafts.get(path) ?? (isOpen ? state.source : null);
  const draft = current === null || current === contents ? null : current;
  const next = {
    ...state,
    drafts: withEntry(state.drafts, path, draft),
    draftBases: withEntry(
      state.draftBases,
      path,
      draft === null ? null : contents,
    ),
    isSaving: false,
  };
  return isOpen
    ? {
        ...next,
        source: contents,
        settled: draft === null ? null : state.settled,
      }
    : next;
}

type EditEvent = Extract<
  DocumentEvent,
  { type: 'edited' | 'replaced' | 'undo' | 'redo' }
>;

function edit(state: DocumentSession, event: EditEvent): DocumentSession {
  switch (event.type) {
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
  }
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
        ? take(state, event.path, event.text)
        : state;
    case 'readFailed':
      return event.path === state.path
        ? { ...state, source: null, error: event.message, isLoading: false }
        : state;
    case 'reread':
      // A reread can end the loading or an error: it replaced the read before it.
      return event.path === state.path &&
        (state.isLoading || event.text !== state.source)
        ? take(state, event.path, event.text)
        : state;
    case 'edited':
    case 'replaced':
    case 'undo':
    case 'redo':
      // No disk text yet to measure a draft against.
      return state.isLoading ? state : edit(state, event);
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
