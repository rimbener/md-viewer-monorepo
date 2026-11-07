import '@m3e/icons/outlined/left_panel_close';
import '@m3e/icons/outlined/left_panel_open';

import { M3eIcon, M3eIconButton } from '../m3e';
import { Tooltip, useControlId } from './Tooltip';

const SIZE = 32;

/** Gap to the window edge while the sidebar is hidden. */
const CLOSED_INSET = 6;

/** Left padding the header needs so the hidden-sidebar button covers nothing. */
export const SIDEBAR_TOGGLE_CLEARANCE = CLOSED_INSET + SIZE + 10;

interface SidebarToggleProps {
  isVisible: boolean;
  onToggle: () => void;
}

/**
 * Shows and hides the file tree. At the vertical middle of the header,
 * centred on the sidebar's edge, so it is never inside the panel it hides.
 * Its parent must be positioned.
 */
export function SidebarToggle({ isVisible, onToggle }: SidebarToggleProps) {
  const id = useControlId();
  return (
    <>
      <M3eIconButton
        toggle
        selected={isVisible}
        variant="tonal"
        size="extra-small"
        aria-label={isVisible ? 'Hide sidebar' : 'Show sidebar'}
        id={id}
        onBeforeInput={(event: Event) => {
          // React owns `selected`; the button must not flip itself.
          event.preventDefault();
          onToggle();
        }}
        style={{
          position: 'absolute',
          top: '50%',
          left: isVisible ? -SIZE / 2 : CLOSED_INSET,
          zIndex: 1,
          marginTop: -SIZE / 2,
        }}
      >
        <M3eIcon name={isVisible ? 'left_panel_close' : 'left_panel_open'} />
      </M3eIconButton>
      <Tooltip
        controlId={id}
        text="Shows or hides the list of markdown files (⌘B, Ctrl+B)"
      />
    </>
  );
}
