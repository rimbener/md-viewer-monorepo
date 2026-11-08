/**
 * Width of the sidebar drawer, kept apart from the handle that drives it so
 * that storage code can validate a value without pulling in the UI.
 */

export const MIN_SIDEBAR_WIDTH = 200;
export const MAX_SIDEBAR_WIDTH = 560;
export const DEFAULT_SIDEBAR_WIDTH = 280;

/** One arrow-key press on the handle. */
export const SIDEBAR_WIDTH_STEP = 16;

export function clampSidebarWidth(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_SIDEBAR_WIDTH;
  }
  return Math.round(
    Math.min(Math.max(value, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH),
  );
}

/** Guards against values from an older build or a hand-edited store. */
export function isSidebarWidth(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_SIDEBAR_WIDTH &&
    value <= MAX_SIDEBAR_WIDTH
  );
}
