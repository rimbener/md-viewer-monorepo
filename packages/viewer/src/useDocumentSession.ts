import { useCallback, useEffect, useReducer } from 'react';

import {
  canRedoIn,
  canUndoIn,
  draftOf,
  initialDocumentSession,
  isTooLarge,
  reduceDocumentSession,
  renderedOf,
  textOf,
} from './documentSession';
import { usePlatform } from './platform';

// Long enough that a run of keystrokes parses once, short enough to still read as live.
const REPARSE_DELAY_MS = 150;

function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

export function useDocumentSession(path: string | null) {
  const platform = usePlatform();
  const [state, dispatch] = useReducer(
    reduceDocumentSession,
    initialDocumentSession,
  );
  const draft = draftOf(state);
  const rendered = renderedOf(state);

  useEffect(() => {
    dispatch({ type: 'opened', path });
    if (path === null) {
      return;
    }

    let cancelled = false;
    let ticket = 0;
    let reread: ReturnType<typeof setTimeout> | null = null;

    const issue = (isReload: boolean) => {
      const t = ++ticket;
      const isCurrent = () => !cancelled && t === ticket;
      platform
        .readFile(path)
        .then(text => {
          if (isCurrent()) {
            dispatch({ type: isReload ? 'reread' : 'read', path, text });
          }
        })
        .catch((cause: unknown) => {
          if (isCurrent() && !isReload) {
            const message = messageOf(cause, 'Could not read the file.');
            dispatch({ type: 'readFailed', path, message });
          }
        });
    };

    issue(false);

    const stop = platform.watchFile(path, () => {
      if (reread !== null) {
        clearTimeout(reread);
      }
      reread = setTimeout(() => {
        reread = null;
        issue(true);
      }, REPARSE_DELAY_MS);
    });

    return () => {
      cancelled = true;
      stop();
      if (reread !== null) {
        clearTimeout(reread);
      }
    };
  }, [path, platform]);

  // A path switch or a new draft restarts the wait, so a pending reparse never outlives its text.
  useEffect(() => {
    if (state.settled === draft) {
      return;
    }
    const timer = setTimeout(
      () => dispatch({ type: 'settled' }),
      REPARSE_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [state.path, state.settled, draft]);

  const edit = useCallback(
    (text: string) => dispatch({ type: 'edited', text, at: Date.now() }),
    [],
  );
  const replace = useCallback(
    (text: string) => dispatch({ type: 'replaced', text }),
    [],
  );
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);

  const savedPath = state.path;
  const save = useCallback(() => {
    const write = platform.writeFile;
    if (savedPath === null || write === undefined || draft === null) {
      return;
    }
    const contents = draft;
    dispatch({ type: 'saveStarted' });
    write(savedPath, contents)
      .then(() => dispatch({ type: 'saved', path: savedPath, contents }))
      .catch((cause: unknown) => {
        const message = messageOf(cause, 'Could not save the file.');
        dispatch({ type: 'saveFailed', path: savedPath, message });
      });
  }, [platform, savedPath, draft]);

  return {
    text: textOf(state),
    rendered,
    isTruncated: isTooLarge(rendered),
    isLoading: state.isLoading,
    error: state.error,
    isDirty: draft !== null,
    diskChanged: state.diskChanged,
    isSaving: state.isSaving,
    saveError: state.saveError,
    canUndo: canUndoIn(state),
    canRedo: canRedoIn(state),
    edit,
    replace,
    undo,
    redo,
    save,
  };
}
