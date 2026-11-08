import '@m3e/icons/outlined/checklist';

import { M3eIcon, M3eIconButton } from '../m3e';
import { Tooltip, useControlId } from './Tooltip';

interface GherkinToggleProps {
  isActive: boolean;
  onToggle: () => void;
}

/** Lays out an unfenced `Feature:` as Gherkin, or back as markdown. */
export function GherkinToggle({ isActive, onToggle }: GherkinToggleProps) {
  const id = useControlId();
  return (
    <>
      <M3eIconButton
        toggle
        selected={isActive}
        aria-label={isActive ? 'Render as markdown' : 'Render as gherkin'}
        id={id}
        onBeforeInput={(event: Event) => {
          // React owns `selected`; the button must not flip itself.
          event.preventDefault();
          onToggle();
        }}
      >
        <M3eIcon name="checklist" />
      </M3eIconButton>
      <Tooltip controlId={id} text="Lays out an unfenced Feature: as Gherkin" />
    </>
  );
}
