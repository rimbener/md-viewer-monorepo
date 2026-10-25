/**
 * Keeps the source editor and the preview at the same place. Blocks carry no
 * source lines, so the two follow by fraction: halfway down one is halfway
 * down the other. Close for prose; an image or a diagram makes them drift.
 */

import { useCallback, useRef } from 'react';

/** Scroll events report fractions, so a move this small is our own. */
const SAME_OFFSET = 1;

export type ScrollBox = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

/** Where `target` scrolls to stand as far down as `source` does. */
export function followingScrollTop(
  source: ScrollBox,
  target: Omit<ScrollBox, 'scrollTop'>,
): number {
  const sourceRange = source.scrollHeight - source.clientHeight;
  const targetRange = Math.max(0, target.scrollHeight - target.clientHeight);
  if (sourceRange <= 0) {
    return 0;
  }
  const fraction = Math.min(1, Math.max(0, source.scrollTop / sourceRange));
  return Math.round(fraction * targetRange);
}

type Side = {
  element: HTMLElement | null;
  /** Where this side was moved to, so its own scroll event is not echoed back. */
  expected: number | null;
};

/** Ties two scroll views together. Each returned handler goes on its view. */
export function useScrollSync() {
  const editor = useRef<Side>({ element: null, expected: null });
  const preview = useRef<Side>({ element: null, expected: null });

  const follow = useCallback((source: Side, target: Side) => {
    const from = source.element;
    const to = target.element;
    if (from === null || to === null) {
      return;
    }
    if (
      source.expected !== null &&
      Math.abs(from.scrollTop - source.expected) <= SAME_OFFSET
    ) {
      source.expected = null;
      return;
    }
    source.expected = null;
    const next = followingScrollTop(from, to);
    // A move to where it stands fires no event, so nothing to wait for.
    if (Math.abs(to.scrollTop - next) <= SAME_OFFSET) {
      return;
    }
    target.expected = next;
    to.scrollTop = next;
  }, []);

  const attachEditor = useCallback((element: HTMLElement | null) => {
    editor.current = { element, expected: null };
  }, []);
  const attachPreview = useCallback((element: HTMLElement | null) => {
    preview.current = { element, expected: null };
  }, []);
  const onEditorScroll = useCallback(
    () => follow(editor.current, preview.current),
    [follow],
  );
  const onPreviewScroll = useCallback(
    () => follow(preview.current, editor.current),
    [follow],
  );

  return { attachEditor, attachPreview, onEditorScroll, onPreviewScroll };
}
