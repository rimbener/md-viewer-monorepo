import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM, stepZoom } from '../zoom';
import { StepControl } from './StepControl';

interface ZoomControlProps {
  scale: number;
  onChange: (scale: number) => void;
}

/** Zoom out / reset / zoom in, as one button group. */
export function ZoomControl({ scale, onChange }: ZoomControlProps) {
  return (
    <StepControl
      label="Zoom"
      value={`${Math.round(scale * 100)}%`}
      decreaseLabel="Zoom out"
      resetLabel="Reset zoom"
      increaseLabel="Zoom in"
      canDecrease={scale > MIN_ZOOM}
      canReset={scale !== DEFAULT_ZOOM}
      canIncrease={scale < MAX_ZOOM}
      onDecrease={() => onChange(stepZoom(scale, -1))}
      onReset={() => onChange(DEFAULT_ZOOM)}
      onIncrease={() => onChange(stepZoom(scale, 1))}
    />
  );
}
