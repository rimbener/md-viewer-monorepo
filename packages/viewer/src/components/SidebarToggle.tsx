import { useTheme } from '../theme';
import { ToolButton } from './ToolButton';

interface SidebarToggleProps {
  isVisible: boolean;
  onToggle: () => void;
}

/**
 * Shows and hides the file tree. It lives in the document header rather than
 * in the sidebar itself, because a control inside the sidebar disappears with
 * it and leaves no way back.
 */
export function SidebarToggle({ isVisible, onToggle }: SidebarToggleProps) {
  const theme = useTheme();

  return (
    <ToolButton
      accessibilityLabel={isVisible ? 'Hide sidebar' : 'Show sidebar'}
      title="Shows or hides the list of markdown files"
      onPress={onToggle}
    >
      {/* A square whose left column is filled while the panel is showing. */}
      <span style={{ color: theme.mutedText }}>{isVisible ? '◧' : '◻'}</span>
    </ToolButton>
  );
}
