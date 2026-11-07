import { useState, type FormEvent } from 'react';

import { M3eButton, M3eFormField } from '../m3e';
import { isHttpUrl } from '../url';

type OpenUrlFormProps = {
  onOpen: (url: string) => void;
};

/** A field for the URL of one markdown document. */
export function OpenUrlForm({ onOpen }: OpenUrlFormProps) {
  const [url, setUrl] = useState('');
  const isValid = isHttpUrl(url.trim());

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isValid) {
      onOpen(url.trim());
    }
  };

  return (
    <form
      onSubmit={submit}
      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
    >
      <M3eFormField
        variant="outlined"
        hideSubscript="always"
        style={{ flex: 1, minWidth: 0 }}
      >
        <input
          type="url"
          aria-label="Markdown URL"
          placeholder="https://…/README.md"
          value={url}
          onChange={event => setUrl(event.target.value)}
          spellCheck={false}
        />
      </M3eFormField>
      <M3eButton variant="filled" type="submit" disabled={!isValid}>
        Open URL
      </M3eButton>
    </form>
  );
}
