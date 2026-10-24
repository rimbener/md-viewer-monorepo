import { useEffect, useRef, type KeyboardEvent } from 'react';

import { MAX_QUERY_LENGTH } from '../search';
import { useTheme } from '../theme';
import { Segment, SegmentedGroup } from './Segmented';

type DocumentSearchProps = {
  query: string;
  count: number;
  active: number;
  capped: boolean;
  onQuery: (query: string) => void;
  onActive: (index: number) => void;
};

/** Find field, match count, and previous / next. Last control on the tools row. */
export function DocumentSearch({
  query,
  count,
  active,
  capped,
  onQuery,
  onActive,
}: DocumentSearchProps) {
  const theme = useTheme();
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        ref={fieldRef}
        className="field"
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
        style={{
          width: 128,
          fontSize: 14,
          padding: '3px 6px',
          border: `1px solid ${theme.border}`,
          borderRadius: 6,
          backgroundColor: theme.background,
          color: theme.text,
        }}
      />
      <span
        aria-label={
          count === 0
            ? 'No matches'
            : `Match ${active + 1} of ${count}${capped ? ' or more' : ''}`
        }
        style={{
          fontSize: 12,
          fontVariantNumeric: 'tabular-nums',
          minWidth: 36,
          color: count === 0 ? theme.mutedText : theme.text,
        }}
      >
        {count === 0 ? '0' : `${active + 1}/${count}${capped ? '+' : ''}`}
      </span>
      <SegmentedGroup>
        <Segment
          label="↑"
          accessibilityLabel="Previous match"
          disabled={count === 0}
          onPress={() => go(-1)}
        />
        <Segment
          label="↓"
          accessibilityLabel="Next match"
          disabled={count === 0}
          onPress={() => go(1)}
        />
        <Segment
          label="×"
          accessibilityLabel="Clear find"
          disabled={query.length === 0}
          onPress={() => onQuery('')}
        />
      </SegmentedGroup>
    </div>
  );
}
