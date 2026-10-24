import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM, stepZoom } from '../zoom';
import { Segment, SegmentedGroup } from './Segmented';

interface ZoomControlProps {
  scale: number;
  onChange: (scale: number) => void;
}

/** Zoom out / reset / zoom in, as one segmented group. */
export function ZoomControl({ scale, onChange }: ZoomControlProps) {
  return (
    <SegmentedGroup>
      <Segment
        label="−"
        accessibilityLabel="Zoom out"
        disabled={scale <= MIN_ZOOM}
        onPress={() => onChange(stepZoom(scale, -1))}
      />
      <Segment
        label={`${Math.round(scale * 100)}%`}
        accessibilityLabel="Reset zoom"
        wide
        disabled={scale === DEFAULT_ZOOM}
        onPress={() => onChange(DEFAULT_ZOOM)}
      />
      <Segment
        label="+"
        accessibilityLabel="Zoom in"
        disabled={scale >= MAX_ZOOM}
        onPress={() => onChange(stepZoom(scale, 1))}
      />
    </SegmentedGroup>
  );
}
