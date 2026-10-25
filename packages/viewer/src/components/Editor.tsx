import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useTheme } from '../theme';
import { CODE_FONT } from '../typography';

/** Padding around the source, and the least space under its last line. */
const PADDING = 20;

/** Source line, before zoom. */
const LINE = 18;

interface EditorProps {
  value: string;
  /** Zoom, applied to the source the same way it is applied to the prose. */
  scale: number;
  /** Full scroll leaves the last line this far below the top, as in the document. */
  lastLineInset: number;
  onChange: (next: string) => void;
  onUndo: () => void;
  onRedo: () => void;
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
}: EditorProps) {
  const theme = useTheme();
  const field = useRef<HTMLTextAreaElement | null>(null);
  const shown = useRef(value);
  const commands = useRef({ onUndo, onRedo });
  commands.current = { onUndo, onRedo };
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
    <textarea
      ref={field}
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
        flex: 1,
        minWidth: 0,
        resize: 'none',
        border: 'none',
        padding: PADDING,
        paddingBottom: endSpace,
        fontFamily: CODE_FONT,
        fontSize: 12.5 * scale,
        lineHeight: `${lineHeight}px`,
        backgroundColor: theme.sidebar,
        color: theme.text,
      }}
    />
  );
}
