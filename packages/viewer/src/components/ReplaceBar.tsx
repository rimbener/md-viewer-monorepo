import { useEffect, useRef, type CSSProperties } from 'react';

import { M3eButton, M3eFormField } from '../m3e';
import { Tooltip, useControlId } from './Tooltip';

type ReplaceBarProps = {
  /** Above 0 when Command-G asked for the field; reset with `onFocused`. */
  focusKey: number;
  onFocused: () => void;
  value: string;
  canReplace: boolean;
  onValue: (value: string) => void;
  onReplaceOne: () => void;
  onReplaceAll: () => void;
};

/** Replace, beside Find. It works on the source, so only while the editor shows. */
export function ReplaceBar({
  focusKey,
  onFocused,
  value,
  canReplace,
  onValue,
  onReplaceOne,
  onReplaceAll,
}: ReplaceBarProps) {
  const replaceOneId = useControlId();
  const replaceAllId = useControlId();
  const fieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusKey > 0) {
      fieldRef.current?.focus();
      fieldRef.current?.select();
      onFocused();
    }
  }, [focusKey, onFocused]);

  return (
    <div style={styles.row}>
      <M3eFormField variant="outlined" hideSubscript="always">
        <input
          ref={fieldRef}
          aria-label="Replace with"
          placeholder="Replace"
          value={value}
          onChange={event => onValue(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onReplaceOne();
            }
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
        />
      </M3eFormField>
      <M3eButton
        id={replaceOneId}
        variant="text"
        disabled={!canReplace}
        onClick={onReplaceOne}
      >
        Replace one
      </M3eButton>
      <Tooltip
        controlId={replaceOneId}
        text="Replaces the current match (Return in the field)"
      />
      <M3eButton
        id={replaceAllId}
        variant="text"
        disabled={!canReplace}
        onClick={onReplaceAll}
      >
        Replace all
      </M3eButton>
      <Tooltip
        controlId={replaceAllId}
        text="Replaces every match in the source"
      />
    </div>
  );
}

const styles = {
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
} satisfies Record<string, CSSProperties>;
