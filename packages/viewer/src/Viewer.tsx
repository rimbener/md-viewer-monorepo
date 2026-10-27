/**
 * Markdown viewer: a folder tree of `.md` files on the left, the selected
 * document on the right. The platform it runs on comes in as a prop.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import { ColorSchemeProvider } from './components/ColorSchemeProvider';
import { DocumentPanel } from './components/DocumentPanel';
import { Sidebar } from './components/Sidebar';
import {
  applyLoadedHistory,
  canGoBack,
  canGoNext,
  currentHistoryPath,
  emptyFileHistory,
  recordVisit,
  retargetHistory,
  stepBack,
  stepNext,
  type FileHistory,
} from './fileHistory';
import { PlatformProvider, usePlatform, type Platform } from './platform';
import {
  loadFileHistory,
  loadFolderBookmark,
  loadLastFile,
  loadLastFolder,
  forgetRecentFolder,
  loadRecentFolders,
  loadSidebarVisible,
  moveFileHistory,
  rememberRecentFolder,
  saveFileHistory,
  saveFolderBookmark,
  saveLastFile,
  saveLastFolder,
  saveSidebarVisible,
} from './preferences';
import type { RecentFolder } from './recentFolders';
import {
  countFiles,
  findFile,
  replaceDirectory,
  scanDirectory,
  scanToFile,
} from './scanDirectory';
import { useTheme } from './theme';
import type { DirectoryNode, FileNode } from './types';

function Session() {
  const theme = useTheme();
  const platform = usePlatform();

  const [root, setRoot] = useState<DirectoryNode | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Same folder, new walk: the tree is otherwise only rebuilt when the path changes.
  const [scanNonce, setScanNonce] = useState(0);
  // Until the stored session has been read there is nothing to show but a
  // folder dialog that may turn out to be unnecessary.
  const [isRestoring, setIsRestoring] = useState(true);
  /** A stored file path waiting for the scan that can resolve it to a node. */
  const pendingFilePath = useRef<string | null>(null);
  // The tree shows by default; hiding it is how you get a full-width read.
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const hasChosenSidebar = useRef(false);
  const [history, setHistory] = useState(emptyFileHistory());
  const [historyFolder, setHistoryFolder] = useState<string | null>(null);
  const [recentFolders, setRecentFolders] = useState<readonly RecentFolder[]>(
    [],
  );
  // A stored list must not replace a folder opened while that read was in flight.
  const recentTicket = useRef(0);
  const isMounted = useRef(true);
  const historyRef = useRef(history);
  const revealTicket = useRef(0);
  const rootPathRef = useRef(rootPath);
  rootPathRef.current = rootPath;
  /** Set while a file from outside is on screen, so a folder restore cannot replace it. */
  const externalFile = useRef<string | null>(null);

  if (rootPath !== historyFolder) {
    setHistoryFolder(rootPath);
    setHistory(emptyFileHistory());
    historyRef.current = emptyFileHistory();
  }

  // The write stays out of the state updater, which React may call twice.
  const toggleSidebar = useCallback(() => {
    hasChosenSidebar.current = true;
    const next = !isSidebarVisible;
    setIsSidebarVisible(next);
    saveSidebarVisible(next);
  }, [isSidebarVisible]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const noteRecent = useCallback(
    (
      path: string,
      bookmark: string | null,
      replacedPath: string | null = null,
    ) => {
      const ticket = (recentTicket.current += 1);
      rememberRecentFolder(path, bookmark, replacedPath).then(folders => {
        if (isMounted.current && ticket === recentTicket.current) {
          setRecentFolders(folders);
        }
      });
    },
    [],
  );

  const removeRecentFolder = useCallback((folder: RecentFolder) => {
    const ticket = (recentTicket.current += 1);
    forgetRecentFolder(folder.path).then(folders => {
      if (isMounted.current && ticket === recentTicket.current) {
        setRecentFolders(folders);
      }
    });
  }, []);

  useEffect(() => {
    const ticket = (recentTicket.current += 1);
    loadRecentFolders().then(folders => {
      if (isMounted.current && ticket === recentTicket.current) {
        setRecentFolders(folders);
      }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadSidebarVisible().then(stored => {
      // Someone who toggled while the read was in flight outranks the store.
      if (!cancelled && stored !== null && !hasChosenSidebar.current) {
        setIsSidebarVisible(stored);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const beginFolder = useCallback(
    async (directory: string) => {
      const currentRoot = rootPathRef.current;
      const resume = currentHistoryPath(
        directory === currentRoot
          ? historyRef.current
          : await loadFileHistory(directory),
      );
      pendingFilePath.current = resume;
      setSelectedFile(null);
      saveLastFile(resume);
      if (externalFile.current !== null) {
        externalFile.current = null;
        platform.forgetOpenedFile();
      }
      setError(null);
      // The old tree would hide the spinner, and with it Cancel.
      if (directory !== currentRoot) {
        setRoot(null);
      }
      setRootPath(directory);
      saveLastFolder(directory);
      setScanNonce(previous => previous + 1);
    },
    [platform],
  );

  const chooseFolder = useCallback(async () => {
    try {
      const directory = await platform.askForFolder();
      if (directory === null) {
        return; // The user cancelled the dialog.
      }
      // The picker's grant is live now, which is the only moment a bookmark
      // for it can be made.
      platform.closeFolder();
      const bookmark = await platform.bookmarkFolder(directory);
      saveFolderBookmark(bookmark);
      noteRecent(directory, bookmark);
      await beginFolder(directory);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not open that folder.',
      );
    }
  }, [beginFolder, noteRecent, platform]);

  const selectRecentFolder = useCallback(
    async (folder: RecentFolder) => {
      if (folder.path === rootPathRef.current) {
        return;
      }
      try {
        const opened = await openRecentFolder(platform, folder);
        if (opened === null) {
          setError('Could not open that folder.');
          return;
        }
        saveFolderBookmark(opened.bookmark);
        noteRecent(opened.path, opened.bookmark, opened.replaced);
        await beginFolder(opened.path);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Could not open that folder.',
        );
      }
    },
    [beginFolder, noteRecent, platform],
  );

  const remember = useCallback(
    (next: FileHistory) => {
      if (next === historyRef.current) {
        return false;
      }
      historyRef.current = next;
      setHistory(next);
      if (rootPath !== null) {
        saveFileHistory(rootPath, next);
      }
      return true;
    },
    [rootPath],
  );

  const reveal = useCallback(
    (path: string) => {
      saveLastFile(path);
      const found = root === null ? null : findFile(root, path);
      if (found !== null) {
        setSelectedFile(found);
        return;
      }
      if (rootPath === null) {
        return;
      }
      const ticket = (revealTicket.current += 1);
      scanToFile(platform.readDir, rootPath, path)
        .then(tree => {
          if (ticket !== revealTicket.current) {
            return;
          }
          setRoot(tree);
          setSelectedFile(findFile(tree, path));
        })
        .catch(() => {});
    },
    [platform, root, rootPath],
  );

  const selectFile = useCallback(
    (file: FileNode) => {
      setSelectedFile(file);
      if (rootPath === null) {
        return;
      }
      saveLastFile(file.path);
      remember(recordVisit(historyRef.current, file.path));
    },
    [remember, rootPath],
  );

  const showOpenedFile = useCallback(
    (path: string) => {
      if (externalFile.current === path) {
        return;
      }
      externalFile.current = path;
      pendingFilePath.current = null;
      platform.closeFolder();
      const opened = treeForOpenedFile(path);
      setError(null);
      setIsScanning(false);
      setIsRestoring(false);
      setRootPath(null);
      setRoot(opened.root);
      setSelectedFile(opened.file);
    },
    [platform],
  );

  const goBack = useCallback(() => {
    const next = stepBack(historyRef.current);
    if (!remember(next)) {
      return;
    }
    const path = currentHistoryPath(next);
    if (path !== null) {
      reveal(path);
    }
  }, [remember, reveal]);

  const goNext = useCallback(() => {
    const next = stepNext(historyRef.current);
    if (!remember(next)) {
      return;
    }
    const path = currentHistoryPath(next);
    if (path !== null) {
      reveal(path);
    }
  }, [remember, reveal]);

  const reloadFolder = useCallback(() => {
    setScanNonce(previous => previous + 1);
  }, []);

  const selectDirectory = useCallback(
    (directory: DirectoryNode) => {
      if (rootPathRef.current === null) {
        return;
      }
      scanDirectory(platform.readDir, directory.path)
        .then(branch => {
          setRoot(current =>
            current === null ? current : replaceDirectory(current, branch),
          );
        })
        .catch(() => {});
    },
    [platform],
  );

  useEffect(() => {
    setSelectedFile(current => {
      if (current === null || root === null) {
        return current;
      }
      return findFile(root, current.path) === null ? null : current;
    });
  }, [root]);

  useEffect(() => {
    if (rootPath === null) {
      return;
    }
    let cancelled = false;
    const openedAt = pendingFilePath.current;
    loadFileHistory(rootPath).then(stored => {
      if (cancelled) {
        return;
      }
      const next = applyLoadedHistory(stored, historyRef.current, openedAt);
      if (next !== historyRef.current) {
        historyRef.current = next;
        setHistory(next);
      }
      if (next !== stored) {
        saveFileHistory(rootPath, next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [rootPath]);

  useEffect(() => {
    if (rootPath === null) {
      return;
    }

    let cancelled = false;
    const abort = new AbortController();
    setIsScanning(true);
    setError(null);

    const target = pendingFilePath.current;
    const walk =
      target === null
        ? scanDirectory(platform.readDir, rootPath, abort.signal)
        : scanToFile(platform.readDir, rootPath, target, abort.signal);

    walk
      .then(tree => {
        if (cancelled || externalFile.current !== null) {
          return;
        }
        setRoot(tree);

        // A restored file only becomes selectable once the tree holding it
        // exists, and it may have been deleted in the meantime.
        pendingFilePath.current = null;
        if (target !== null) {
          const restored = findFile(tree, target);
          if (restored !== null) {
            setSelectedFile(restored);
          }
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled && externalFile.current === null) {
          setRoot(null);
          setError(
            cause instanceof Error ? cause.message : 'Could not read folder.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsScanning(false);
        }
      });

    return () => {
      cancelled = true;
      abort.abort();
    };
  }, [platform, rootPath, scanNonce]);

  // Leaving rootPath stops the walk. The folder is forgotten so a folder too
  // large to read does not hang the next launch too.
  const cancelScan = useCallback(() => {
    pendingFilePath.current = null;
    platform.closeFolder();
    saveLastFolder(null);
    saveFolderBookmark(null);
    saveLastFile(null);
    setIsScanning(false);
    setRootPath(null);
    setRoot(null);
    setSelectedFile(null);
    chooseFolder();
  }, [chooseFolder, platform]);

  const fileCount = useMemo(() => (root ? countFiles(root) : 0), [root]);

  // A file from outside wins over the stored folder. With neither, ask for one.
  useEffect(() => {
    let cancelled = false;
    const stopWatch = platform.watchOpenedFile(path => {
      if (!cancelled) {
        showOpenedFile(path);
      }
    });

    (async () => {
      const opened = await platform.takeOpenedFile();
      if (cancelled || externalFile.current !== null) {
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
      if (cancelled || externalFile.current !== null) {
        return;
      }

      if (restored !== null && isUsable) {
        pendingFilePath.current = await loadLastFile();
        if (cancelled) {
          return;
        }
        if (externalFile.current !== null) {
          pendingFilePath.current = null;
          return;
        }
        setRootPath(restored.path);
        setIsRestoring(false);
        noteRecent(restored.path, restored.bookmark, restored.replaced);
        return;
      }

      setIsRestoring(false);
      if (platform.canOpenFolders) {
        chooseFolder();
      }
    })();

    return () => {
      cancelled = true;
      stopWatch();
    };
  }, [chooseFolder, noteRecent, platform, showOpenedFile]);

  return (
    <div
      style={
        {
          display: 'flex',
          height: '100%',
          backgroundColor: theme.background,
          color: theme.text,
          // Pressed buttons and focus rings read the palette through these.
          '--md-pressed': theme.hairline,
          '--md-focus': theme.accent,
        } as CSSProperties
      }
    >
      {isSidebarVisible ? (
        <Sidebar
          root={root}
          currentFolderPath={rootPath}
          recentFolders={recentFolders}
          selectedPath={selectedFile?.path ?? null}
          isScanning={isScanning || isRestoring}
          error={error}
          fileCount={fileCount}
          onChooseFolder={chooseFolder}
          onSelectRecentFolder={selectRecentFolder}
          onRemoveRecentFolder={removeRecentFolder}
          onReloadFolder={reloadFolder}
          onCancelScan={isScanning ? cancelScan : null}
          onSelectFile={selectFile}
          onSelectDirectory={selectDirectory}
        />
      ) : null}
      <DocumentPanel
        file={selectedFile}
        isSidebarVisible={isSidebarVisible}
        onToggleSidebar={toggleSidebar}
        canGoBack={canGoBack(history)}
        canGoNext={canGoNext(history)}
        onBack={goBack}
        onNext={goNext}
      />
    </div>
  );
}

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

/** One file, under its parent folder name. The parent is not read. */
function treeForOpenedFile(path: string): {
  root: DirectoryNode;
  file: FileNode;
} {
  const slash = path.lastIndexOf('/');
  const name = slash < 0 ? path : path.slice(slash + 1);
  const directoryPath = slash <= 0 ? '/' : path.slice(0, slash);
  const directorySlash = directoryPath.lastIndexOf('/');
  const directoryTail =
    directorySlash < 0
      ? directoryPath
      : directoryPath.slice(directorySlash + 1);
  const file: FileNode = { kind: 'file', name, path };
  return {
    file,
    root: {
      kind: 'directory',
      name: directoryTail.length > 0 ? directoryTail : directoryPath,
      path: directoryPath,
      children: [file],
    },
  };
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

type ViewerProps = {
  platform: Platform;
};

export function Viewer({ platform }: ViewerProps) {
  return (
    <PlatformProvider value={platform}>
      <ColorSchemeProvider>
        <Session />
      </ColorSchemeProvider>
    </PlatformProvider>
  );
}
