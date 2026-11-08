import '@m3e/icons/outlined/close';
import '@m3e/icons/outlined/keyboard_arrow_down';
import '@m3e/icons/outlined/keyboard_arrow_up';
import '@m3e/icons/outlined/search';

import { useRef, type CSSProperties, type KeyboardEvent } from 'react';

import { stepActive } from '../findSession';
import { M3eFormField, M3eIcon, M3eIconButton } from '../m3e';
import { MAX_QUERY_LENGTH } from '../search';
import { useShortcut } from '../shortcuts';

type DocumentSearchProps = {
  query: string;
  count: number;
  active: number;
  capped: boolean;
  onQuery: (query: string) => void;
  onActive: (index: number) => void;
};

/** The Find field: match count, previous / next and clear inside its end. */
export function DocumentSearch({
  query,
  count,
  active,
  capped,
  onQuery,
  onActive,
}: DocumentSearchProps) {
  const fieldRef = useRef<HTMLInputElement>(null);

  useShortcut(
    'f',
    () => {
      fieldRef.current?.focus();
      fieldRef.current?.select();
    },
    { withShift: true },
  );

  const go = (direction: number) => {
    if (count > 0) {
      onActive(stepActive(active, direction, count));
    }
  };

  const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
    const direction =
      event.key === 'Enter' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowUp'
          ? -1
          : 0;
    if (direction !== 0) {
      event.preventDefault();
      go(direction);
    }
  };

  return (
    <M3eFormField
      variant="outlined"
      hideSubscript="always"
      style={findFieldStyle}
    >
      <M3eIcon slot="prefix" name="search" />
      <input
        role="searchbox"
        ref={fieldRef}
        aria-label="Find in document"
        placeholder="Find"
        value={query}
        onChange={event => onQuery(event.target.value)}
        onKeyDown={handleKey}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={MAX_QUERY_LENGTH}
      />
      <span
        slot="suffix-text"
        aria-label={
          count === 0
            ? 'No matches'
            : `Match ${active + 1} of ${count}${capped ? ' or more' : ''}`
        }
        style={styles.count}
      >
        {count === 0 ? '0' : `${active + 1}/${count}${capped ? '+' : ''}`}
      </span>
      <span slot="suffix" style={styles.actions}>
        <M3eIconButton
          aria-label="Previous match"
          disabled={count === 0}
          onClick={() => go(-1)}
        >
          <M3eIcon name="keyboard_arrow_up" />
        </M3eIconButton>
        <M3eIconButton
          aria-label="Next match"
          disabled={count === 0}
          onClick={() => go(1)}
        >
          <M3eIcon name="keyboard_arrow_down" />
        </M3eIconButton>
        <M3eIconButton
          aria-label="Clear find"
          disabled={query.length === 0}
          onClick={() => onQuery('')}
        >
          <M3eIcon name="close" />
        </M3eIconButton>
      </span>
    </M3eFormField>
  );
}

/**
 * Find and Replace grow to share the row. Their buttons sit inside the field,
 * so the default width leaves little room for text. Below 320 px each wraps.
 */
export const findFieldStyle: CSSProperties = {
  flex: '1 1 320px',
  maxWidth: 420,
};

const styles = {
  actions: {
    display: 'flex',
    alignItems: 'center',
  },
  count: {
    fontVariantNumeric: 'tabular-nums',
  },
} satisfies Record<string, CSSProperties>;
