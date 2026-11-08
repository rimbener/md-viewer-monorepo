import '@m3e/icons/outlined/add';
import '@m3e/icons/outlined/remove';

import { useId } from 'react';

import { M3eButton, M3eButtonGroup, M3eIcon, M3eIconButton } from '../m3e';
import { typescale } from '../typescale';

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
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} style={styles.group}>
      <span id={labelId} style={styles.label}>
        {props.label}
      </span>
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
    </div>
  );
}

const styles = {
  // The toolbar's state layer is positioned, so it paints over static content.
  group: {
    position: 'relative',
    marginTop: 8,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  label: {
    ...typescale('label-small'),
    color: 'var(--md-sys-color-on-surface-variant)',
  },
} as const;
