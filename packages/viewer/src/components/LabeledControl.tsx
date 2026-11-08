import { useId, type ReactNode } from 'react';

import { typescale } from '../typescale';

type LabeledControlProps = {
  /** Shown above the control, and the name of the group. */
  label: string;
  children: ReactNode;
};

/** A toolbar control with a small label above it. */
export function LabeledControl({ label, children }: LabeledControlProps) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} style={styles.group}>
      <span id={labelId} style={styles.label}>
        {label}
      </span>
      <div style={styles.control}>{children}</div>
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
  // The toolbar makes icon buttons 48 px; a shorter control gets the same row,
  // so every label sits at the same height.
  control: {
    display: 'flex',
    alignItems: 'center',
    minHeight: 48,
  },
  label: {
    ...typescale('label-small'),
    color: 'var(--md-sys-color-on-surface-variant)',
  },
} as const;
