import type { Mocked } from 'vitest';

import { loadScrollPositions, saveScrollPositions } from '../src/preferences';
import { storage as memoryStorage } from '../src/storage';
import {
  decodeScrollPositions,
  encodeScrollPositions,
  MAX_SCROLL_POSITIONS,
  mergeScrollPositions,
  rememberScroll,
  scrollOf,
  type ScrollPosition,
} from '../src/scrollPositions';

const storage = memoryStorage as Mocked<typeof memoryStorage>;

/** One `path@y` per entry, newest first. */
function outline(positions: readonly ScrollPosition[]): string {
  return positions.map(item => `${item.path}@${item.y}`).join(' ');
}

describe('rememberScroll', () => {
  it('puts the file first and keeps one entry for it', () => {
    const positions = rememberScroll(
      rememberScroll(rememberScroll([], '/a.md', 10), '/b.md', 20),
      '/a.md',
      30.4,
    );

    expect(outline(positions)).toBe('/a.md@30 /b.md@20');
  });

  it('forgets a file scrolled back to the top', () => {
    const positions = rememberScroll(
      rememberScroll([], '/a.md', 10),
      '/a.md',
      0,
    );

    expect(positions).toEqual([]);
  });

  it('ignores a relative path and an unusable offset', () => {
    expect(rememberScroll([], 'a.md', 10)).toEqual([]);
    expect(rememberScroll([], '/a.md', Number.NaN)).toEqual([]);
    expect(rememberScroll([], '/a.md', -5)).toEqual([]);
  });

  it('drops the oldest file past the limit', () => {
    let positions: ScrollPosition[] = [];
    for (let index = 0; index <= MAX_SCROLL_POSITIONS; index += 1) {
      positions = rememberScroll(positions, `/${index}.md`, 10);
    }

    expect(positions).toHaveLength(MAX_SCROLL_POSITIONS);
    expect(scrollOf(positions, '/0.md')).toBeNull();
    expect(scrollOf(positions, `/${MAX_SCROLL_POSITIONS}.md`)).toBe(10);
  });
});

describe('mergeScrollPositions', () => {
  it('lets the newer list win', () => {
    const merged = mergeScrollPositions(
      [{ path: '/a.md', y: 5 }],
      [
        { path: '/b.md', y: 7 },
        { path: '/a.md', y: 9 },
      ],
    );

    expect(outline(merged)).toBe('/a.md@5 /b.md@7');
  });
});

describe('decodeScrollPositions', () => {
  it('round-trips a list', () => {
    const positions = [
      { path: '/a.md', y: 5 },
      { path: '/b.md', y: 7 },
    ];

    expect(decodeScrollPositions(encodeScrollPositions(positions))).toEqual(
      positions,
    );
  });

  it('rejects anything that is not a usable list', () => {
    expect(decodeScrollPositions(null)).toEqual([]);
    expect(decodeScrollPositions('not json')).toEqual([]);
    expect(decodeScrollPositions('{"path":"/a.md"}')).toEqual([]);
  });

  it('skips bad and repeated entries', () => {
    const stored = JSON.stringify([
      { path: '/a.md', y: 5 },
      { path: 'b.md', y: 5 },
      { path: '/c.md', y: 'far' },
      { path: '/a.md', y: 9 },
      null,
    ]);

    expect(outline(decodeScrollPositions(stored))).toBe('/a.md@5');
  });
});

describe('scroll position persistence', () => {
  it('round-trips the list', async () => {
    saveScrollPositions([{ path: '/a.md', y: 5 }]);

    await expect(loadScrollPositions()).resolves.toEqual([
      { path: '/a.md', y: 5 },
    ]);
  });

  it('survives a storage failure on read', async () => {
    storage.getItem.mockRejectedValueOnce(new Error('disk is on fire'));

    await expect(loadScrollPositions()).resolves.toEqual([]);
  });
});
