import '@m3e/icons/outlined/chevron_left';
import '@m3e/icons/outlined/chevron_right';

import { PairedIconButtons } from './PairedIconButtons';

interface HistoryNavProps {
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
}

/** Back and Next through the files opened in the current folder. */
export function HistoryNav({
  canGoBack,
  canGoNext,
  onBack,
  onNext,
}: HistoryNavProps) {
  return (
    <PairedIconButtons
      actions={[
        {
          icon: 'chevron_left',
          label: 'Back',
          tooltip: 'Shows the previous file opened in this folder',
          disabled: !canGoBack,
          onClick: onBack,
        },
        {
          icon: 'chevron_right',
          label: 'Next',
          tooltip: 'Shows the next file opened in this folder',
          disabled: !canGoNext,
          onClick: onNext,
        },
      ]}
    />
  );
}
