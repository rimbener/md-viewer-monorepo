export type EditorMode = 'preview' | 'split' | 'source';

const ORDER: readonly EditorMode[] = ['preview', 'split', 'source'];

export function isEditorMode(value: unknown): value is EditorMode {
  return ORDER.includes(value as EditorMode);
}

/** The mode after `mode` in the editor button's cycle. */
export function nextEditorMode(mode: EditorMode): EditorMode {
  return ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
}

/** The tool title above the editor button, naming the view on screen. */
export const EDITOR_MODE_TITLE: Record<EditorMode, string> = {
  preview: 'Preview',
  split: 'Split',
  source: 'Editor',
};
