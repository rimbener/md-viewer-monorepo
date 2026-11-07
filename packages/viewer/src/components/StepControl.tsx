import '@m3e/icons/outlined/add';
import '@m3e/icons/outlined/remove';

import { M3eButton, M3eButtonGroup, M3eIcon, M3eIconButton } from '../m3e';

type StepControlProps = {
  value: string;
  decreaseLabel: string;
  resetLabel: string;
  increaseLabel: string;
  canDecrease: boolean;
  canReset: boolean;
  canIncrease: boolean;
  onDecrease: () => void;
  onReset: () => void;
  onIncrease: () => void;
};

/** − / the value, which resets it / +, as one button group. */
export function StepControl(props: StepControlProps) {
  return (
    <M3eButtonGroup variant="connected" size="extra-small">
      <M3eIconButton
        variant="tonal"
        size="extra-small"
        aria-label={props.decreaseLabel}
        disabled={!props.canDecrease}
        onClick={props.onDecrease}
      >
        <M3eIcon name="remove" />
      </M3eIconButton>
      <M3eButton
        variant="tonal"
        size="extra-small"
        aria-label={props.resetLabel}
        disabled={!props.canReset}
        onClick={props.onReset}
        style={{ minWidth: 56, fontVariantNumeric: 'tabular-nums' }}
      >
        {props.value}
      </M3eButton>
      <M3eIconButton
        variant="tonal"
        size="extra-small"
        aria-label={props.increaseLabel}
        disabled={!props.canIncrease}
        onClick={props.onIncrease}
      >
        <M3eIcon name="add" />
      </M3eIconButton>
    </M3eButtonGroup>
  );
}
