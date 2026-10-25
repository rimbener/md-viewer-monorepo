import {
  canRedo,
  canUndo,
  emptyEditHistory,
  recordEdit,
  redoEdit,
  undoEdit,
  type EditHistory,
} from '../src/editHistory';

/** Types each text one second apart, so every edit is its own step. */
function typed(...texts: string[]): { history: EditHistory; text: string } {
  let history = emptyEditHistory();
  let text = texts[0];
  texts.slice(1).forEach((next, index) => {
    history = recordEdit(history, text, index * 2000);
    text = next;
  });
  return { history, text };
}

describe('recordEdit', () => {
  it('keeps one step per pause in the typing', () => {
    const { history } = typed('a', 'ab', 'abc');

    expect(history.past).toEqual(['a', 'ab']);
    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(false);
  });

  it('merges edits that come close together', () => {
    let history = recordEdit(emptyEditHistory(), 'a', 0);
    history = recordEdit(history, 'ab', 300);
    history = recordEdit(history, 'abc', 600);

    expect(history.past).toEqual(['a']);
  });

  it('keeps at most 100 steps', () => {
    let history = emptyEditHistory();
    for (let index = 0; index < 150; index += 1) {
      history = recordEdit(history, String(index), index * 2000);
    }

    expect(history.past).toHaveLength(100);
    expect(history.past[0]).toBe('50');
  });
});

describe('undoEdit and redoEdit', () => {
  it('walks back and forward through the steps', () => {
    const { history, text } = typed('a', 'ab', 'abc');

    const back = undoEdit(history, text);
    expect(back?.text).toBe('ab');
    const further = undoEdit(back!.history, back!.text);
    expect(further?.text).toBe('a');
    expect(undoEdit(further!.history, further!.text)).toBeNull();

    const forward = redoEdit(further!.history, further!.text);
    expect(forward?.text).toBe('ab');
    expect(redoEdit(forward!.history, forward!.text)?.text).toBe('abc');
  });

  it('drops the redo steps when a new edit follows an undo', () => {
    const { history, text } = typed('a', 'ab');
    const back = undoEdit(history, text)!;

    const branched = recordEdit(back.history, back.text, 500);

    expect(canRedo(branched)).toBe(false);
    // An undo ends the merge, so the edit after it is a step of its own.
    expect(branched.past).toEqual(['a']);
  });

  it('answers null with nothing to redo', () => {
    expect(redoEdit(emptyEditHistory(), 'a')).toBeNull();
  });
});
