import { M3eButtonGroup, M3eIcon, M3eIconButton } from '../m3e';
import type { IconButtonProps } from './IconButton';
import { Tooltip, useControlId } from './Tooltip';

type IconAction = Pick<
  IconButtonProps,
  'icon' | 'label' | 'tooltip' | 'onClick'
> & { disabled: boolean };

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
            key={action.label}
            id={`${id}-${index}`}
            aria-label={action.label}
            disabled={action.disabled}
            onClick={action.onClick}
          >
            <M3eIcon name={action.icon} />
          </M3eIconButton>
        ))}
      </M3eButtonGroup>
      {/* Outside the group, which shapes its buttons by their position. */}
      {actions.map((action, index) => (
        <Tooltip
          key={action.label}
          controlId={`${id}-${index}`}
          text={action.tooltip}
        />
      ))}
    </>
  );
}
