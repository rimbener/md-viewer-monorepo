import type { ReactNode } from 'react';

import { useTheme } from '../theme';

type ToolButtonProps = {
  accessibilityLabel: string;
  title?: string;
  disabled?: boolean;
  /** Draws the border in the accent color, for a pane that is open. */
  isActive?: boolean;
  onPress: () => void;
  children: ReactNode;
};

/** One bordered button in the tools row. */
export function ToolButton({
  accessibilityLabel,
  title,
  disabled = false,
  isActive = false,
  onPress,
  children,
}: ToolButtonProps) {
  const theme = useTheme();

  return (
    <button
      type="button"
      className="pressable"
      aria-label={accessibilityLabel}
      title={title}
      disabled={disabled}
      onClick={onPress}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 8px',
        border: `1px solid ${isActive ? theme.accent : theme.border}`,
        borderRadius: 6,
        backgroundColor: theme.background,
        opacity: disabled ? 0.4 : 1,
        fontSize: 14,
        lineHeight: '18px',
      }}
    >
      {children}
    </button>
  );
}
