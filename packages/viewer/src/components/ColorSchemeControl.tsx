import { COLOR_SCHEMES } from '../colorScheme';
import { useColorSchemeChoice } from '../theme';
import { Segment, SegmentedGroup } from './Segmented';

export function ColorSchemeControl() {
  const { schemeId, setSchemeId } = useColorSchemeChoice();

  return (
    <SegmentedGroup style={{ flexShrink: 0 }}>
      {COLOR_SCHEMES.map(scheme => (
        <Segment
          key={scheme.id}
          label={scheme.name}
          accessibilityLabel={`${scheme.name} color scheme`}
          selected={scheme.id === schemeId}
          onPress={() => setSchemeId(scheme.id)}
        />
      ))}
    </SegmentedGroup>
  );
}
