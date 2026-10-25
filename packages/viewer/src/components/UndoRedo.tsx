import { Segment, SegmentedGroup } from './Segmented';

interface UndoRedoProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

/** Undo and Redo through the edits made to the open document. */
export function UndoRedo({ canUndo, canRedo, onUndo, onRedo }: UndoRedoProps) {
  return (
    <SegmentedGroup>
      <Segment
        label="↶"
        accessibilityLabel="Undo"
        title="Takes back the last edit"
        fontSize={16}
        disabled={!canUndo}
        onPress={onUndo}
      />
      <Segment
        label="↷"
        accessibilityLabel="Redo"
        title="Puts back the edit that Undo took back"
        fontSize={16}
        disabled={!canRedo}
        onPress={onRedo}
      />
    </SegmentedGroup>
  );
}
