import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useTheme, type Theme } from '../theme';
import { CODE_FONT } from '../typography';

/** Padding around the source, and the least space under its last line. */
const PADDING = 20;

/** Source line, before zoom. */
const LINE = 18;

/** Space left above the current hit when the source scrolls to it. */
const REVEAL_MARGIN = 48;

/** Find hits in the source: where each starts, and which one is current. */
export type EditorMarks = {
  query: string;
  starts: readonly number[];
  active: number;
};

interface EditorProps {
  value: string;
  /** Zoom, applied to the source the same way it is applied to the prose. */
  scale: number;
  /** Full scroll leaves the last line this far below the top, as in the document. */
  lastLineInset: number;
  onChange: (next: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  /** Receives the text field, for a caller that follows its scroll. */
  fieldRef?: (element: HTMLTextAreaElement | null) => void;
  onScroll?: () => void;
  /** Find hits to mark behind the text, or null when nothing is searched. */
  marks?: EditorMarks | null;
}

/** Where `next` stops matching `previous`, counted from the end of the change. */
function caretAfterChange(previous: string, next: string): number {
  const shorter = Math.min(previous.length, next.length);
  let start = 0;
  while (start < shorter && previous[start] === next[start]) {
    start += 1;
  }
  let end = 0;
  while (
    end < shorter - start &&
    previous[previous.length - 1 - end] === next[next.length - 1 - end]
  ) {
    end += 1;
  }
  return next.length - end;
}

/**
 * The markdown source, editable. Every keystroke is handed straight back so
 * the rendered document beside it stays in step.
 *
 * Monospace at full pane width, because source lines carry tables and fenced
 * code that the prose column's measure would wrap far too early.
 */
export function Editor({
  value,
  scale,
  lastLineInset,
  onChange,
  onUndo,
  onRedo,
  fieldRef,
  onScroll,
  marks = null,
}: EditorProps) {
  const theme = useTheme();
  const field = useRef<HTMLTextAreaElement | null>(null);
  const mirror = useRef<HTMLDivElement | null>(null);
  const shown = useRef(value);
  const commands = useRef({ onUndo, onRedo });
  commands.current = { onUndo, onRedo };
  const attachField = useCallback(
    (element: HTMLTextAreaElement | null) => {
      field.current = element;
      fieldRef?.(element);
    },
    [fieldRef],
  );
  const [height, setHeight] = useState(0);
  const lineHeight = LINE * scale;
  const endSpace = Math.max(PADDING, height - lineHeight - lastLineInset);

  useEffect(() => {
    const element = field.current;
    if (element === null || typeof ResizeObserver === 'undefined') {
      return;
    }
    const measure = () => setHeight(element.offsetHeight);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);

  // A value set from outside moves the caret to the end; an undo should leave
  // it where the text changed, as the text field's own undo would.
  useLayoutEffect(() => {
    const element = field.current;
    const previous = shown.current;
    shown.current = value;
    if (
      element === null ||
      previous === value ||
      element.ownerDocument.activeElement !== element
    ) {
      return;
    }
    const caret = caretAfterChange(previous, value);
    element.setSelectionRange(caret, caret);
  }, [value]);

  const active = marks?.active ?? -1;
  const query = marks?.query ?? '';

  useLayoutEffect(() => {
    if (mirror.current !== null && field.current !== null) {
      mirror.current.scrollTop = field.current.scrollTop;
    }
  });

  // Typing keeps the view still; only a new query or a step to another hit moves it.
  useLayoutEffect(() => {
    const element = field.current;
    const hit = mirror.current?.querySelector<HTMLElement>(
      `[data-find-hit="${active}"]`,
    );
    if (element === null || hit == null) {
      return;
    }
    element.scrollTop = Math.max(0, hit.offsetTop - REVEAL_MARGIN);
    if (mirror.current !== null) {
      mirror.current.scrollTop = element.scrollTop;
    }
  }, [active, query]);

  const text = {
    margin: 0,
    border: 'none',
    padding: PADDING,
    paddingBottom: endSpace,
    fontFamily: CODE_FONT,
    fontSize: 12.5 * scale,
    lineHeight: `${lineHeight}px`,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    overflowY: 'auto',
    // Both layers keep the same gutter so their lines wrap at the same place.
    scrollbarGutter: 'stable',
  } as const;

  // The text field's own history knows nothing of switched files and saves,
  // so the Edit menu's Undo, which arrives as an input event, goes to ours.
  useEffect(() => {
    const element = field.current;
    if (element === null) {
      return;
    }
    const redirect = (event: InputEvent) => {
      if (event.inputType === 'historyUndo') {
        event.preventDefault();
        commands.current.onUndo();
      } else if (event.inputType === 'historyRedo') {
        event.preventDefault();
        commands.current.onRedo();
      }
    };
    element.addEventListener('beforeinput', redirect);
    return () => element.removeEventListener('beforeinput', redirect);
  }, []);

  return (
    <div
      style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex' }}
    >
      {marks === null ? null : (
        <div
          ref={mirror}
          aria-hidden="true"
          data-testid="editor-marks"
          style={{
            ...text,
            position: 'absolute',
            inset: 0,
            overflowY: 'hidden',
            pointerEvents: 'none',
            color: 'transparent',
            backgroundColor: theme.sidebar,
          }}
        >
          <MarkedSource value={value} marks={marks} theme={theme} />
        </div>
      )}
      <textarea
        ref={attachField}
        onScroll={() => {
          if (mirror.current !== null && field.current !== null) {
            mirror.current.scrollTop = field.current.scrollTop;
          }
          onScroll?.();
        }}
        className="field"
        aria-label="Markdown source"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        value={value}
        onChange={event => {
          shown.current = event.target.value;
          onChange(event.target.value);
        }}
        onKeyDown={event => {
          if (!(event.metaKey || event.ctrlKey) || event.altKey) {
            return;
          }
          const key = event.key.toLowerCase();
          if (key === 'z') {
            event.preventDefault();
            if (event.shiftKey) {
              onRedo();
            } else {
              onUndo();
            }
          } else if (key === 'y' && !event.shiftKey) {
            event.preventDefault();
            onRedo();
          }
        }}
        style={{
          ...text,
          position: 'relative',
          flex: 1,
          minWidth: 0,
          resize: 'none',
          backgroundColor: marks === null ? theme.sidebar : 'transparent',
          color: theme.text,
        }}
      />
    </div>
  );
}

type MarkedSourceProps = {
  value: string;
  marks: EditorMarks;
  theme: Theme;
};

/** The source again, invisible, with each hit painted where it falls. */
function MarkedSource({ value, marks, theme }: MarkedSourceProps) {
  const length = marks.query.length;
  const pieces: ReactNode[] = [];
  let cursor = 0;
  marks.starts.forEach((start, index) => {
    pieces.push(
      <Fragment key={`t${index}`}>{value.slice(cursor, start)}</Fragment>,
      <mark
        key={`m${index}`}
        data-find-hit={index}
        style={{
          color: 'transparent',
          backgroundColor:
            index === marks.active ? theme.searchCurrent : theme.searchHit,
        }}
      >
        {value.slice(start, start + length)}
      </mark>,
    );
    cursor = start + length;
  });
  // A trailing newline has no height in a div, unlike in the text field.
  pieces.push(
    <Fragment key="end">
      {value.slice(cursor)}
      {'\n'}
    </Fragment>,
  );
  return <>{pieces}</>;
}
