import {
  DEFAULT_CHARACTERS,
  MAX_CHARACTERS,
  MIN_CHARACTERS,
  stepCharacters,
} from '../column';
import { Segment, SegmentedGroup } from './Segmented';

interface ColumnControlProps {
  characters: number;
  onChange: (characters: number) => void;
}

/** Narrower / reset / wider, as one segmented group. */
export function ColumnControl({ characters, onChange }: ColumnControlProps) {
  return (
    <SegmentedGroup>
      <Segment
        label="−"
        accessibilityLabel="Decrease line length"
        disabled={characters <= MIN_CHARACTERS}
        onPress={() => onChange(stepCharacters(characters, -1))}
      />
      <Segment
        label={`${characters}`}
        accessibilityLabel="Reset line length"
        wide
        disabled={characters === DEFAULT_CHARACTERS}
        onPress={() => onChange(DEFAULT_CHARACTERS)}
      />
      <Segment
        label="+"
        accessibilityLabel="Increase line length"
        disabled={characters >= MAX_CHARACTERS}
        onPress={() => onChange(stepCharacters(characters, 1))}
      />
    </SegmentedGroup>
  );
}
