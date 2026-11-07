import '@m3e/icons/outlined/save';

import { M3eIcon, M3eIconButton } from '../m3e';
import { Tooltip, useControlId } from './Tooltip';

interface SaveButtonProps {
  disabled?: boolean;
  onSave: () => void;
}

/** Writes the edited source over the file on disk. */
export function SaveButton({ disabled = false, onSave }: SaveButtonProps) {
  const id = useControlId();
  return (
    <>
      <M3eIconButton
        variant="tonal"
        size="extra-small"
        aria-label="Save"
        id={id}
        disabled={disabled}
        onClick={onSave}
      >
        <M3eIcon name="save" />
      </M3eIconButton>
      <Tooltip
        controlId={id}
        text="Writes the edited source to the file (⌘S, Ctrl+S)"
      />
    </>
  );
}
