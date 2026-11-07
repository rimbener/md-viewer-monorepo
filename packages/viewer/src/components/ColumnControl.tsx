import {
  DEFAULT_CHARACTERS,
  MAX_CHARACTERS,
  MIN_CHARACTERS,
  stepCharacters,
} from '../column';
import { StepControl } from './StepControl';

interface ColumnControlProps {
  characters: number;
  onChange: (characters: number) => void;
}

/** Narrower / reset / wider, as one button group. */
export function ColumnControl({ characters, onChange }: ColumnControlProps) {
  return (
    <StepControl
      value={`${characters}`}
      decreaseLabel="Decrease line length"
      resetLabel="Reset line length"
      increaseLabel="Increase line length"
      canDecrease={characters > MIN_CHARACTERS}
      canReset={characters !== DEFAULT_CHARACTERS}
      canIncrease={characters < MAX_CHARACTERS}
      onDecrease={() => onChange(stepCharacters(characters, -1))}
      onReset={() => onChange(DEFAULT_CHARACTERS)}
      onIncrease={() => onChange(stepCharacters(characters, 1))}
    />
  );
}
