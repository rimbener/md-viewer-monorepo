/**
 * A preference restored from storage, where a choice made during the read wins.
 */

import { act, renderHook } from '@testing-library/react';

import { useStoredPreference } from '../src/useStoredPreference';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

function setup() {
  const read = deferred<number | null>();
  const load = vi.fn(() => read.promise);
  const save = vi.fn();
  const hook = renderHook(() => useStoredPreference(load, save, 1));
  return { read, load, save, ...hook };
}

describe('useStoredPreference', () => {
  it('starts at the initial value and applies the stored one', async () => {
    const { read, result, save } = setup();
    expect(result.current[0]).toBe(1);

    await act(async () => read.resolve(2));

    expect(result.current[0]).toBe(2);
    expect(save).not.toHaveBeenCalled();
  });

  it('keeps the initial value when the read fails or finds nothing', async () => {
    const { read, result } = setup();

    await act(async () => read.resolve(null));

    expect(result.current[0]).toBe(1);
  });

  it('keeps a choice made while the read is in flight', async () => {
    const { read, result } = setup();

    act(() => result.current[1](3));
    await act(async () => read.resolve(2));

    expect(result.current[0]).toBe(3);
  });

  it('saves a choice', () => {
    const { result, save } = setup();

    act(() => result.current[1](3));

    expect(result.current[0]).toBe(3);
    expect(save).toHaveBeenCalledWith(3);
  });

  it('can choose without saving', async () => {
    const { read, result, save } = setup();

    act(() => result.current[1](3, { save: false }));
    await act(async () => read.resolve(2));

    expect(result.current[0]).toBe(3);
    expect(save).not.toHaveBeenCalled();
  });

  it('lets the stored value replace a value set without choosing', async () => {
    const { read, result, save } = setup();

    act(() => result.current[2](3));
    expect(result.current[0]).toBe(3);
    await act(async () => read.resolve(2));

    expect(result.current[0]).toBe(2);
    expect(save).not.toHaveBeenCalled();
  });

  it('does nothing when the read resolves after unmount', async () => {
    const { read, result, unmount } = setup();

    unmount();
    await act(async () => read.resolve(2));

    expect(result.current[0]).toBe(1);
  });

  it('reads once', () => {
    const { load, rerender } = setup();

    rerender();

    expect(load).toHaveBeenCalledTimes(1);
  });
});
