import { M3eButton } from '../m3e';
import { nextSchemeId, schemeById } from '../typography';

interface FontControlProps {
  schemeId: string;
  onChange: (schemeId: string) => void;
}

/** Cycles through the font schemes, showing the current one by name. */
export function FontControl({ schemeId, onChange }: FontControlProps) {
  const scheme = schemeById(schemeId);

  return (
    <M3eButton
      variant="outlined"
      size="extra-small"
      aria-label={`Change font, currently ${scheme.name}`}
      title={scheme.description}
      onClick={() => onChange(nextSchemeId(scheme.id))}
    >
      {scheme.name}
    </M3eButton>
  );
}
