import { Segment, SegmentedGroup } from './Segmented';

interface HistoryNavProps {
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
}

/** Back and Next through the files opened in the current folder. */
export function HistoryNav({
  canGoBack,
  canGoNext,
  onBack,
  onNext,
}: HistoryNavProps) {
  return (
    <SegmentedGroup>
      <Segment
        label="‹"
        accessibilityLabel="Back"
        title="Shows the previous file opened in this folder"
        fontSize={16}
        disabled={!canGoBack}
        onPress={onBack}
      />
      <Segment
        label="›"
        accessibilityLabel="Next"
        title="Shows the next file opened in this folder"
        fontSize={16}
        disabled={!canGoNext}
        onPress={onNext}
      />
    </SegmentedGroup>
  );
}
