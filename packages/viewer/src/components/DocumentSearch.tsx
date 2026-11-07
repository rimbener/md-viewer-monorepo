import { useEffect, useRef, type KeyboardEvent } from 'react';

import { MAX_QUERY_LENGTH } from '../search';
import { useTheme } from '../theme';
import { Segment, SegmentedGroup } from './Segmented';

/** The replace row. It works on the source, so only while the editor shows. */
export type ReplaceControls = {
  isEnabled: boolean;
  /** Bumped by Command-R, so the field takes the focus again. */
  focusKey: number;
  value: string;
  onValue: (value: string) => void;
  onReplaceOne: () => void;
  onReplaceAll: () => void;
};

type DocumentSearchProps = {
  query: string;
  count: number;
  active: number;
  capped: boolean;
  onQuery: (query: string) => void;
  onActive: (index: number) => void;
  replace?: ReplaceControls | null;
};

/** Find field, match count, and previous / next. Last control on the tools row. */
export function DocumentSearch({
  query,
  count,
  active,
  capped,
  onQuery,
  onActive,
  replace = null,
}: DocumentSearchProps) {
  const theme = useTheme();
  const fieldRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const focusKey = replace?.focusKey ?? 0;

  useEffect(() => {
    if (focusKey > 0) {
      replaceRef.current?.focus();
      replaceRef.current?.select();
    }
  }, [focusKey]);

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

  const field = {
    width: 128,
    fontSize: 14,
    padding: '3px 6px',
    border: `1px solid ${theme.border}`,
    borderRadius: 6,
    backgroundColor: theme.background,
    color: theme.text,
  } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
          style={field}
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
      {replace !== null ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            ref={replaceRef}
            className="field"
            aria-label="Replace with"
            placeholder="Replace"
            title={
              replace.isEnabled
                ? undefined
                : 'Replace works on the source. Show the editor to use it (⌘R, Ctrl+R).'
            }
            disabled={!replace.isEnabled}
            value={replace.value}
            onChange={event => replace.onValue(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                replace.onReplaceOne();
              }
            }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            style={{ ...field, opacity: replace.isEnabled ? 1 : 0.5 }}
          />
          <SegmentedGroup>
            <Segment
              label="Replace one"
              accessibilityLabel="Replace one"
              title="Replaces the current match (Return in the field)"
              disabled={!replace.isEnabled || count === 0}
              onPress={replace.onReplaceOne}
            />
            <Segment
              label="Replace all"
              accessibilityLabel="Replace all"
              title="Replaces every match in the source"
              disabled={!replace.isEnabled || count === 0}
              onPress={replace.onReplaceAll}
            />
          </SegmentedGroup>
        </div>
      ) : null}
    </div>
  );
}
