import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

import {
  canRedoIn,
  canUndoIn,
  diskChangedIn,
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
    diskChangedIn(state) && 'diskChanged',
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
          {
            type: 'readFailed',
            path: '/a.md',
            message: 'gone',
          },
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

  it('clears a reread error when a later reread works', () => {
    const state = run([
      { type: 'opened', path: '/a.md' },
      { type: 'readFailed', path: '/a.md', message: 'gone' },
      { type: 'reread', path: '/a.md', text: 'a' },
    ]);
    expect(line(state)).toBe('/a.md: a | a');
  });

  it('flags a kept draft whose file changed while another file showed', () => {
    const back = (text: string) =>
      run([
        ...openA,
        edited('a1'),
        ...openB,
        { type: 'opened', path: '/a.md' },
        { type: 'read', path: '/a.md', text },
      ]);
    expect(line(back('changed'))).toBe('/a.md: a1 | a1 dirty diskChanged undo');
    expect(line(back('a'))).toBe('/a.md: a1 | a1 dirty undo');
  });

  it('keeps the disk change of a draft across a switch', () => {
    const state = run([
      ...openA,
      edited('a1'),
      { type: 'reread', path: '/a.md', text: 'outside' },
      ...openB,
      { type: 'opened', path: '/a.md' },
      { type: 'read', path: '/a.md', text: 'outside' },
    ]);
    expect(line(state)).toBe('/a.md: a1 | a1 dirty diskChanged undo');
  });

  it('flags no disk change after a save and a switch', () => {
    const state = run([
      ...openA,
      edited('a1'),
      edited('a2', 5000),
      { type: 'saveStarted' },
      { type: 'saved', path: '/a.md', contents: 'a1' },
      ...openB,
      { type: 'opened', path: '/a.md' },
      { type: 'read', path: '/a.md', text: 'a1' },
    ]);
    expect(line(state)).toBe('/a.md: a2 | a2 dirty undo');
  });

  it('drops a kept draft that the disk now matches', () => {
    const state = run([
      ...openA,
      edited('a1'),
      ...openB,
      { type: 'opened', path: '/a.md' },
      { type: 'read', path: '/a.md', text: 'a1' },
    ]);
    expect(line(state)).toBe('/a.md: a1 | a1 undo');
  });

  it('keeps an undo back to the disk text made during the write', () => {
    const state = run([
      ...openA,
      edited('a1'),
      { type: 'saveStarted' },
      { type: 'undo' },
      { type: 'saved', path: '/a.md', contents: 'a1' },
    ]);
    expect(line(state)).toBe('/a.md: a | a1 dirty redo');
  });

  it('ends the loading on a reread of the text a save wrote meanwhile', () => {
    const state = run([
      ...openA,
      edited('a1'),
      { type: 'saveStarted' },
      ...openB,
      { type: 'opened', path: '/a.md' },
      { type: 'saved', path: '/a.md', contents: 'a1' },
      { type: 'reread', path: '/a.md', text: 'a1' },
    ]);
    expect(line(state)).toBe('/a.md: a1 | a1 undo');
  });

  it('takes no edit, undo or redo while the next file loads', () => {
    const loading = run([
      ...openA,
      edited('a1'),
      ...openB,
      { type: 'opened', path: '/a.md' },
      { type: 'read', path: '/a.md', text: 'a' },
      { type: 'undo' },
      { type: 'opened', path: '/b.md' },
    ]);
    expect(line(loading)).toBe('/b.md: null | null loading');
    const after = run(
      [
        edited('x'),
        { type: 'undo' },
        { type: 'redo' },
        { type: 'replaced', text: 'y' },
      ],
      loading,
    );
    expect(after).toBe(loading);
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
  function deferred() {
    let resolve!: (text: string) => void;
    let reject!: (cause: Error) => void;
    const promise = new Promise<string>((ok, fail) => {
      resolve = ok;
      reject = fail;
    });
    return { promise, resolve, reject };
  }

  async function racedReads() {
    const platform = createFakePlatform({}, { '/a.md': 'a' });
    const first = deferred();
    const second = deferred();
    platform.readFile
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(PlatformProvider, { value: platform }, children);
    const { result } = renderHook(() => useDocumentSession('/a.md'), {
      wrapper,
    });
    act(() => platform.changeFile('/a.md'));
    act(() => vi.advanceTimersByTime(150));
    return { result, first, second };
  }

  it('shows the first read when the reread that followed it fails', async () => {
    const { result, first, second } = await racedReads();

    await act(async () => second.reject(new Error('busy')));
    expect(result.current.isLoading).toBe(true);
    await act(async () => first.resolve('a'));

    expect([result.current.text, result.current.error]).toEqual(['a', null]);
  });

  it('reads again when a reread began before a save ended', async () => {
    const platform = createFakePlatform({}, { '/a.md': 'a' });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(PlatformProvider, { value: platform }, children);
    const { result } = renderHook(() => useDocumentSession('/a.md'), {
      wrapper,
    });
    await act(async () => {});
    act(() => result.current.edit('a1'));
    const stale = deferred();
    platform.readFile.mockReturnValueOnce(stale.promise);
    act(() => platform.changeFile('/a.md'));
    act(() => vi.advanceTimersByTime(150));

    await act(async () => result.current.save());
    await act(async () => stale.resolve('a'));

    expect(result.current.text).toBe('a1');
    expect([result.current.isDirty, result.current.diskChanged]).toEqual([
      false,
      false,
    ]);
  });

  async function savingWithReads(...reads: string[]) {
    const platform = createFakePlatform({}, { '/a.md': 'a' });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(PlatformProvider, { value: platform }, children);
    const { result } = renderHook(() => useDocumentSession('/a.md'), {
      wrapper,
    });
    await act(async () => {});
    act(() => result.current.edit('a1'));
    const write = deferred();
    platform.writeFile.mockReturnValueOnce(write.promise.then(() => {}));
    for (const text of reads) {
      platform.readFile.mockResolvedValueOnce(text);
    }
    await act(async () => result.current.save());
    act(() => platform.changeFile('/a.md'));
    await act(async () => vi.advanceTimersByTime(150));
    return { result, platform, write };
  }

  it('reads again after a write that a read overlapped', async () => {
    const { result, platform, write } = await savingWithReads('a1 half', 'a1');

    expect(result.current.diskChanged).toBe(false);
    expect(platform.readFile).toHaveBeenCalledTimes(2);
    await act(async () => write.resolve(''));

    expect(platform.readFile).toHaveBeenCalledTimes(3);
    expect([result.current.text, result.current.isDirty]).toEqual([
      'a1',
      false,
    ]);
  });

  it('reads again after a failed write that a read overlapped', async () => {
    const { result, write } = await savingWithReads('a1 half', 'a');

    await act(async () => write.reject(new Error('disk full')));

    expect(result.current.text).toBe('a1');
    expect(result.current.isDirty).toBe(true);
    expect(result.current.diskChanged).toBe(false);
  });

  it('shows an error when every read failed', async () => {
    const { result, first, second } = await racedReads();

    await act(async () => first.reject(new Error('gone')));
    expect(result.current.isLoading).toBe(true);
    await act(async () => second.reject(new Error('gone')));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('gone');
  });
});
