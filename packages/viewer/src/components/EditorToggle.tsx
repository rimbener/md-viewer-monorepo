import '@m3e/icons/outlined/article';
import '@m3e/icons/outlined/edit_note';
import '@m3e/icons/outlined/vertical_split';

import {
  EDITOR_MODES,
  EDITOR_MODE_TITLE,
  type EditorMode,
} from '../editorMode';
import { M3eButtonSegment, M3eIcon, M3eSegmentedButton } from '../m3e';
import { Tooltip, useControlId } from './Tooltip';

interface EditorToggleProps {
  mode: EditorMode;
  disabled?: boolean;
  onChange: (mode: EditorMode) => void;
}

const ICON: Record<EditorMode, string> = {
  preview: 'article',
  split: 'vertical_split',
  source: 'edit_note',
};

/**
 * Preview only, preview and editor, or editor only. It sits beside the
 * sidebar toggle rather than above the editor pane, for the same reason: a
 * control inside the pane it hides leaves no way back.
 */
export function EditorToggle({
  mode,
  disabled = false,
  onChange,
}: EditorToggleProps) {
  const id = useControlId();

  return (
    <>
      <M3eSegmentedButton
        id={id}
        aria-label="Editor view"
        hideSelectionIndicator
        disabled={disabled}
      >
        {EDITOR_MODES.map(each => (
          <M3eButtonSegment
            key={each}
            value={each}
            data-testid={`editor-mode-${each}`}
            aria-label={EDITOR_MODE_TITLE[each]}
            checked={each === mode}
            onBeforeInput={(event: Event) => {
              // React owns `checked`; the segment must not flip itself.
              event.preventDefault();
              onChange(each);
            }}
          >
            <M3eIcon name={ICON[each]} />
          </M3eButtonSegment>
        ))}
      </M3eSegmentedButton>
      <Tooltip
        controlId={id}
        text="Preview, preview and editor, or editor only (⌘E, Ctrl+E)"
      />
    </>
  );
}
