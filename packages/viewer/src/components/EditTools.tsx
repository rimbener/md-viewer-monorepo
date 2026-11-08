import '@m3e/icons/outlined/redo';
import '@m3e/icons/outlined/save';
import '@m3e/icons/outlined/undo';

import type { DocumentSession } from '../useDocumentSession';
import { IconButton } from './IconButton';
import { PairedIconButtons } from './PairedIconButtons';

export function EditTools({ session }: { session: DocumentSession }) {
  return (
    <>
      <IconButton
        icon="save"
        label="Save"
        tooltip="Writes the edited source to the file (⌘S, Ctrl+S)"
        disabled={!session.canSave}
        onClick={session.save}
      />
      <PairedIconButtons
        actions={[
          {
            icon: 'undo',
            label: 'Undo',
            tooltip: 'Takes back the last edit',
            disabled: !session.canUndo,
            onClick: session.undo,
          },
          {
            icon: 'redo',
            label: 'Redo',
            tooltip: 'Puts back the edit that Undo took back',
            disabled: !session.canRedo,
            onClick: session.redo,
          },
        ]}
      />
    </>
  );
}
