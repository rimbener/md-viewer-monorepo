import { useTheme } from '../theme';
import { CODE_FONT } from '../typography';

interface EditorProps {
  value: string;
  /** Zoom, applied to the source the same way it is applied to the prose. */
  scale: number;
  onChange: (next: string) => void;
}

/**
 * The markdown source, editable. Every keystroke is handed straight back so
 * the rendered document beside it stays in step; nothing is written to disk.
 *
 * Monospace at full pane width, because source lines carry tables and fenced
 * code that the prose column's measure would wrap far too early.
 */
export function Editor({ value, scale, onChange }: EditorProps) {
  const theme = useTheme();

  return (
    <textarea
      className="field"
      aria-label="Markdown source"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="none"
      spellCheck={false}
      value={value}
      onChange={event => onChange(event.target.value)}
      style={{
        flex: 1,
        minWidth: 0,
        resize: 'none',
        border: 'none',
        padding: 20,
        fontFamily: CODE_FONT,
        fontSize: 12.5 * scale,
        lineHeight: `${18 * scale}px`,
        backgroundColor: theme.sidebar,
        color: theme.text,
      }}
    />
  );
}
