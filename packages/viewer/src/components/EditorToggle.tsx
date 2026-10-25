import { useTheme } from '../theme';
import { ToolButton } from './ToolButton';

interface EditorToggleProps {
  isVisible: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

/**
 * Shows and hides the source editor. It sits beside the sidebar toggle rather
 * than above the editor pane, for the same reason: a control inside the pane
 * it hides leaves no way back.
 */
export function EditorToggle({
  isVisible,
  disabled = false,
  onToggle,
}: EditorToggleProps) {
  const theme = useTheme();

  return (
    <ToolButton
      accessibilityLabel={isVisible ? 'Hide editor' : 'Show editor'}
      title="Shows or hides the markdown source editor (⌘E, Ctrl+E)"
      disabled={disabled}
      // Open reads as accent rather than as a different glyph: the pencil
      // has no second form the way the sidebar's half-filled square does.
      isActive={isVisible}
      onPress={onToggle}
    >
      <span style={{ color: isVisible ? theme.accent : theme.mutedText }}>
        ✎
      </span>
    </ToolButton>
  );
}
