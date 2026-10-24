/**
 * Where each file was scrolled to. Pure data: `preferences.ts` writes it.
 * Newest entry first.
 */

/** How many files keep a position. Older ones fall off the end. */
export const MAX_SCROLL_POSITIONS = 10;

export type ScrollPosition = {
  path: string;
  y: number;
};

/** Puts `path` first at `y`. A position at the top is forgotten. */
export function rememberScroll(
  positions: readonly ScrollPosition[],
  path: string,
  y: number,
): ScrollPosition[] {
  const rest = positions.filter(item => item.path !== path);
  if (!path.startsWith('/') || !isOffset(y) || y < 1) {
    return rest.slice(0, MAX_SCROLL_POSITIONS);
  }
  return [{ path, y: Math.round(y) }, ...rest].slice(0, MAX_SCROLL_POSITIONS);
}

/** The stored offset of `path`, or null when it has none. */
export function scrollOf(
  positions: readonly ScrollPosition[],
  path: string,
): number | null {
  return positions.find(item => item.path === path)?.y ?? null;
}

/** `newer` wins for a path in both lists. */
export function mergeScrollPositions(
  newer: readonly ScrollPosition[],
  older: readonly ScrollPosition[],
): ScrollPosition[] {
  const kept = older.filter(
    item => !newer.some(other => other.path === item.path),
  );
  return [...newer, ...kept].slice(0, MAX_SCROLL_POSITIONS);
}

/** A stored list, or empty when the value is unusable. */
export function decodeScrollPositions(value: string | null): ScrollPosition[] {
  if (value === null) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  const positions: ScrollPosition[] = [];
  for (const item of parsed) {
    if (positions.length >= MAX_SCROLL_POSITIONS) {
      break;
    }
    const position = asScrollPosition(item);
    if (
      position === null ||
      positions.some(kept => kept.path === position.path)
    ) {
      continue;
    }
    positions.push(position);
  }
  return positions;
}

export function encodeScrollPositions(
  positions: readonly ScrollPosition[],
): string {
  return JSON.stringify(
    positions.map(item => ({ path: item.path, y: item.y })),
  );
}

function isOffset(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function asScrollPosition(item: unknown): ScrollPosition | null {
  if (item === null || typeof item !== 'object') {
    return null;
  }
  const record = item as { path?: unknown; y?: unknown };
  if (
    typeof record.path !== 'string' ||
    !record.path.startsWith('/') ||
    !isOffset(record.y)
  ) {
    return null;
  }
  return { path: record.path, y: record.y };
}
