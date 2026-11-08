/**
 * Text size for the document and the editor, kept apart from the control that
 * drives it so that storage code can validate a value without pulling in the UI.
 * Zoom multiplies on top of it.
 */

import { BODY_SIZE } from './typography';

export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 36;
export const FONT_SIZE_STEP = 1;
export const DEFAULT_FONT_SIZE = BODY_SIZE;

/** Nearest step, moved by `direction` increments of `FONT_SIZE_STEP`. */
export function stepFontSize(size: number, direction: number): number {
  const current = isFontSize(size) ? size : DEFAULT_FONT_SIZE;
  return Math.min(
    Math.max(current + direction * FONT_SIZE_STEP, MIN_FONT_SIZE),
    MAX_FONT_SIZE,
  );
}

/** How much larger the text is than at the default size. */
export function textScaleOf(size: number): number {
  return size / DEFAULT_FONT_SIZE;
}

/** Guards against values from an older build or a hand-edited store. */
export function isFontSize(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_FONT_SIZE &&
    value <= MAX_FONT_SIZE
  );
}
