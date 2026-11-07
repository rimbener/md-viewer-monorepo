/**
 * Android draws the app under its bars, and the plugin sets the covered edges
 * as `--safe-area-*` when they change. A page that loads after the last change
 * asks once.
 */

import { invoke } from '@tauri-apps/api/core';

type Edges = { top: number; right: number; bottom: number; left: number };

export function setSafeArea(edges: Partial<Edges>): void {
  const style = document.documentElement.style;
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    const value = edges[side];
    if (typeof value === 'number') {
      style.setProperty(`--safe-area-${side}`, `${value}px`);
    }
  }
}

export function applySafeArea(): void {
  invoke<Partial<Edges>>('plugin:saf|safe_area')
    .then(setSafeArea)
    .catch(() => {});
}
