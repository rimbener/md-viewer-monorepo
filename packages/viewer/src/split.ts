/**
 * The share of the split that the source editor takes, kept apart from the
 * divider that drives it so that storage code can validate a value without
 * pulling in the UI.
 */

/** Neither pane closes all the way, so the divider never gets lost at an edge. */
export const MIN_EDITOR_FRACTION = 0.2;
export const MAX_EDITOR_FRACTION = 0.8;
export const DEFAULT_EDITOR_FRACTION = 0.5;

/** One arrow-key press on the divider. */
export const EDITOR_FRACTION_STEP = 0.05;

export function clampEditorFraction(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_EDITOR_FRACTION;
  }
  return Math.min(Math.max(value, MIN_EDITOR_FRACTION), MAX_EDITOR_FRACTION);
}

/** Guards against values from an older build or a hand-edited store. */
export function isEditorFraction(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= MIN_EDITOR_FRACTION &&
    value <= MAX_EDITOR_FRACTION
  );
}
