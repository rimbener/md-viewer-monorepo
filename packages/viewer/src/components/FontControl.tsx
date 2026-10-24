import { useTheme } from '../theme';
import { nextSchemeId, schemeById } from '../typography';
import { ToolButton } from './ToolButton';

interface FontControlProps {
  schemeId: string;
  onChange: (schemeId: string) => void;
}

/** Cycles through the font schemes, showing the current one by name. */
export function FontControl({ schemeId, onChange }: FontControlProps) {
  const theme = useTheme();
  const scheme = schemeById(schemeId);

  return (
    <ToolButton
      accessibilityLabel={`Change font, currently ${scheme.name}`}
      title={scheme.description}
      onPress={() => onChange(nextSchemeId(scheme.id))}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>
        Aa
      </span>
      <span style={{ fontSize: 12, color: theme.mutedText }}>
        {scheme.name}
      </span>
    </ToolButton>
  );
}
