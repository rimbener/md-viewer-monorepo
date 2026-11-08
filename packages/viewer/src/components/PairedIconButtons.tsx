import { M3eButtonGroup, M3eIcon, M3eIconButton } from '../m3e';
import { Tooltip, useControlId } from './Tooltip';

export type IconAction = {
  icon: string;
  accessibilityLabel: string;
  tooltip: string;
  disabled: boolean;
  onPress: () => void;
};

/** Two icon buttons joined as one group: back and next, undo and redo. */
export function PairedIconButtons({
  actions,
}: {
  actions: [IconAction, IconAction];
}) {
  const id = useControlId();

  return (
    <>
      <M3eButtonGroup variant="connected">
        {actions.map((action, index) => (
          <M3eIconButton
            key={action.accessibilityLabel}
            id={`${id}-${index}`}
            aria-label={action.accessibilityLabel}
            disabled={action.disabled}
            onClick={action.onPress}
          >
            <M3eIcon name={action.icon} />
          </M3eIconButton>
        ))}
      </M3eButtonGroup>
      {/* Outside the group, which shapes its buttons by their position. */}
      {actions.map((action, index) => (
        <Tooltip
          key={action.accessibilityLabel}
          controlId={`${id}-${index}`}
          text={action.tooltip}
        />
      ))}
    </>
  );
}
