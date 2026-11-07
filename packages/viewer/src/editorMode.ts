export type EditorMode = 'preview' | 'split' | 'source';

export const EDITOR_MODES: readonly EditorMode[] = [
  'preview',
  'split',
  'source',
];

export function isEditorMode(value: unknown): value is EditorMode {
  return EDITOR_MODES.includes(value as EditorMode);
}

/** The mode after `mode` in the ⌘E cycle. */
export function nextEditorMode(mode: EditorMode): EditorMode {
  return EDITOR_MODES[(EDITOR_MODES.indexOf(mode) + 1) % EDITOR_MODES.length];
}

/** The name of each view, on its segment of the editor button. */
export const EDITOR_MODE_TITLE: Record<EditorMode, string> = {
  preview: 'Preview',
  split: 'Split',
  source: 'Editor',
};
