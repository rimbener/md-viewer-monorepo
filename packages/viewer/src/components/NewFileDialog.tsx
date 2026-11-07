import { useEffect, useState, type FormEvent } from 'react';

import { M3eButton, M3eDialog, M3eFormField } from '../m3e';
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

  // Read on the first render, before `autoFocus` moves the focus.
  const [opener] = useState(() => document.activeElement);

  useEffect(() => {
    // The dialog unmounts rather than closes, so the browser gives no focus back.
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus();
      }
    };
  }, [opener]);

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

  return (
    <M3eDialog
      open
      aria-label="New file"
      onClosed={onCancel}
      onKeyDown={event => {
        // Escape belongs to the dialog, not to the shortcuts of the page.
        if (event.key === 'Escape') {
          event.stopPropagation();
        }
      }}
    >
      <span slot="header">New file</span>
      <form onSubmit={submit} style={styles.form}>
        <span title={folderPath} style={{ ...oneLine, color: theme.mutedText }}>
          In {folderPath}
        </span>
        <M3eFormField variant="outlined" error={error !== null}>
          <input
            aria-label="File name"
            placeholder="notes.md"
            autoFocus
            value={typed}
            onChange={event => {
              setTyped(event.target.value);
              setError(null);
            }}
            spellCheck={false}
          />
          {/* The error slot is not a live region. */}
          {error !== null ? (
            <span slot="error" role="alert">
              {error}
            </span>
          ) : null}
        </M3eFormField>
        <div style={styles.actions}>
          <M3eButton variant="text" onClick={onCancel}>
            Cancel
          </M3eButton>
          <M3eButton variant="filled" type="submit" disabled={isCreating}>
            OK
          </M3eButton>
        </div>
      </form>
    </M3eDialog>
  );
}

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    width: 360,
    maxWidth: '100%',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
  },
} as const;
