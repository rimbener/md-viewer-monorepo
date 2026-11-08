import '@m3e/icons/outlined/add';
import '@m3e/icons/outlined/remove';

import { M3eButton, M3eButtonGroup, M3eIcon, M3eIconButton } from '../m3e';
import { LabeledControl } from './LabeledControl';

type StepControlProps = {
  /** Shown above the buttons, and the name of the group. */
  label: string;
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

/** − / the value, which resets it / +, as one button group under a label. */
export function StepControl(props: StepControlProps) {
  return (
    <LabeledControl label={props.label}>
      <M3eButtonGroup variant="connected">
        <M3eIconButton
          aria-label={props.decreaseLabel}
          disabled={!props.canDecrease}
          onClick={props.onDecrease}
        >
          <M3eIcon name="remove" />
        </M3eIconButton>
        <M3eButton
          aria-label={props.resetLabel}
          disabled={!props.canReset}
          onClick={props.onReset}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {props.value}
        </M3eButton>
        <M3eIconButton
          aria-label={props.increaseLabel}
          disabled={!props.canIncrease}
          onClick={props.onIncrease}
        >
          <M3eIcon name="add" />
        </M3eIconButton>
      </M3eButtonGroup>
    </LabeledControl>
  );
}
