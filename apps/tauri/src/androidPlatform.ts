/**
 * The viewer on Android. Tauri's dialog cannot pick a folder there, and its fs
 * plugin cannot list a granted folder, so every read and write goes through
 * the Storage Access Framework. As on the web, a folder is addressed as
 * `/<folder name>/…`, and a second folder with the same name gets
 * `/<folder name> (2)`. A bookmark holds the path and the tree URI.
 * A file opened with the app or shared to it arrives as text and lives at
 * `/<file name>`, read-only: Android grants no lasting access to write it.
 */

import { openUrl } from '@tauri-apps/plugin-opener';

import type {
  DirectoryEntry,
  OpenedFolder,
  Platform,
} from '@md-viewer/viewer/platform';

import type { Saf, SafFolder, SafShared } from './saf';

/** How often an open file is checked for a change. */
const WATCH_INTERVAL_MS = 1000;

type Root = { tree: string; root: string };

type Bookmark = { path: string; tree: string };

function parseBookmark(bookmark: string): Bookmark | null {
  try {
    const value: unknown = JSON.parse(bookmark);
    if (
      typeof value === 'object' &&
      value !== null &&
      'path' in value &&
      'tree' in value &&
      typeof value.path === 'string' &&
      value.path.startsWith('/') &&
      typeof value.tree === 'string'
    ) {
      return { path: value.path, tree: value.tree };
    }
  } catch {
    // Not a bookmark this platform wrote.
  }
  return null;
}

function blobFrom(data: string, mimeType: string): Blob {
  const bytes = Uint8Array.from(atob(data), char => char.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

/** `/name.md`, then `/name (2).md`, and so on, past every taken path. */
function freePath(name: string, isTaken: (path: string) => boolean): string {
  const clean = name.replaceAll('/', '-') || 'Shared file';
  const dot = clean.lastIndexOf('.');
  const stem = dot > 0 ? clean.slice(0, dot) : clean;
  const extension = dot > 0 ? clean.slice(dot) : '';
  let path = `/${clean}`;
  for (let copy = 2; isTaken(path); copy += 1) {
    path = `/${stem} (${copy})${extension}`;
  }
  return path;
}

export function createAndroidPlatform(saf: Saf): Platform {
  const roots = new Map<string, Root>();
  const shared = new Map<string, SafShared>();
  const isTaken = (path: string) => roots.has(path) || shared.has(path);
  /** Document ids by viewer path, filled as folders are listed. */
  const documents = new Map<string, string>();
  const images = new Map<string, string>();

  const addRoot = (folder: SafFolder, preferred?: string): string => {
    for (const [path, root] of roots) {
      if (root.tree === folder.tree) {
        return path;
      }
    }
    const base = preferred ?? `/${folder.name || 'Folder'}`;
    let path = base;
    for (let copy = 2; isTaken(path); copy += 1) {
      path = `${base} (${copy})`;
    }
    roots.set(path, { tree: folder.tree, root: folder.root });
    documents.set(path, folder.root);
    return path;
  };

  const takeShared = async () => {
    const file = await saf.takeShared();
    if (file === null) {
      return null;
    }
    const path = freePath(file.name, isTaken);
    shared.set(path, file);
    return path;
  };

  const readOnly = (path: string) => {
    if (shared.has(path)) {
      throw new Error('A shared file is read-only.');
    }
  };

  const list = async (tree: string, path: string, document: string) => {
    const entries = await saf.listChildren(tree, document);
    for (const entry of entries) {
      documents.set(`${path}/${entry.name}`, entry.id);
    }
    return entries;
  };

  const locate = async (path: string) => {
    const [name, ...segments] = path.split('/').filter(Boolean);
    let current = `/${name}`;
    const root = roots.get(current);
    if (root === undefined) {
      throw new Error('That folder is not open.');
    }
    let document = root.root;
    for (const segment of segments) {
      const next = `${current}/${segment}`;
      if (!documents.has(next)) {
        await list(root.tree, current, document);
      }
      const found = documents.get(next);
      if (found === undefined) {
        throw new Error(`${next} was not found.`);
      }
      current = next;
      document = found;
    }
    return { tree: root.tree, document };
  };

  return {
    canOpenFolders: true,

    async askForFolder() {
      const folder = await saf.pickFolder();
      return folder === null ? null : addRoot(folder);
    },

    async bookmarkFolder(path) {
      const root = roots.get(path);
      return root === undefined
        ? null
        : JSON.stringify({ path, tree: root.tree } satisfies Bookmark);
    },

    async openFolder(bookmark): Promise<OpenedFolder | null> {
      const stored = parseBookmark(bookmark);
      if (stored === null) {
        return null;
      }
      const folder = await saf.openTree(stored.tree).catch(() => null);
      return folder === null
        ? null
        : { path: addRoot(folder, stored.path), isStale: false };
    },

    closeFolder() {},

    folderExists(path) {
      return locate(path).then(
        () => true,
        () => false,
      );
    },

    async readDir(path): Promise<DirectoryEntry[]> {
      const { tree, document } = await locate(path);
      const entries = await list(tree, path, document);
      return entries.map(entry => ({
        name: entry.name,
        path: `${path}/${entry.name}`,
        isDirectory: entry.isDirectory,
        isFile: !entry.isDirectory,
      }));
    },

    async readFile(path) {
      const file = shared.get(path);
      if (file !== undefined) {
        if ('error' in file) {
          throw new Error(file.error);
        }
        return file.contents;
      }
      const { tree, document } = await locate(path);
      return saf.readText(tree, document);
    },

    async writeFile(path, contents) {
      readOnly(path);
      const { tree, document } = await locate(path);
      await saf.writeText(tree, document, contents);
    },

    async createFile(path, contents) {
      readOnly(path);
      const slash = path.lastIndexOf('/');
      const parentPath = path.slice(0, slash);
      const name = path.slice(slash + 1);
      const parent = await locate(parentPath);
      // Listed fresh: the provider renames a clash instead of refusing it.
      const entries = await list(parent.tree, parentPath, parent.document);
      if (entries.some(entry => entry.name === name)) {
        throw new Error('A file with that name already exists.');
      }
      const document = await saf.createFile(parent.tree, parent.document, name);
      documents.set(path, document);
      await saf.writeText(parent.tree, document, contents);
    },

    watchFile(path, onChange) {
      if (shared.has(path)) {
        return () => {};
      }
      let last: string | null = null;
      const check = async () => {
        try {
          const { tree, document } = await locate(path);
          const { modified, size } = await saf.stat(tree, document);
          const stamp = `${modified}:${size}`;
          if (last !== null && stamp !== last) {
            onChange();
          }
          last = stamp;
        } catch {
          // A file that cannot be read now may be back on the next check.
        }
      };
      check();
      const timer = window.setInterval(check, WATCH_INTERVAL_MS);
      return () => window.clearInterval(timer);
    },

    takeOpenedFile: takeShared,

    watchOpenedFile(onOpen) {
      let stopped = false;
      const stop = saf.watchShared(async () => {
        const path = await takeShared().catch(() => null);
        if (path !== null && !stopped) {
          onOpen(path);
        }
      });
      return () => {
        stopped = true;
        stop();
      };
    },

    forgetOpenedFile() {},

    async imageSource(pathOrUrl) {
      if (!pathOrUrl.startsWith('/')) {
        return pathOrUrl;
      }
      const cached = images.get(pathOrUrl);
      if (cached !== undefined) {
        return cached;
      }
      const { tree, document } = await locate(pathOrUrl);
      const { data, mimeType } = await saf.readBase64(tree, document);
      const url = URL.createObjectURL(blobFrom(data, mimeType));
      images.set(pathOrUrl, url);
      return url;
    },

    openLink(href) {
      openUrl(href).catch(() => {});
    },
  };
}
