import { useCallback, useEffect, useMemo, useReducer } from 'react';

import {
  initialFindSession,
  reduceFindSession,
  replaceOneIn,
  stepActive,
} from './findSession';
import { findMatches, MAX_MATCHES, replaceAll as replaceAllIn } from './search';

type FindSessionOptions = {
  path: string | null;
  text: string | null;
  inSource: boolean;
  replace: (text: string) => void;
};

function ignoreCount(): void {}

export function useFindSession({
  path,
  text,
  inSource,
  replace,
}: FindSessionOptions) {
  const [state, dispatch] = useReducer(reduceFindSession, initialFindSession);
  const { query, replacement, active } = state;

  useEffect(() => {
    dispatch({ type: 'reset' });
  }, [path]);

  const sourceMatches = useMemo(
    () => (inSource ? findMatches(text ?? '', query, MAX_MATCHES) : null),
    [inSource, text, query],
  );
  useEffect(() => {
    if (sourceMatches !== null) {
      dispatch({
        type: 'counted',
        count: sourceMatches.starts.length,
        capped: sourceMatches.more,
        starts: sourceMatches.starts,
      });
    }
  }, [sourceMatches]);

  const setQuery = useCallback(
    (next: string) => dispatch({ type: 'queried', query: next }),
    [],
  );
  const setReplacement = useCallback(
    (next: string) =>
      dispatch({ type: 'replacementChanged', replacement: next }),
    [],
  );
  const setActive = useCallback(
    (next: number) => dispatch({ type: 'chose', active: next }),
    [],
  );
  const focusReplace = useCallback(
    () => dispatch({ type: 'replaceAsked' }),
    [],
  );
  const replaceFocused = useCallback(
    () => dispatch({ type: 'replaceFocused' }),
    [],
  );
  const onCount = useCallback(
    (count: number, capped: boolean) =>
      dispatch({ type: 'counted', count, capped }),
    [],
  );

  const replaceOne = useCallback(() => {
    const start = sourceMatches?.starts[active];
    if (start === undefined || text === null) {
      return;
    }
    const next = replaceOneIn(text, start, query, replacement);
    // Unchanged text brings no new count, so a resume point would linger.
    if (next.text === text) {
      dispatch({
        type: 'chose',
        active: stepActive(active, 1, sourceMatches!.starts.length),
      });
      return;
    }
    dispatch({ type: 'replacedOne', resumeAt: next.resumeAt });
    replace(next.text);
  }, [sourceMatches, active, text, query, replacement, replace]);

  const replaceAll = useCallback(() => {
    if (text !== null) {
      replace(replaceAllIn(text, query, replacement).text);
    }
  }, [text, query, replacement, replace]);

  const sourceMarks = useMemo(
    () =>
      sourceMatches === null || query.length === 0
        ? null
        : { query, starts: sourceMatches.starts, active },
    [sourceMatches, query, active],
  );

  return {
    query,
    replacement,
    active,
    count: state.count,
    capped: state.capped,
    replaceFocusKey: state.replaceFocusKey,
    setQuery,
    setReplacement,
    setActive,
    focusReplace,
    replaceFocused,
    replaceOne,
    replaceAll,
    sourceMarks,
    previewFind: {
      query: inSource ? '' : query,
      active,
      onCount: inSource ? ignoreCount : onCount,
    },
  };
}
