import { COLOR_SCHEMES } from '../colorScheme';
import { M3eButtonSegment, M3eSegmentedButton } from '../m3e';
import { useColorSchemeChoice } from '../theme';

export function ColorSchemeControl() {
  const { schemeId, setSchemeId } = useColorSchemeChoice();

  return (
    <M3eSegmentedButton
      aria-label="Color scheme"
      hideSelectionIndicator
      style={{ flexShrink: 0 }}
    >
      {COLOR_SCHEMES.map(scheme => (
        <M3eButtonSegment
          key={scheme.id}
          value={scheme.id}
          aria-label={`${scheme.name} color scheme`}
          checked={scheme.id === schemeId}
          onBeforeInput={(event: Event) => {
            // React owns `checked`; the segment must not flip itself.
            event.preventDefault();
            setSchemeId(scheme.id);
          }}
        >
          {scheme.name}
        </M3eButtonSegment>
      ))}
    </M3eSegmentedButton>
  );
}
