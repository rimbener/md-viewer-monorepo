import { useCallback, useEffect, useReducer, useRef } from 'react';

import {
  canRedoIn,
  canUndoIn,
  diskChangedIn,
  draftOf,
  initialDocumentSession,
  isTooLarge,
  reduceDocumentSession,
  renderedOf,
  textOf,
} from './documentSession';
import { usePlatform } from './platform';
import { isHttpUrl } from './url';

// Long enough that a run of keystrokes parses once, short enough to still read as live.
const REPARSE_DELAY_MS = 150;

function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

export type DocumentControls = ReturnType<typeof useDocumentSession>;

type WriteLog = { begun: number; ended: number; waiting: (() => void)[] };

function writeLog(logs: Map<string, WriteLog>, path: string): WriteLog {
  let log = logs.get(path);
  if (log === undefined) {
    log = { begun: 0, ended: 0, waiting: [] };
    logs.set(path, log);
  }
  return log;
}

export function useDocumentSession(path: string | null) {
  const platform = usePlatform();
  const [state, dispatch] = useReducer(
    reduceDocumentSession,
    initialDocumentSession,
  );
  const draft = draftOf(state);
  const rendered = renderedOf(state);
  // A read that overlaps a save can hold the text from before it, or half of it.
  const writes = useRef(new Map<string, WriteLog>());

  useEffect(() => {
    dispatch({ type: 'opened', path });
    if (path === null) {
      return;
    }

    let cancelled = false;
    let issued = 0;
    let shown = 0;
    let pending = 0;
    let reread: ReturnType<typeof setTimeout> | null = null;

    // Reads can end out of order: only a newer result replaces the text, and a
    // failure shows only when no read gave the file and none is left to try.
    const issue = (isReload: boolean) => {
      const t = ++issued;
      const log = writeLog(writes.current, path);
      const begunAtStart = log.begun;
      // A read that overlapped a save is read again once no save runs.
      const readAgainIfWritten = () => {
        if (log.begun === begunAtStart && log.ended === log.begun) {
          return false;
        }
        pending += 1;
        const retry = () => {
          pending -= 1;
          if (!cancelled) {
            issue(isReload);
          }
        };
        if (log.ended === log.begun) {
          retry();
        } else {
          log.waiting.push(retry);
        }
        return true;
      };
      pending += 1;
      platform
        .readFile(path)
        .then(text => {
          if (cancelled || readAgainIfWritten()) {
            return;
          }
          if (t > shown) {
            shown = t;
            dispatch({ type: isReload ? 'reread' : 'read', path, text });
          }
        })
        .catch((cause: unknown) => {
          if (cancelled || readAgainIfWritten()) {
            return;
          }
          if (shown === 0 && pending === 1) {
            const message = messageOf(cause, 'Could not read the file.');
            dispatch({ type: 'readFailed', path, message });
          }
        })
        .finally(() => {
          pending -= 1;
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
    const log = writeLog(writes.current, savedPath);
    log.begun += 1;
    dispatch({ type: 'saveStarted' });
    write(savedPath, contents)
      .then(() => dispatch({ type: 'saved', path: savedPath, contents }))
      .catch((cause: unknown) => {
        const message = messageOf(cause, 'Could not save the file.');
        dispatch({ type: 'saveFailed', path: savedPath, message });
      })
      .finally(() => {
        log.ended += 1;
        if (log.ended === log.begun) {
          log.waiting.splice(0).forEach(retry => retry());
        }
      });
  }, [platform, savedPath, draft]);

  return {
    text: textOf(state),
    rendered,
    isTruncated: isTooLarge(rendered),
    isLoading: state.isLoading,
    error: state.error,
    isDirty: draft !== null,
    diskChanged: diskChangedIn(state),
    isSaving: state.isSaving,
    canSave:
      draft !== null &&
      !state.isLoading &&
      !state.isSaving &&
      platform.writeFile !== undefined &&
      savedPath !== null &&
      !isHttpUrl(savedPath),
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
