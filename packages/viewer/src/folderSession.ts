import {
  applyLoadedHistory,
  canGoBack,
  canGoNext,
  currentHistoryPath,
  emptyFileHistory,
  recordVisit,
  stepBack,
  stepNext,
  type FileHistory,
} from './fileHistory';
import type { RecentFolder } from './recentFolders';
import { findFile, replaceDirectory } from './scanDirectory';
import type { DirectoryNode, FileNode } from './types';

type FolderPhase =
  'restoring' | 'idle' | 'scanning' | 'open' | 'failed' | 'external';

interface ScanRequest {
  id: number;
  folder: string;
  target: string | null;
}

interface HistoryRequest {
  id: number;
  folder: string;
  openedAt: string | null;
}

interface RevealRequest {
  id: number;
  folder: string;
  path: string;
}

// An async result carries the id of its request; a result for any other id is stale.
export interface FolderSession {
  phase: FolderPhase;
  folder: string | null;
  tree: DirectoryNode | null;
  selected: FileNode | null;
  // A stored file path that only the next scan can resolve to a node.
  pending: string | null;
  history: FileHistory;
  error: string | null;
  opened: string | null;
  recent: readonly RecentFolder[];
  scan: ScanRequest | null;
  historyLoad: HistoryRequest | null;
  reveal: RevealRequest | null;
  recentId: number;
  lastId: number;
}

export type FolderEvent =
  | { type: 'restored'; folder: string; target: string | null }
  | { type: 'nothingRestored' }
  | { type: 'picked'; folder: string; resume: string | null }
  | { type: 'pickFailed'; message: string }
  | { type: 'reloaded' }
  | { type: 'scanned'; id: number; tree: DirectoryNode }
  | { type: 'scanFailed'; id: number; message: string }
  | { type: 'cancelled' }
  | { type: 'openedFromOutside'; path: string }
  | { type: 'historyLoaded'; id: number; stored: FileHistory }
  | { type: 'selected'; file: FileNode }
  | { type: 'stepped'; direction: 'back' | 'next' }
  | { type: 'revealed'; id: number; tree: DirectoryNode }
  | { type: 'created'; folder: string; path: string; tree: DirectoryNode }
  | { type: 'branchScanned'; branch: DirectoryNode }
  | { type: 'recentAsked' }
  | { type: 'recentLoaded'; id: number; folders: readonly RecentFolder[] };

export const initialFolderSession: FolderSession = {
  phase: 'restoring',
  folder: null,
  tree: null,
  selected: null,
  pending: null,
  history: emptyFileHistory(),
  error: null,
  opened: null,
  recent: [],
  scan: null,
  historyLoad: null,
  reveal: null,
  recentId: 0,
  lastId: 0,
};

export function isBusy(state: FolderSession): boolean {
  return state.phase === 'scanning' || state.phase === 'restoring';
}

export function canStepBack(state: FolderSession): boolean {
  return canGoBack(state.history);
}

export function canStepNext(state: FolderSession): boolean {
  return canGoNext(state.history);
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

function withTree(
  state: FolderSession,
  tree: DirectoryNode | null,
): FolderSession {
  const { selected } = state;
  const isGone =
    selected !== null &&
    tree !== null &&
    findFile(tree, selected.path) === null;
  return { ...state, tree, selected: isGone ? null : selected };
}

function select(state: FolderSession, file: FileNode): FolderSession {
  return {
    ...state,
    selected: file,
    reveal: null,
    history:
      state.folder === null
        ? state.history
        : recordVisit(state.history, file.path),
  };
}

function scanning(
  state: FolderSession,
  folder: string,
  pending: string | null,
): FolderSession {
  const scanId = state.lastId + 1;
  const started: FolderSession = {
    ...state,
    phase: 'scanning',
    folder,
    pending,
    error: null,
    scan: { id: scanId, folder, target: pending },
    lastId: scanId,
  };
  if (folder === state.folder) {
    return started;
  }
  const historyId = scanId + 1;
  return {
    ...started,
    tree: null,
    history: emptyFileHistory(),
    historyLoad: { id: historyId, folder, openedAt: pending },
    reveal: null,
    lastId: historyId,
  };
}

function closed(state: FolderSession): FolderSession {
  return {
    ...state,
    folder: null,
    tree: null,
    selected: null,
    pending: null,
    history: emptyFileHistory(),
    scan: null,
    historyLoad: null,
    reveal: null,
  };
}

function step(state: FolderSession, direction: 'back' | 'next'): FolderSession {
  const history = (direction === 'back' ? stepBack : stepNext)(state.history);
  const path = currentHistoryPath(history);
  if (history === state.history || path === null) {
    return state;
  }
  const moved = { ...state, history, reveal: null };
  const found = state.tree === null ? null : findFile(state.tree, path);
  if (found !== null) {
    return { ...moved, selected: found };
  }
  if (state.folder === null) {
    return moved;
  }
  const id = state.lastId + 1;
  return {
    ...moved,
    reveal: { id, folder: state.folder, path },
    lastId: id,
  };
}

function scanned(state: FolderSession, tree: DirectoryNode): FolderSession {
  const target = state.scan?.target ?? null;
  const next: FolderSession = {
    ...withTree(state, tree),
    phase: 'open',
    pending: null,
    scan: null,
  };
  // The restored file may have been deleted since the last session.
  const restored = target === null ? null : findFile(tree, target);
  return restored === null ? next : { ...next, selected: restored };
}

export function reduceFolderSession(
  state: FolderSession,
  event: FolderEvent,
): FolderSession {
  switch (event.type) {
    case 'restored':
      return state.phase === 'restoring'
        ? scanning(state, event.folder, event.target)
        : state;
    case 'nothingRestored':
      return state.phase === 'restoring' ? { ...state, phase: 'idle' } : state;
    case 'picked':
      return {
        ...scanning(state, event.folder, event.resume),
        selected: null,
        opened: null,
      };
    case 'pickFailed':
      return { ...state, error: event.message };
    case 'reloaded':
      return state.folder === null
        ? state
        : scanning(state, state.folder, state.pending);
    case 'scanned':
      return state.scan?.id === event.id ? scanned(state, event.tree) : state;
    case 'scanFailed':
      return state.scan?.id === event.id
        ? {
            ...state,
            phase: 'failed',
            tree: null,
            error: event.message,
            scan: null,
          }
        : state;
    case 'cancelled':
      return state.phase === 'scanning'
        ? { ...closed(state), phase: 'idle' }
        : state;
    case 'openedFromOutside': {
      if (state.opened === event.path) {
        return state;
      }
      const { root, file } = treeForOpenedFile(event.path);
      return {
        ...closed(state),
        phase: 'external',
        opened: event.path,
        tree: root,
        selected: file,
        error: null,
      };
    }
    case 'historyLoaded':
      return state.historyLoad?.id === event.id
        ? {
            ...state,
            history: applyLoadedHistory(
              event.stored,
              state.history,
              state.historyLoad.openedAt,
            ),
            historyLoad: null,
          }
        : state;
    case 'selected':
      return select(state, event.file);
    case 'stepped':
      return step(state, event.direction);
    case 'revealed':
      return state.reveal?.id === event.id
        ? {
            ...state,
            tree: event.tree,
            selected: findFile(event.tree, state.reveal.path),
            reveal: null,
          }
        : state;
    case 'created': {
      if (event.folder !== state.folder) {
        return state;
      }
      const next = withTree(state, event.tree);
      const created = findFile(event.tree, event.path);
      return created === null ? next : select(next, created);
    }
    case 'branchScanned':
      return state.tree === null
        ? state
        : withTree(state, replaceDirectory(state.tree, event.branch));
    case 'recentAsked':
      return { ...state, recentId: state.lastId + 1, lastId: state.lastId + 1 };
    case 'recentLoaded':
      return event.id === state.recentId
        ? { ...state, recent: event.folders }
        : state;
  }
}
