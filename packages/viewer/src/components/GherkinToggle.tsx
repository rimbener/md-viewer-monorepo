import { useTheme } from '../theme';
import { ToolButton } from './ToolButton';

interface GherkinToggleProps {
  isActive: boolean;
  onToggle: () => void;
}

/** Lays out an unfenced `Feature:` as Gherkin, or back as markdown. */
export function GherkinToggle({ isActive, onToggle }: GherkinToggleProps) {
  const theme = useTheme();

  return (
    <ToolButton
      accessibilityLabel={isActive ? 'Render as markdown' : 'Render as gherkin'}
      title="Lays out an unfenced Feature: as Gherkin"
      isActive={isActive}
      onPress={onToggle}
    >
      <span
        style={{
          fontSize: 12,
          color: isActive ? theme.accent : theme.mutedText,
        }}
      >
        Render as gherkin
      </span>
    </ToolButton>
  );
}
