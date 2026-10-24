import type { CSSProperties } from 'react';

/** Clips text to one line with an ellipsis. */
export const oneLine: CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};
