import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

import {
  canRedoIn,
  canUndoIn,
  draftOf,
  initialDocumentSession,
  reduceDocumentSession,
  renderedOf,
  textOf,
  type DocumentEvent,
  type DocumentSession,
} from '../src/documentSession';
import { PlatformProvider } from '../src/platform';
import { useDocumentSession } from '../src/useDocumentSession';
import { createFakePlatform } from './fakePlatform';

function run(
  events: DocumentEvent[],
  from = initialDocumentSession,
): DocumentSession {
  return events.reduce(reduceDocumentSession, from);
}

function line(state: DocumentSession): string {
  const flags = [
    draftOf(state) !== null && 'dirty',
    state.diskChanged && 'diskChanged',
    state.isLoading && 'loading',
    state.isSaving && 'saving',
    state.error !== null && `error=${state.error}`,
    state.saveError !== null && `saveError=${state.saveError}`,
    canUndoIn(state) && 'undo',
    canRedoIn(state) && 'redo',
  ].filter(Boolean);
  return [
    `${state.path}: ${textOf(state)} | ${renderedOf(state)}`,
    ...flags,
  ].join(' ');
}

const openA: DocumentEvent[] = [
  { type: 'opened', path: '/a.md' },
  { type: 'read', path: '/a.md', text: 'a' },
];

const openB: DocumentEvent[] = [
  { type: 'opened', path: '/b.md' },
  { type: 'read', path: '/b.md', text: 'b' },
];

function edited(text: string, at = 0): DocumentEvent {
  return { type: 'edited', text, at };
}

describe('reduceDocumentSession', () => {
  it('reads a file, or keeps the error', () => {
    expect(line(run([{ type: 'opened', path: '/a.md' }]))).toBe(
      '/a.md: null | null loading',
    );
    expect(line(run(openA))).toBe('/a.md: a | a');
    expect(
      line(
        run([
          { type: 'opened', path: '/a.md' },
          { type: 'readFailed', path: '/a.md', message: 'gone' },
        ]),
      ),
    ).toBe('/a.md: null | null error=gone');
  });

  it('settles the preview only when asked', () => {
    const typed = run([...openA, edited('ab')]);
    expect(line(typed)).toBe('/a.md: ab | a dirty undo');
    expect(line(run([{ type: 'settled' }], typed))).toBe(
      '/a.md: ab | ab dirty undo',
    );
  });

  it('drops the draft when the text matches the disk again', () => {
    const state = run([...openA, edited('ab'), edited('a', 5000)]);
    expect(line(state)).toBe('/a.md: a | a undo');
  });

  it('undoes and redoes per path', () => {
    const typed = run([
      ...openA,
      edited('a1'),
      ...openB,
      edited('b1'),
      { type: 'undo' },
    ]);
    expect(line(typed)).toBe('/b.md: b | b redo');
    const back = run([...openA, { type: 'undo' }, { type: 'settled' }], typed);
    expect(line(back)).toBe('/a.md: a | a redo');
    expect(line(run([{ type: 'redo' }], back))).toBe(
      '/a.md: a1 | a dirty undo',
    );
  });

  it('keeps a replace out of the typing burst', () => {
    const state = run([
      ...openA,
      edited('a1', 0),
      { type: 'replaced', text: 'x' },
      edited('x1', 10),
      { type: 'undo' },
    ]);
    expect(textOf(state)).toBe('x');
    expect(textOf(run([{ type: 'undo' }], state))).toBe('a1');
  });

  it('keeps a draft across a switch and back', () => {
    const state = run([...openA, edited('a1'), ...openB, ...openA]);
    expect(line(state)).toBe('/a.md: a1 | a1 dirty undo');
  });

  it('keeps typing done during a save as a newer draft', () => {
    const state = run([
      ...openA,
      edited('a1'),
      { type: 'saveStarted' },
      edited('a12'),
      { type: 'saved', path: '/a.md', contents: 'a1' },
    ]);
    expect(line(state)).toBe('/a.md: a12 | a1 dirty undo');
  });

  it('clears the draft when the save wrote it', () => {
    const state = run([
      ...openA,
      edited('a1'),
      { type: 'settled' },
      { type: 'saveStarted' },
      { type: 'saved', path: '/a.md', contents: 'a1' },
    ]);
    expect(line(state)).toBe('/a.md: a1 | a1 undo');
  });

  it('does not clobber the next file when a save resolves late', () => {
    const state = run([
      ...openA,
      edited('a1'),
      { type: 'saveStarted' },
      ...openB,
      edited('b1'),
      { type: 'saved', path: '/a.md', contents: 'a1' },
    ]);
    expect(line(state)).toBe('/b.md: b1 | b dirty undo');
    expect(state.drafts.has('/a.md')).toBe(false);
  });

  it('shows a failed save only on its own file', () => {
    const failed: DocumentEvent = {
      type: 'saveFailed',
      path: '/a.md',
      message: 'denied',
    };
    const saving = run([...openA, edited('a1'), { type: 'saveStarted' }]);
    expect(line(run([failed], saving))).toBe(
      '/a.md: a1 | a dirty saveError=denied undo',
    );
    expect(line(run([...openB, failed], saving))).toBe('/b.md: b | b');
  });

  it('takes a reread without a draft as the new text', () => {
    const state = run([
      ...openA,
      { type: 'reread', path: '/a.md', text: 'a2' },
    ]);
    expect(line(state)).toBe('/a.md: a2 | a2');
  });

  it('keeps the draft and flags a reread that changed the disk', () => {
    const state = run([
      ...openA,
      edited('a1'),
      { type: 'reread', path: '/a.md', text: 'a2' },
    ]);
    expect(line(state)).toBe('/a.md: a1 | a2 dirty diskChanged undo');
  });

  it('drops a draft that a reread made equal to the disk', () => {
    const state = run([
      ...openA,
      edited('a1'),
      { type: 'reread', path: '/a.md', text: 'a1' },
    ]);
    expect(line(state)).toBe('/a.md: a1 | a1 undo');
  });

  it('keeps a draft that a later reread made differ again', () => {
    const state = run([
      ...openA,
      edited('a1'),
      { type: 'reread', path: '/a.md', text: 'a1' },
      edited('a2'),
      { type: 'reread', path: '/a.md', text: 'a3' },
    ]);
    expect(line(state)).toBe('/a.md: a2 | a3 dirty diskChanged undo');
  });

  it('ignores a reread of the own write', () => {
    const state = run([
      ...openA,
      edited('a1'),
      { type: 'saveStarted' },
      { type: 'saved', path: '/a.md', contents: 'a1' },
      { type: 'reread', path: '/a.md', text: 'a1' },
    ]);
    expect(line(state)).toBe('/a.md: a1 | a1 undo');
  });

  it('takes a reread that ends before the first read as the read', () => {
    const state = run([
      { type: 'opened', path: '/a.md' },
      { type: 'reread', path: '/a.md', text: 'a' },
    ]);
    expect(line(state)).toBe('/a.md: a | a');
    const switched = run([
      ...openA,
      { type: 'opened', path: '/b.md' },
      { type: 'reread', path: '/b.md', text: 'a' },
    ]);
    expect(line(switched)).toBe('/b.md: a | a');
  });

  it('ignores reads that belong to another file', () => {
    const state = run([
      ...openB,
      { type: 'read', path: '/a.md', text: 'x' },
      { type: 'reread', path: '/a.md', text: 'x' },
    ]);
    expect(line(state)).toBe('/b.md: b | b');
  });

  it('stops loading when the file closes before its read ends', () => {
    const state = run([
      { type: 'opened', path: '/a.md' },
      { type: 'opened', path: null },
    ]);
    expect(line(state)).toBe('null: null | null');
  });
});

describe('useDocumentSession', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('drops a pending reparse when the path changes', async () => {
    const platform = createFakePlatform({}, { '/a.md': 'a', '/b.md': 'b' });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(PlatformProvider, { value: platform }, children);
    const { result, rerender } = renderHook(
      ({ path }) => useDocumentSession(path),
      { wrapper, initialProps: { path: '/a.md' } },
    );
    await act(async () => {});

    act(() => result.current.edit('a1'));
    act(() => vi.advanceTimersByTime(100));
    rerender({ path: '/b.md' });
    await act(async () => {});
    act(() => result.current.edit('b1'));
    act(() => vi.advanceTimersByTime(100));
    expect(result.current.rendered).toBe('b');

    act(() => vi.advanceTimersByTime(50));
    expect(result.current.rendered).toBe('b1');

    rerender({ path: '/a.md' });
    await act(async () => {});
    expect(result.current.text).toBe('a1');
    expect(result.current.rendered).toBe('a1');
  });
});
