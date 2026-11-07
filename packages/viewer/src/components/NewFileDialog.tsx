import { useState, type FormEvent, type KeyboardEvent } from 'react';

import { newFileName } from '../newFileName';
import { useTheme } from '../theme';
import { oneLine } from './text';

type NewFileDialogProps = {
  folderPath: string;
  /** Makes the file. A rejection's message shows in the dialog. */
  onCreate: (name: string) => Promise<void>;
  onCancel: () => void;
};

/** Asks for the name of a new markdown file in `folderPath`. */
export function NewFileDialog({
  folderPath,
  onCreate,
  onCancel,
}: NewFileDialogProps) {
  const theme = useTheme();
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isCreating) {
      return;
    }
    const result = newFileName(typed);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setIsCreating(true);
    setError(null);
    onCreate(result.name).catch((cause: unknown) => {
      setIsCreating(false);
      setError(
        cause instanceof Error ? cause.message : 'Could not create the file.',
      );
    });
  };

  const keyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onCancel();
    }
  };

  const button = {
    padding: '6px 14px',
    border: `1px solid ${theme.border}`,
    borderRadius: 6,
    backgroundColor: theme.background,
    fontSize: 13,
    fontWeight: 600,
  } as const;

  return (
    <div
      onKeyDown={keyDown}
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: theme.backdrop,
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-file-title"
        onSubmit={submit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          width: 360,
          maxWidth: '100%',
          padding: 16,
          border: `1px solid ${theme.border}`,
          borderRadius: 10,
          backgroundColor: theme.sidebar,
          boxShadow: `0 8px 24px ${theme.floatShadow}`,
          color: theme.text,
        }}
      >
        <span id="new-file-title" style={{ fontSize: 14, fontWeight: 600 }}>
          New file
        </span>
        <span
          title={folderPath}
          style={{ ...oneLine, fontSize: 12, color: theme.mutedText }}
        >
          In {folderPath}
        </span>
        <input
          className="field"
          aria-label="File name"
          placeholder="notes.md"
          autoFocus
          value={typed}
          onChange={event => {
            setTyped(event.target.value);
            setError(null);
          }}
          spellCheck={false}
          style={{
            fontSize: 13,
            padding: '6px 8px',
            border: `1px solid ${theme.border}`,
            borderRadius: 6,
            backgroundColor: theme.background,
            color: theme.text,
          }}
        />
        {error !== null ? (
          <span
            role="alert"
            style={{ fontSize: 12, color: theme.syntaxKeyword }}
          >
            {error}
          </span>
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            className="pressable"
            onClick={onCancel}
            style={{ ...button, color: theme.text }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="pressable"
            disabled={isCreating}
            style={{
              ...button,
              color: theme.accent,
              opacity: isCreating ? 0.5 : 1,
            }}
          >
            OK
          </button>
        </div>
      </form>
    </div>
  );
}
