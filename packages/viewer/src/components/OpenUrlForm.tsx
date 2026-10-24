import { useState, type FormEvent } from 'react';

import { useTheme } from '../theme';
import { isHttpUrl } from '../url';

type OpenUrlFormProps = {
  onOpen: (url: string) => void;
};

/** A field for the URL of one markdown document. */
export function OpenUrlForm({ onOpen }: OpenUrlFormProps) {
  const theme = useTheme();
  const [url, setUrl] = useState('');
  const isValid = isHttpUrl(url.trim());

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isValid) {
      onOpen(url.trim());
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 6 }}>
      <input
        className="field"
        type="url"
        aria-label="Markdown URL"
        placeholder="https://…/README.md"
        value={url}
        onChange={event => setUrl(event.target.value)}
        spellCheck={false}
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 12,
          padding: '5px 8px',
          border: `1px solid ${theme.border}`,
          borderRadius: 6,
          backgroundColor: theme.background,
          color: theme.text,
        }}
      />
      <button
        type="submit"
        className="pressable"
        disabled={!isValid}
        style={{
          padding: '5px 10px',
          border: `1px solid ${theme.border}`,
          borderRadius: 6,
          backgroundColor: theme.background,
          color: theme.accent,
          fontSize: 12,
          fontWeight: 600,
          opacity: isValid ? 1 : 0.5,
        }}
      >
        Open URL
      </button>
    </form>
  );
}
