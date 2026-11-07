import '@m3e/icons/outlined/redo';
import '@m3e/icons/outlined/undo';

import { PairedIconButtons } from './PairedIconButtons';

interface UndoRedoProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

/** Undo and Redo through the edits made to the open document. */
export function UndoRedo({ canUndo, canRedo, onUndo, onRedo }: UndoRedoProps) {
  return (
    <PairedIconButtons
      actions={[
        {
          icon: 'undo',
          accessibilityLabel: 'Undo',
          title: 'Takes back the last edit',
          disabled: !canUndo,
          onPress: onUndo,
        },
        {
          icon: 'redo',
          accessibilityLabel: 'Redo',
          title: 'Puts back the edit that Undo took back',
          disabled: !canRedo,
          onPress: onRedo,
        },
      ]}
    />
  );
}
