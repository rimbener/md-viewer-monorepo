import { act, renderHook } from '@testing-library/react';

import {
  clampActive,
  initialFindSession,
  reduceFindSession,
  replaceOneIn,
  resumeIndex,
  stepActive,
  type FindEvent,
  type FindSession,
} from '../src/findSession';
import { useFindSession } from '../src/useFindSession';

function run(events: FindEvent[], from = initialFindSession): FindSession {
  return events.reduce(reduceFindSession, from);
}

function line(state: FindSession): string {
  return [
    `"${state.query}"`,
    `${state.active + 1}/${state.count}${state.capped ? '+' : ''}`,
    state.resumeAt !== null && `resume=${state.resumeAt}`,
  ]
    .filter(Boolean)
    .join(' ');
}

describe('findSession', () => {
  it('clamps the active hit into the count', () => {
    expect([clampActive(4, 3), clampActive(1, 3), clampActive(2, 0)]).toEqual([
      2, 1, 0,
    ]);
  });

  it('wraps previous and next', () => {
    expect([
      stepActive(2, 1, 3),
      stepActive(0, -1, 3),
      stepActive(1, 1, 3),
      stepActive(0, 1, 0),
    ]).toEqual([0, 2, 2, 0]);
  });

  it('resumes at the first hit from a position, else the first', () => {
    expect([
      resumeIndex([0, 5, 9], 5),
      resumeIndex([0, 5, 9], 6),
      resumeIndex([0, 5, 9], 10),
    ]).toEqual([1, 2, 0]);
  });

  it('replaces one hit and resumes after the replacement', () => {
    expect(replaceOneIn('a cat, a cat', 2, 'cat', 'dog!')).toEqual({
      text: 'a dog!, a cat',
      resumeAt: 6,
    });
  });

  it('starts a new query at the first hit', () => {
    const state = run([
      { type: 'queried', query: 'a' },
      { type: 'counted', count: 4, capped: false },
      { type: 'chose', active: 3 },
      { type: 'queried', query: 'ab' },
    ]);
    expect(line(state)).toBe('"ab" 1/4');
  });

  it('clamps the active hit when the count shrinks below it', () => {
    const state = run([
      { type: 'counted', count: 5, capped: false },
      { type: 'chose', active: 4 },
      { type: 'counted', count: 2, capped: false },
    ]);
    expect(line(state)).toBe('"" 2/2');
  });

  it('keeps the capped flag from the count', () => {
    expect(line(run([{ type: 'counted', count: 500, capped: true }]))).toBe(
      '"" 1/500+',
    );
  });

  it('moves to the next source hit after replace one', () => {
    const replaced = run([
      { type: 'counted', count: 3, capped: false, starts: [0, 4, 8] },
      { type: 'chose', active: 1 },
      { type: 'replacedOne', resumeAt: 6 },
    ]);
    expect(line(replaced)).toBe('"" 2/3 resume=6');
    const after = run(
      [{ type: 'counted', count: 2, capped: false, starts: [0, 8] }],
      replaced,
    );
    expect(line(after)).toBe('"" 2/2');
  });

  it('keeps the resume point while only the preview counts', () => {
    const state = run([
      { type: 'replacedOne', resumeAt: 6 },
      { type: 'counted', count: 2, capped: false },
    ]);
    expect(line(state)).toBe('"" 1/2 resume=6');
  });

  it('falls back to the first hit after replace all', () => {
    const state = run([
      { type: 'counted', count: 3, capped: false, starts: [0, 4, 8] },
      { type: 'chose', active: 2 },
      { type: 'counted', count: 0, capped: false, starts: [] },
    ]);
    expect(line(state)).toBe('"" 1/0');
  });

  it('returns the same session when nothing changes', () => {
    const state = run([{ type: 'counted', count: 2, capped: false }]);
    expect(
      reduceFindSession(state, { type: 'counted', count: 2, capped: false }),
    ).toBe(state);
  });

  it('clears the query but keeps the replacement on reset', () => {
    const state = run([
      { type: 'queried', query: 'cat' },
      { type: 'replacementChanged', replacement: 'dog' },
      { type: 'counted', count: 2, capped: true },
      { type: 'chose', active: 1 },
      { type: 'reset' },
    ]);
    expect([line(state), state.replacement]).toEqual(['"" 1/0', 'dog']);
  });
});

describe('useFindSession', () => {
  type Props = { path: string; inSource: boolean };

  function setup(text = 'cat cat cat') {
    const replace = vi.fn();
    const hook = renderHook(
      ({ path, inSource }: Props) =>
        useFindSession({ path, text, inSource, replace }),
      { initialProps: { path: '/a.md', inSource: true } },
    );
    return { replace, ...hook };
  }

  it('counts the source and marks it while the editor shows', () => {
    const { result } = setup();
    act(() => result.current.setQuery('cat'));

    expect(result.current.count).toBe(3);
    expect(result.current.sourceMarks).toEqual({
      query: 'cat',
      starts: [0, 4, 8],
      active: 0,
    });
    expect(result.current.previewFind.query).toBe('');
  });

  it('hands the query to the preview when the editor closes', () => {
    const { result, rerender } = setup();
    act(() => result.current.setQuery('cat'));
    rerender({ path: '/a.md', inSource: false });

    expect(result.current.sourceMarks).toBeNull();
    expect(result.current.previewFind.query).toBe('cat');
    act(() => result.current.previewFind.onCount(1, false));
    expect(result.current.count).toBe(1);
  });

  it('clears the query when the path changes', () => {
    const { result, rerender } = setup();
    act(() => result.current.setQuery('cat'));
    rerender({ path: '/b.md', inSource: true });

    expect([result.current.query, result.current.count]).toEqual(['', 0]);
  });

  it('replaces the active hit and every hit', () => {
    const { result, replace } = setup();
    act(() => result.current.setQuery('cat'));
    act(() => result.current.setReplacement('dog'));
    act(() => result.current.setActive(1));
    act(() => result.current.replaceOne());
    act(() => result.current.replaceAll());

    expect(replace.mock.calls).toEqual([['cat dog cat'], ['dog dog dog']]);
  });
});
