import { useCallback, useEffect, useRef, useState } from 'react';

type ChooseOptions = { save?: boolean };

export function useStoredPreference<T>(
  load: () => Promise<T | null>,
  save: (value: T) => void,
  initial: T,
): [
  value: T,
  choose: (next: T, options?: ChooseOptions) => void,
  setWithoutChoosing: (next: T) => void,
] {
  const [value, setValue] = useState(initial);
  const hasChosen = useRef(false);

  useEffect(() => {
    let cancelled = false;
    load().then(stored => {
      // A choice made while the read was in flight outranks the store.
      if (!cancelled && stored !== null && !hasChosen.current) {
        setValue(stored);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  // The write stays out of the state updater, which React may call twice.
  const choose = useCallback(
    (next: T, options?: ChooseOptions) => {
      hasChosen.current = true;
      setValue(next);
      if (options?.save !== false) {
        save(next);
      }
    },
    [save],
  );

  return [value, choose, setValue];
}
