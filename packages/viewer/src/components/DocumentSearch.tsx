import '@m3e/icons/outlined/close';
import '@m3e/icons/outlined/keyboard_arrow_down';
import '@m3e/icons/outlined/keyboard_arrow_up';
import '@m3e/icons/outlined/search';

import {
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';

import { M3eIcon, M3eIconButton, M3eSearchBar } from '../m3e';
import { MAX_QUERY_LENGTH } from '../search';

type DocumentSearchProps = {
  query: string;
  count: number;
  active: number;
  capped: boolean;
  onQuery: (query: string) => void;
  onActive: (index: number) => void;
};

/** The Find search bar in the top app bar: field, match count, previous / next. */
export function DocumentSearch({
  query,
  count,
  active,
  capped,
  onQuery,
  onActive,
}: DocumentSearchProps) {
  const fieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Command-F (Control-F off the Mac) finds in the document, not the page.
    const focusFind = (event: globalThis.KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.key.toLowerCase() === 'f'
      ) {
        event.preventDefault();
        fieldRef.current?.focus();
        fieldRef.current?.select();
      }
    };
    window.addEventListener('keydown', focusFind);
    return () => window.removeEventListener('keydown', focusFind);
  }, []);

  const go = (direction: number) => {
    if (count <= 0) {
      return;
    }
    onActive((active + direction + count) % count);
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
    <M3eSearchBar style={styles.bar}>
      <M3eIcon slot="leading" name="search" />
      <input
        slot="input"
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
      <span slot="trailing" style={styles.trailing}>
        <span
          aria-label={
            count === 0
              ? 'No matches'
              : `Match ${active + 1} of ${count}${capped ? ' or more' : ''}`
          }
          style={styles.count}
        >
          {count === 0 ? '0' : `${active + 1}/${count}${capped ? '+' : ''}`}
        </span>
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
    </M3eSearchBar>
  );
}

const styles = {
  // M3 search bar: 360 dp at its narrowest.
  bar: {
    width: 360,
  },
  trailing: {
    display: 'flex',
    alignItems: 'center',
  },
  count: {
    fontVariantNumeric: 'tabular-nums',
  },
} satisfies Record<string, CSSProperties>;
