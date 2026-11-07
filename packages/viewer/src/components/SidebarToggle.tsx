import '@m3e/icons/outlined/menu';

import { M3eIcon, M3eIconButton } from '../m3e';
import { Tooltip, useControlId } from './Tooltip';

interface SidebarToggleProps {
  isVisible: boolean;
  onToggle: () => void;
}

/** The navigation button: opens and closes the drawer with the file tree. */
export function SidebarToggle({ isVisible, onToggle }: SidebarToggleProps) {
  const id = useControlId();
  return (
    <>
      <M3eIconButton
        aria-label={isVisible ? 'Hide sidebar' : 'Show sidebar'}
        aria-expanded={isVisible ? 'true' : 'false'}
        id={id}
        onClick={onToggle}
      >
        <M3eIcon name="menu" />
      </M3eIconButton>
      <Tooltip
        controlId={id}
        text="Shows or hides the list of markdown files (⌘B, Ctrl+B)"
      />
    </>
  );
}
