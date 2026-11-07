import { useId } from 'react';

import { M3eTooltip } from '../m3e';

/** An id m3e can find with `querySelector('#…')`, which React's ids break. */
export function useControlId(): string {
  return `control-${useId().replace(/[^\w-]/g, '')}`;
}

type TooltipProps = {
  controlId: string;
  text: string;
};

/** The M3 tooltip of the control with id `controlId`. */
export function Tooltip({ controlId, text }: TooltipProps) {
  return <M3eTooltip htmlFor={controlId}>{text}</M3eTooltip>;
}
