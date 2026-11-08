import { M3eIcon, M3eIconButton } from '../m3e';
import { Tooltip, useControlId } from './Tooltip';

export type IconButtonProps = {
  icon: string;
  label: string;
  tooltip: string;
  onClick: () => void;
  disabled?: boolean;
  selected?: boolean;
  expanded?: boolean;
};

export function IconButton({
  icon,
  label,
  tooltip,
  onClick,
  disabled = false,
  selected,
  expanded,
}: IconButtonProps) {
  const id = useControlId();
  const toggle =
    selected === undefined
      ? { onClick }
      : {
          toggle: true,
          selected,
          onBeforeInput: (event: Event) => {
            // React owns `selected`; the button must not flip itself.
            event.preventDefault();
            onClick();
          },
        };

  return (
    <>
      <M3eIconButton
        aria-label={label}
        aria-expanded={
          expanded === undefined ? undefined : expanded ? 'true' : 'false'
        }
        id={id}
        disabled={disabled}
        {...toggle}
      >
        <M3eIcon name={icon} />
      </M3eIconButton>
      <Tooltip controlId={id} text={tooltip} />
    </>
  );
}
