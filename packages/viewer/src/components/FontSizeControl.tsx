import {
  DEFAULT_FONT_SIZE,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  stepFontSize,
} from '../fontSize';
import { StepControl } from './StepControl';

interface FontSizeControlProps {
  size: number;
  onChange: (size: number) => void;
}

/** Smaller / reset / larger text, as one button group. */
export function FontSizeControl({ size, onChange }: FontSizeControlProps) {
  return (
    <StepControl
      value={`${size}px`}
      decreaseLabel="Decrease font size"
      resetLabel="Reset font size"
      increaseLabel="Increase font size"
      canDecrease={size > MIN_FONT_SIZE}
      canReset={size !== DEFAULT_FONT_SIZE}
      canIncrease={size < MAX_FONT_SIZE}
      onDecrease={() => onChange(stepFontSize(size, -1))}
      onReset={() => onChange(DEFAULT_FONT_SIZE)}
      onIncrease={() => onChange(stepFontSize(size, 1))}
    />
  );
}
