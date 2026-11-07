import { M3eButtonGroup, M3eIcon, M3eIconButton } from '../m3e';

export type IconAction = {
  icon: string;
  accessibilityLabel: string;
  title: string;
  disabled: boolean;
  onPress: () => void;
};

/** Two icon buttons joined as one group: back and next, undo and redo. */
export function PairedIconButtons({
  actions,
}: {
  actions: [IconAction, IconAction];
}) {
  return (
    <M3eButtonGroup variant="connected" size="extra-small">
      {actions.map(action => (
        <M3eIconButton
          key={action.accessibilityLabel}
          variant="tonal"
          size="extra-small"
          aria-label={action.accessibilityLabel}
          title={action.title}
          disabled={action.disabled}
          onClick={action.onPress}
        >
          <M3eIcon name={action.icon} />
        </M3eIconButton>
      ))}
    </M3eButtonGroup>
  );
}
