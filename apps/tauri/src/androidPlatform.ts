/**
 * The viewer on Android. Tauri's dialog cannot pick a folder there, and its fs
 * plugin cannot list a granted folder, so every read and write goes through
 * the Storage Access Framework. As on the web, a folder is addressed as
 * `/<folder name>/…`, and a second folder with the same name gets
 * `/<folder name> (2)`. A bookmark holds the path and the tree URI.
 */

import { openUrl } from '@tauri-apps/plugin-opener';

import type {
  DirectoryEntry,
  OpenedFolder,
  Platform,
} from '@md-viewer/viewer/platform';

import type { Saf, SafFolder } from './saf';

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

export function createAndroidPlatform(saf: Saf): Platform {
  const roots = new Map<string, Root>();
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
    for (let copy = 2; roots.has(path); copy += 1) {
      path = `${base} (${copy})`;
    }
    roots.set(path, { tree: folder.tree, root: folder.root });
    documents.set(path, folder.root);
    return path;
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
      const { tree, document } = await locate(path);
      return saf.readText(tree, document);
    },

    async writeFile(path, contents) {
      const { tree, document } = await locate(path);
      await saf.writeText(tree, document, contents);
    },

    async createFile(path, contents) {
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

    async takeOpenedFile() {
      return null;
    },

    watchOpenedFile() {
      return () => {};
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
