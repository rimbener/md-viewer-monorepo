/**
 * Keeps the scroll position of each file, and puts it back when the file
 * shows again — after a switch, a reload, or the next launch.
 *
 * The content grows as it lays out and images load, so the stored offset is
 * approached on each content size change until it is reachable. The person
 * scrolling first cancels that.
 */

import {
  useCallback,
  useEffect,
  useRef,
  type RefObject,
  type UIEvent,
} from 'react';

import { loadScrollPositions, saveScrollPositions } from './preferences';
import {
  mergeScrollPositions,
  rememberScroll,
  scrollOf,
  type ScrollPosition,
} from './scrollPositions';

/** How long the scrolling must stop before the position is written. */
const SAVE_DELAY_MS = 300;

/** Scroll events report fractions, so a move this small is our own. */
const SAME_OFFSET = 1;

/**
 * `mountKey` changes whenever a new scroll view mounts for the same file,
 * because a new view starts at the top.
 */
export function useScrollMemory(
  path: string | null,
  scrollRef: RefObject<HTMLElement | null>,
  viewHeight: number,
  mountKey: string,
) {
  const positions = useRef<ScrollPosition[]>([]);
  const loaded = useRef<Promise<void>>(Promise.resolve());
  const target = useRef<number | null>(null);
  const placed = useRef<number | null>(null);
  const contentHeight = useRef(0);
  const viewHeightRef = useRef(viewHeight);
  const save = useRef<ReturnType<typeof setTimeout> | null>(null);

  viewHeightRef.current = viewHeight;

  useEffect(() => {
    loaded.current = loadScrollPositions().then(stored => {
      positions.current = mergeScrollPositions(positions.current, stored);
    });

    return () => {
      if (save.current !== null) {
        clearTimeout(save.current);
        save.current = null;
        saveScrollPositions(positions.current);
      }
    };
  }, []);

  const place = useCallback(() => {
    const y = target.current;
    if (
      y === null ||
      viewHeightRef.current <= 0 ||
      contentHeight.current <= 0
    ) {
      return;
    }
    const reachable = Math.max(
      0,
      contentHeight.current - viewHeightRef.current,
    );
    const next = Math.min(y, reachable);
    placed.current = next;
    scrollRef.current?.scrollTo?.({ top: next });
    if (next >= y) {
      target.current = null;
    }
  }, [scrollRef]);

  useEffect(() => {
    target.current = null;
    placed.current = null;
    contentHeight.current = 0;
    if (path === null) {
      return;
    }
    let cancelled = false;
    loaded.current.then(() => {
      if (!cancelled) {
        target.current = scrollOf(positions.current, path);
        place();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [path, mountKey, place]);

  useEffect(() => {
    place();
  }, [viewHeight, place]);

  const onContentSizeChange = useCallback(
    (height: number) => {
      contentHeight.current = height;
      place();
    },
    [place],
  );

  const onScroll = useCallback(
    (event: UIEvent<HTMLElement>) => {
      if (path === null) {
        return;
      }
      const y = event.currentTarget.scrollTop;
      if (target.current !== null) {
        if (Math.abs(y - (placed.current ?? 0)) <= SAME_OFFSET) {
          return;
        }
        target.current = null;
      }
      positions.current = rememberScroll(positions.current, path, y);
      if (save.current !== null) {
        clearTimeout(save.current);
      }
      save.current = setTimeout(() => {
        save.current = null;
        saveScrollPositions(positions.current);
      }, SAVE_DELAY_MS);
    },
    [path],
  );

  return { onScroll, onContentSizeChange };
}
