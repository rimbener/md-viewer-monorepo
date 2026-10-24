/**
 * The viewer in a browser. Folders come through the File System Access API,
 * which only Chromium browsers ship. A document can also come from a URL,
 * which works everywhere: `?src=<url>` opens it, so a link can share it.
 *
 * A folder is addressed as `/<folder name>/…`. The page never learns where a
 * folder is on disk, so its name is the only path it has. A second folder
 * with the same name gets `/<folder name> (2)`.
 */

import type {
  DirectoryEntry,
  OpenedFolder,
  Platform,
} from '@md-viewer/viewer/platform';
import { isHttpUrl } from '@md-viewer/viewer/url';

import { loadHandle, loadHandles, saveHandle } from './handleStore';

const SOURCE_PARAM = 'src';

/** How often an open file is checked for a change on disk. */
const WATCH_INTERVAL_MS = 1000;

const OPENED_EVENT = 'md-viewer:opened';

export function canOpenFolders(): boolean {
  return typeof window.showDirectoryPicker === 'function';
}

/** The document URL in the address bar, or null when there is none. */
export function sourceFromLocation(): string | null {
  const source = new URLSearchParams(window.location.search).get(SOURCE_PARAM);
  return source !== null && isHttpUrl(source) ? source : null;
}

function setSourceInLocation(source: string | null, push: boolean): void {
  const url = new URL(window.location.href);
  if (source === null) {
    url.searchParams.delete(SOURCE_PARAM);
  } else {
    url.searchParams.set(SOURCE_PARAM, source);
  }
  if (push) {
    window.history.pushState(null, '', url);
  } else {
    window.history.replaceState(null, '', url);
  }
}

/** Puts a document URL in the address bar and tells the viewer to open it. */
export function openSource(source: string): void {
  setSourceInLocation(source, true);
  window.dispatchEvent(new CustomEvent(OPENED_EVENT, { detail: source }));
}

export function createWebPlatform(): Platform {
  const roots = new Map<string, FileSystemDirectoryHandle>();
  const images = new Map<string, string>();

  const addRoot = (path: string, handle: FileSystemDirectoryHandle): string => {
    roots.set(path, handle);
    return path;
  };

  const pathFor = async (handle: FileSystemDirectoryHandle) => {
    const stored = await loadHandles().catch(() => []);
    const known = new Map([...stored, ...roots]);
    for (const [path, other] of known) {
      if (await other.isSameEntry(handle)) {
        return path;
      }
    }
    let path = `/${handle.name}`;
    for (let copy = 2; known.has(path); copy += 1) {
      path = `/${handle.name} (${copy})`;
    }
    return path;
  };

  const split = (path: string) => {
    const [name, ...rest] = path.split('/').filter(Boolean);
    const root = roots.get(`/${name}`);
    if (root === undefined) {
      throw new Error('That folder is not open.');
    }
    return { root, segments: rest };
  };

  const directoryAt = async (path: string) => {
    const { root, segments } = split(path);
    let directory = root;
    for (const segment of segments) {
      directory = await directory.getDirectoryHandle(segment);
    }
    return directory;
  };

  const fileAt = async (path: string) => {
    const slash = path.lastIndexOf('/');
    const directory = await directoryAt(path.slice(0, slash));
    return directory.getFileHandle(path.slice(slash + 1));
  };

  return {
    canOpenFolders: canOpenFolders(),

    async askForFolder() {
      try {
        const handle = await window.showDirectoryPicker({
          id: 'md-viewer',
          mode: 'read',
        });
        return addRoot(await pathFor(handle), handle);
      } catch (cause) {
        // Cancelled, or asked for without a click, which the browser refuses.
        if (
          cause instanceof DOMException &&
          (cause.name === 'AbortError' || cause.name === 'SecurityError')
        ) {
          return null;
        }
        throw cause;
      }
    },

    async bookmarkFolder(path) {
      const handle = roots.get(path);
      if (handle === undefined) {
        return null;
      }
      try {
        await saveHandle(path, handle);
        return path;
      } catch {
        return null;
      }
    },

    async openFolder(bookmark): Promise<OpenedFolder | null> {
      const handle = await loadHandle(bookmark);
      if (handle === undefined) {
        return null;
      }
      const options = { mode: 'read' } as const;
      let state = await handle.queryPermission(options);
      if (state === 'prompt') {
        // Only allowed right after a click, as on a recent folder.
        state = await handle.requestPermission(options).catch(() => state);
      }
      return state === 'granted'
        ? { path: addRoot(bookmark, handle), isStale: false }
        : null;
    },

    closeFolder() {},

    async folderExists(path) {
      return roots.has(path);
    },

    async readDir(path): Promise<DirectoryEntry[]> {
      const directory = await directoryAt(path);
      const entries: DirectoryEntry[] = [];
      for await (const entry of directory.values()) {
        entries.push({
          name: entry.name,
          path: `${path}/${entry.name}`,
          isDirectory: entry.kind === 'directory',
          isFile: entry.kind === 'file',
        });
      }
      return entries;
    },

    async readFile(path) {
      if (isHttpUrl(path)) {
        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(
            `Could not load ${path} (${response.status} ${response.statusText}).`,
          );
        }
        return response.text();
      }
      return (await (await fileAt(path)).getFile()).text();
    },

    watchFile(path, onChange) {
      if (isHttpUrl(path)) {
        return () => {};
      }
      let last: string | null = null;
      const check = async () => {
        try {
          const file = await (await fileAt(path)).getFile();
          const stamp = `${file.lastModified}:${file.size}`;
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
      return sourceFromLocation();
    },

    watchOpenedFile(onOpen) {
      const opened = (event: Event) => {
        onOpen((event as CustomEvent<string>).detail);
      };
      const navigated = () => {
        const source = sourceFromLocation();
        if (source !== null) {
          onOpen(source);
        }
      };
      window.addEventListener(OPENED_EVENT, opened);
      window.addEventListener('popstate', navigated);
      return () => {
        window.removeEventListener(OPENED_EVENT, opened);
        window.removeEventListener('popstate', navigated);
      };
    },

    forgetOpenedFile() {
      setSourceInLocation(null, false);
    },

    openUrl: openSource,

    async imageSource(pathOrUrl) {
      if (!pathOrUrl.startsWith('/')) {
        return pathOrUrl;
      }
      const cached = images.get(pathOrUrl);
      if (cached !== undefined) {
        return cached;
      }
      const url = URL.createObjectURL(
        await (await fileAt(pathOrUrl)).getFile(),
      );
      images.set(pathOrUrl, url);
      return url;
    },

    openLink(href) {
      window.open(href, '_blank', 'noopener,noreferrer');
    },
  };
}
