import type { ReactNode } from 'react';

import type { EditorMode } from '../editorMode';
import { M3eIconButton } from '../m3e';

interface EditorToggleProps {
  mode: EditorMode;
  disabled?: boolean;
  onToggle: () => void;
}

const NEXT_LABEL: Record<EditorMode, string> = {
  preview: 'Show editor',
  split: 'Show editor only',
  source: 'Show preview only',
};

/**
 * Steps through preview only, preview and editor, and editor only. It sits
 * beside the sidebar toggle rather than above the editor pane, for the same
 * reason: a control inside the pane it hides leaves no way back.
 */
export function EditorToggle({
  mode,
  disabled = false,
  onToggle,
}: EditorToggleProps) {
  return (
    <M3eIconButton
      variant={mode === 'preview' ? 'outlined' : 'tonal'}
      size="extra-small"
      aria-label={NEXT_LABEL[mode]}
      title="Steps through preview, preview and editor, and editor only (⌘E, Ctrl+E)"
      disabled={disabled}
      onClick={onToggle}
    >
      <svg
        data-testid={`editor-mode-${mode}`}
        width={16}
        height={16}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        {ICONS[mode]}
      </svg>
    </M3eIconButton>
  );
}

const ICONS: Record<EditorMode, ReactNode> = {
  // A page of text.
  preview: (
    <>
      <rect x={3} y={1.5} width={10} height={13} rx={1.5} />
      <path d="M5.5 5h5M5.5 8h5M5.5 11h3" />
    </>
  ),
  // Two panes side by side.
  split: (
    <>
      <rect x={1.5} y={2.5} width={13} height={11} rx={1.5} />
      <path d="M8 2.5v11" />
    </>
  ),
  // A pencil.
  source: (
    <>
      <path d="M10.5 2.5l3 3L6 13l-3.5.5L3 10z" />
      <path d="M9 4l3 3" />
    </>
  ),
};
