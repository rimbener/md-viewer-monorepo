import { M3eButton } from '../m3e';
import { nextSchemeId, schemeById } from '../typography';
import { Tooltip, useControlId } from './Tooltip';

interface FontControlProps {
  schemeId: string;
  onChange: (schemeId: string) => void;
}

/** Cycles through the font schemes, showing the current one by name. */
export function FontControl({ schemeId, onChange }: FontControlProps) {
  const id = useControlId();
  const scheme = schemeById(schemeId);

  return (
    <>
      <M3eButton
        variant="outlined"
        size="extra-small"
        aria-label={`Change font, currently ${scheme.name}`}
        id={id}
        onClick={() => onChange(nextSchemeId(scheme.id))}
      >
        {scheme.name}
      </M3eButton>
      <Tooltip controlId={id} text={scheme.description} />
    </>
  );
}
