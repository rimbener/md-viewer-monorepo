import { useTheme } from '../theme';
import { ToolButton } from './ToolButton';

interface SaveButtonProps {
  disabled?: boolean;
  onSave: () => void;
}

/** Writes the edited source over the file on disk. */
export function SaveButton({ disabled = false, onSave }: SaveButtonProps) {
  const theme = useTheme();

  return (
    <ToolButton
      accessibilityLabel="Save"
      title="Writes the edited source to the file (⌘S, Ctrl+S)"
      disabled={disabled}
      onPress={onSave}
    >
      <span style={{ color: disabled ? theme.mutedText : theme.accent }}>
        Save
      </span>
    </ToolButton>
  );
}
