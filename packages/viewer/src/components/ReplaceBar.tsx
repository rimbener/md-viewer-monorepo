import '@m3e/icons/outlined/check';
import '@m3e/icons/outlined/done_all';
import '@m3e/icons/outlined/find_replace';

import { useEffect, useRef, type CSSProperties } from 'react';

import { M3eFormField, M3eIcon, M3eIconButton } from '../m3e';
import { findFieldStyle } from './DocumentSearch';
import { Tooltip, useControlId } from './Tooltip';

type ReplaceBarProps = {
  /** Above 0 when Command-G asked for the field; reset with `onFocused`. */
  focusKey: number;
  onFocused: () => void;
  value: string;
  /** The editor is hidden, or the document cannot be edited. */
  disabled: boolean;
  canReplace: boolean;
  onValue: (value: string) => void;
  onReplaceOne: () => void;
  onReplaceAll: () => void;
};

/** Replace, beside Find. It changes the source, so it works only while the editor shows. */
export function ReplaceBar({
  focusKey,
  onFocused,
  value,
  disabled,
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
    <>
      <M3eFormField
        variant="outlined"
        hideSubscript="always"
        style={findFieldStyle}
      >
        <M3eIcon slot="prefix" name="find_replace" />
        <input
          ref={fieldRef}
          aria-label="Replace with"
          placeholder="Replace"
          value={value}
          disabled={disabled}
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
        <span slot="suffix" style={styles.actions}>
          <M3eIconButton
            id={replaceOneId}
            aria-label="Replace one"
            disabled={disabled || !canReplace}
            onClick={onReplaceOne}
          >
            <M3eIcon name="check" />
          </M3eIconButton>
          <M3eIconButton
            id={replaceAllId}
            aria-label="Replace all"
            disabled={disabled || !canReplace}
            onClick={onReplaceAll}
          >
            <M3eIcon name="done_all" />
          </M3eIconButton>
        </span>
      </M3eFormField>
      <Tooltip
        controlId={replaceOneId}
        text="Replaces the current match (Return in the field)"
      />
      <Tooltip
        controlId={replaceAllId}
        text="Replaces every match in the source"
      />
    </>
  );
}

const styles = {
  actions: {
    display: 'flex',
  },
} satisfies Record<string, CSSProperties>;
