import { useCallback, useEffect, useRef, useState } from 'react';

import { currentHistoryPath, retargetHistory } from './fileHistory';
import {
  canStepBack,
  canStepNext,
  initialFolderSession,
  isBusy,
  reduceFolderSession,
  type FolderEvent,
  type FolderSession,
} from './folderSession';
import { usePlatform, type Platform } from './platform';
import {
  forgetRecentFolder,
  loadFileHistory,
  loadFolderBookmark,
  loadLastFile,
  loadLastFolder,
  loadRecentFolders,
  moveFileHistory,
  rememberRecentFolder,
  saveFileHistory,
  saveFolderBookmark,
  saveLastFile,
  saveLastFolder,
} from './preferences';
import type { RecentFolder } from './recentFolders';
import { scanDirectory, scanToFile } from './scanDirectory';
import type { DirectoryNode, FileNode } from './types';

function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

export function useFolderSession(onFileChosen: () => void) {
  const platform = usePlatform();
  const [state, setState] = useState(initialFolderSession);
  const stateRef = useRef(state);

  // Async work must see the outcome of an event at once, before React renders it.
  const send = useCallback((event: FolderEvent): FolderSession => {
    const next = reduceFolderSession(stateRef.current, event);
    stateRef.current = next;
    setState(next);
    return next;
  }, []);

  const track = useCallback(
    (load: () => Promise<readonly RecentFolder[]>) => {
      const { recentId } = send({ type: 'recentAsked' });
      load().then(folders =>
        send({ type: 'recentLoaded', id: recentId, folders }),
      );
    },
    [send],
  );

  const noteRecent = useCallback(
    (path: string, bookmark: string | null, replaced: string | null = null) =>
      track(() => rememberRecentFolder(path, bookmark, replaced)),
    [track],
  );

  const removeRecentFolder = useCallback(
    (folder: RecentFolder) => track(() => forgetRecentFolder(folder.path)),
    [track],
  );

  useEffect(() => track(loadRecentFolders), [track]);

  const beginFolder = useCallback(
    async (directory: string) => {
      const current = stateRef.current;
      const resume = currentHistoryPath(
        directory === current.folder
          ? current.history
          : await loadFileHistory(directory),
      );
      saveLastFile(resume);
      if (stateRef.current.phase === 'external') {
        platform.forgetOpenedFile();
      }
      send({ type: 'picked', folder: directory, resume });
      saveLastFolder(directory);
    },
    [platform, send],
  );

  const chooseFolder = useCallback(async () => {
    try {
      const directory = await platform.askForFolder();
      if (directory === null) {
        return;
      }
      // The picker's grant is live now, which is the only moment a bookmark
      // for it can be made.
      platform.closeFolder();
      const bookmark = await platform.bookmarkFolder(directory);
      saveFolderBookmark(bookmark);
      noteRecent(directory, bookmark);
      await beginFolder(directory);
    } catch (cause) {
      const message = messageOf(cause, 'Could not open that folder.');
      send({ type: 'pickFailed', message });
    }
  }, [beginFolder, noteRecent, platform, send]);

  const selectRecentFolder = useCallback(
    async (folder: RecentFolder) => {
      if (folder.path === stateRef.current.folder) {
        return;
      }
      try {
        const opened = await openRecentFolder(platform, folder);
        if (opened === null) {
          send({ type: 'pickFailed', message: 'Could not open that folder.' });
          return;
        }
        saveFolderBookmark(opened.bookmark);
        noteRecent(opened.path, opened.bookmark, opened.replaced);
        await beginFolder(opened.path);
      } catch (cause) {
        const message = messageOf(cause, 'Could not open that folder.');
        send({ type: 'pickFailed', message });
      }
    },
    [beginFolder, noteRecent, platform, send],
  );

  const persistChoice = useCallback(
    (before: FolderSession, after: FolderSession, path: string) => {
      onFileChosen();
      if (after.folder === null) {
        return;
      }
      saveLastFile(path);
      if (after.history !== before.history) {
        saveFileHistory(after.folder, after.history);
      }
    },
    [onFileChosen],
  );

  const selectFile = useCallback(
    (file: FileNode) => {
      const before = stateRef.current;
      persistChoice(before, send({ type: 'selected', file }), file.path);
    },
    [persistChoice, send],
  );

  const step = useCallback(
    (direction: 'back' | 'next') => {
      const before = stateRef.current;
      const after = send({ type: 'stepped', direction });
      const path = currentHistoryPath(after.history);
      if (after === before || path === null) {
        return;
      }
      if (after.folder !== null) {
        saveFileHistory(after.folder, after.history);
      }
      saveLastFile(path);
      const request = after.reveal;
      if (request === null) {
        return;
      }
      scanToFile(platform.readDir, request.folder, request.path)
        .then(tree => send({ type: 'revealed', id: request.id, tree }))
        .catch(() => {});
    },
    [platform, send],
  );

  const goBack = useCallback(() => step('back'), [step]);
  const goNext = useCallback(() => step('next'), [step]);

  const createFile = useCallback(
    async (parent: string, name: string) => {
      const folder = stateRef.current.folder;
      if (folder === null || platform.createFile === undefined) {
        throw new Error('No folder is open.');
      }
      const path = `${parent}/${name}`;
      await platform.createFile(path, '');
      const tree = await scanToFile(platform.readDir, folder, path);
      const before = stateRef.current;
      const after = send({ type: 'created', folder, path, tree });
      if (after !== before && after.selected?.path === path) {
        persistChoice(before, after, path);
      }
    },
    [persistChoice, platform, send],
  );

  const reloadFolder = useCallback(() => {
    send({ type: 'reloaded' });
  }, [send]);

  const selectDirectory = useCallback(
    (directory: DirectoryNode) => {
      if (stateRef.current.folder === null) {
        return;
      }
      scanDirectory(platform.readDir, directory.path)
        .then(branch => send({ type: 'branchScanned', branch }))
        .catch(() => {});
    },
    [platform, send],
  );

  const { historyLoad, scan } = state;

  useEffect(() => {
    if (historyLoad === null) {
      return;
    }
    loadFileHistory(historyLoad.folder).then(stored => {
      const before = stateRef.current;
      const after = send({ type: 'historyLoaded', id: historyLoad.id, stored });
      if (after !== before && after.history !== stored) {
        saveFileHistory(historyLoad.folder, after.history);
      }
    });
  }, [historyLoad, send]);

  useEffect(() => {
    if (scan === null) {
      return;
    }
    const abort = new AbortController();
    const walk =
      scan.target === null
        ? scanDirectory(platform.readDir, scan.folder, abort.signal)
        : scanToFile(platform.readDir, scan.folder, scan.target, abort.signal);
    // An aborted walk still resolves, with a partial tree.
    walk
      .then(tree => {
        if (!abort.signal.aborted) {
          send({ type: 'scanned', id: scan.id, tree });
        }
      })
      .catch((cause: unknown) => {
        if (!abort.signal.aborted) {
          const message = messageOf(cause, 'Could not read folder.');
          send({ type: 'scanFailed', id: scan.id, message });
        }
      });
    return () => abort.abort();
  }, [platform, scan, send]);

  // Leaving the scan stops the walk. The folder is forgotten so a folder too
  // large to read does not hang the next launch too.
  const cancelScan = useCallback(() => {
    const before = stateRef.current;
    if (send({ type: 'cancelled' }) === before) {
      return;
    }
    platform.closeFolder();
    saveLastFolder(null);
    saveFolderBookmark(null);
    saveLastFile(null);
    chooseFolder();
  }, [chooseFolder, platform, send]);

  const showOpenedFile = useCallback(
    (path: string) => {
      const before = stateRef.current;
      if (send({ type: 'openedFromOutside', path }) !== before) {
        platform.closeFolder();
      }
    },
    [platform, send],
  );

  // A file from outside wins over the stored folder. With neither, ask for one.
  useEffect(() => {
    let cancelled = false;
    const isRestoring = () =>
      !cancelled && stateRef.current.phase === 'restoring';
    const stopWatch = platform.watchOpenedFile(path => {
      if (!cancelled) {
        showOpenedFile(path);
      }
    });

    (async () => {
      const opened = await platform.takeOpenedFile();
      if (!isRestoring()) {
        return;
      }
      if (opened !== null) {
        showOpenedFile(opened);
        return;
      }

      const restored = await restoreFolder(platform);
      const folder = restored?.path ?? null;
      const isUsable =
        folder !== null && (await folderExists(platform, folder));
      if (!isRestoring()) {
        return;
      }

      if (restored !== null && isUsable) {
        const target = await loadLastFile();
        if (!isRestoring()) {
          return;
        }
        send({ type: 'restored', folder: restored.path, target });
        noteRecent(restored.path, restored.bookmark, restored.replaced);
        return;
      }

      send({ type: 'nothingRestored' });
      if (platform.canOpenFolders) {
        chooseFolder();
      }
    })();

    return () => {
      cancelled = true;
      stopWatch();
    };
  }, [chooseFolder, noteRecent, platform, send, showOpenedFile]);

  return {
    root: state.tree,
    folder: state.folder,
    selectedFile: state.selected,
    recentFolders: state.recent,
    isBusy: isBusy(state),
    error: state.error,
    canGoBack: canStepBack(state),
    canGoNext: canStepNext(state),
    cancelScan: state.phase === 'scanning' ? cancelScan : null,
    chooseFolder,
    selectRecentFolder,
    removeRecentFolder,
    reloadFolder,
    selectFile,
    selectDirectory,
    createFile,
    goBack,
    goNext,
  };
}

export type FolderSessionControls = ReturnType<typeof useFolderSession>;

type OpenedRecent = {
  path: string;
  bookmark: string | null;
  /** The path a bookmark left when the folder had moved. */
  replaced: string | null;
};

/**
 * The folder of the last session, with its access restored. The bookmark is
 * the authority on where the folder is, because it follows a folder that moved;
 * the stored path is the fallback for a platform that never made one.
 */
async function restoreFolder(platform: Platform): Promise<OpenedRecent | null> {
  const stored = await loadLastFolder();
  const bookmark = await loadFolderBookmark();
  if (bookmark === null) {
    return stored === null
      ? null
      : { path: stored, bookmark: null, replaced: null };
  }

  const opened = await openFolder(platform, bookmark);
  if (opened === null) {
    return stored === null ? null : { path: stored, bookmark, replaced: null };
  }
  let replaced: string | null = null;
  if (stored !== null && opened.path !== stored) {
    saveLastFolder(opened.path);
    await retargetFolderFiles(stored, opened.path);
    replaced = stored;
  }
  let grant: string | null = bookmark;
  if (opened.isStale) {
    grant = await platform.bookmarkFolder(opened.path);
    saveFolderBookmark(grant);
  }
  return { path: opened.path, bookmark: grant, replaced };
}

/** Opens a folder from the recent menu. Null when that folder is gone. */
async function openRecentFolder(
  platform: Platform,
  folder: RecentFolder,
): Promise<OpenedRecent | null> {
  if (folder.bookmark !== null) {
    const opened = await openFolder(platform, folder.bookmark);
    if (opened !== null) {
      let bookmark: string | null = folder.bookmark;
      let replaced: string | null = null;
      if (opened.path !== folder.path) {
        replaced = folder.path;
        await retargetFolderFiles(folder.path, opened.path);
      }
      if (opened.isStale) {
        bookmark = await platform.bookmarkFolder(opened.path);
      }
      return { path: opened.path, bookmark, replaced };
    }
  }
  if (!(await folderExists(platform, folder.path))) {
    return null;
  }
  platform.closeFolder();
  return { path: folder.path, bookmark: folder.bookmark, replaced: null };
}

/** Rewrites the open file and its history after a bookmark follows a move. */
async function retargetFolderFiles(from: string, to: string): Promise<void> {
  const last = await loadLastFile();
  if (last !== null && last.startsWith(`${from}/`)) {
    saveLastFile(`${to}${last.slice(from.length)}`);
  }
  const moved = retargetHistory(await loadFileHistory(from), from, to);
  if (moved.paths.length > 0) {
    await moveFileHistory(from, to, moved);
  }
}

/** Platform calls are best-effort: a failure means the folder is not usable. */
async function openFolder(platform: Platform, bookmark: string) {
  try {
    return await platform.openFolder(bookmark);
  } catch {
    return null;
  }
}

async function folderExists(platform: Platform, path: string) {
  try {
    return await platform.folderExists(path);
  } catch {
    return false;
  }
}
