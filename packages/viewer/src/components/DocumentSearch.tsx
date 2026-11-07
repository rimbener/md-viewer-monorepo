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

import { M3eButton, M3eFormField, M3eIcon, M3eIconButton } from '../m3e';
import { MAX_QUERY_LENGTH } from '../search';
import { Tooltip, useControlId } from './Tooltip';

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
  const replaceId = useControlId();
  const replaceOneId = useControlId();
  const replaceAllId = useControlId();
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

  return (
    <div style={styles.column}>
      <M3eFormField
        variant="outlined"
        hideSubscript="always"
        style={styles.field}
      >
        <M3eIcon slot="prefix" name="search" />
        <input
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
            size="extra-small"
            aria-label="Previous match"
            disabled={count === 0}
            onClick={() => go(-1)}
          >
            <M3eIcon name="keyboard_arrow_up" />
          </M3eIconButton>
          <M3eIconButton
            size="extra-small"
            aria-label="Next match"
            disabled={count === 0}
            onClick={() => go(1)}
          >
            <M3eIcon name="keyboard_arrow_down" />
          </M3eIconButton>
          <M3eIconButton
            size="extra-small"
            aria-label="Clear find"
            disabled={query.length === 0}
            onClick={() => onQuery('')}
          >
            <M3eIcon name="close" />
          </M3eIconButton>
        </span>
      </M3eFormField>
      {replace !== null ? (
        <div style={styles.row}>
          <M3eFormField
            id={replaceId}
            variant="outlined"
            hideSubscript="always"
            style={styles.field}
          >
            <input
              ref={replaceRef}
              aria-label="Replace with"
              placeholder="Replace"
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
            />
          </M3eFormField>
          {replace.isEnabled ? null : (
            <Tooltip
              controlId={replaceId}
              text="Replace works on the source. Show the editor to use it (⌘R, Ctrl+R)."
            />
          )}
          <M3eButton
            id={replaceOneId}
            variant="text"
            size="extra-small"
            disabled={!replace.isEnabled || count === 0}
            onClick={replace.onReplaceOne}
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
            size="extra-small"
            disabled={!replace.isEnabled || count === 0}
            onClick={replace.onReplaceAll}
          >
            Replace all
          </M3eButton>
          <Tooltip
            controlId={replaceAllId}
            text="Replaces every match in the source"
          />
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  field: {
    '--m3e-form-field-width': '240px',
  } as CSSProperties,
  count: {
    fontVariantNumeric: 'tabular-nums',
    minWidth: 28,
  },
  actions: {
    display: 'flex',
  },
} satisfies Record<string, CSSProperties>;
