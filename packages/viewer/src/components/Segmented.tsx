import { Fragment, type CSSProperties, type ReactNode } from 'react';

import { useTheme } from '../theme';

type SegmentedGroupProps = {
  children: ReactNode[];
  style?: CSSProperties;
};

/** Segments side by side in one bordered group, split by hairlines. */
export function SegmentedGroup({ children, style }: SegmentedGroupProps) {
  const theme = useTheme();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        border: `1px solid ${theme.border}`,
        borderRadius: 6,
        overflow: 'hidden',
        backgroundColor: theme.background,
        ...style,
      }}
    >
      {children.map((child, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <div style={{ width: 1, backgroundColor: theme.border }} />
          ) : null}
          {child}
        </Fragment>
      ))}
    </div>
  );
}

type SegmentProps = {
  label: string;
  accessibilityLabel: string;
  title?: string;
  disabled?: boolean;
  /** Wide segments show a value and stay legible while disabled. */
  wide?: boolean;
  selected?: boolean;
  fontSize?: number;
  onPress: () => void;
};

export function Segment({
  label,
  accessibilityLabel,
  title,
  disabled = false,
  wide = false,
  selected,
  fontSize = 12,
  onPress,
}: SegmentProps) {
  const theme = useTheme();
  const isMuted = disabled && !wide;

  return (
    <button
      type="button"
      className="pressable"
      aria-label={accessibilityLabel}
      aria-pressed={selected}
      title={title}
      disabled={disabled}
      onClick={onPress}
      style={{
        minWidth: wide ? 52 : 28,
        padding: '3px 10px',
        border: 'none',
        background: selected ? theme.selectedBackground : 'transparent',
        color: selected
          ? theme.selectedText
          : isMuted
            ? theme.mutedText
            : theme.text,
        opacity: isMuted ? 0.5 : 1,
        fontSize,
        lineHeight: '18px',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {label}
    </button>
  );
}
