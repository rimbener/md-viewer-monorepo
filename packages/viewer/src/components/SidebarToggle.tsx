import { useTheme } from '../theme';

const SIZE = 28;

/** Gap to the window edge while the sidebar is hidden. */
const CLOSED_INSET = 6;

/** Left padding the header needs so the hidden-sidebar button covers nothing. */
export const SIDEBAR_TOGGLE_CLEARANCE = CLOSED_INSET + SIZE + 10;

interface SidebarToggleProps {
  isVisible: boolean;
  onToggle: () => void;
}

/**
 * Shows and hides the file tree. A circle at the vertical middle of the
 * header, centred on the sidebar's edge, so it is never inside the panel it
 * hides. Its parent must be positioned.
 */
export function SidebarToggle({ isVisible, onToggle }: SidebarToggleProps) {
  const theme = useTheme();

  return (
    <button
      type="button"
      className="pressable"
      aria-label={isVisible ? 'Hide sidebar' : 'Show sidebar'}
      title="Shows or hides the list of markdown files"
      onClick={onToggle}
      style={{
        position: 'absolute',
        top: '50%',
        left: isVisible ? -SIZE / 2 : CLOSED_INSET,
        zIndex: 1,
        width: SIZE,
        height: SIZE,
        marginTop: -SIZE / 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        border: `1px solid ${theme.border}`,
        borderRadius: '50%',
        backgroundColor: theme.background,
        boxShadow: `0 1px 4px ${theme.floatShadow}`,
        color: theme.mutedText,
        fontSize: 14,
        lineHeight: 1,
      }}
    >
      {isVisible ? '←' : '→'}
    </button>
  );
}
