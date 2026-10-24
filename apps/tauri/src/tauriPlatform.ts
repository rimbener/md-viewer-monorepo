/**
 * The viewer on the desktop. Tauri's fs plugin reads any folder the person
 * picks; the app is not sandboxed, so a stored path is all a bookmark needs.
 * A file opened from Finder or the shell reaches the page through the Rust
 * side, which holds it until the page asks.
 */

import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { exists, readDir, readTextFile, watch } from '@tauri-apps/plugin-fs';
import { openUrl } from '@tauri-apps/plugin-opener';

import type { Platform } from '@md-viewer/viewer/platform';

import { toNativePath, toViewerPath } from './paths';

const OPENED_EVENT = 'opened-file';

/** Ties an async subscription to a synchronous stop. */
function stopLater(start: Promise<() => void>): () => void {
  let stopped = false;
  let stop: (() => void) | null = null;
  start
    .then(next => {
      if (stopped) {
        next();
      } else {
        stop = next;
      }
    })
    .catch(() => {});
  return () => {
    stopped = true;
    stop?.();
  };
}

export function createTauriPlatform(): Platform {
  return {
    canOpenFolders: true,

    async askForFolder() {
      const picked = await open({ directory: true, multiple: false });
      return typeof picked === 'string' ? toViewerPath(picked) : null;
    },

    async bookmarkFolder(path) {
      return path;
    },

    async openFolder(bookmark) {
      return (await exists(toNativePath(bookmark)))
        ? { path: bookmark, isStale: false }
        : null;
    },

    closeFolder() {},

    folderExists(path) {
      return exists(toNativePath(path));
    },

    async readDir(path) {
      const entries = await readDir(toNativePath(path));
      return entries.map(entry => ({
        name: entry.name,
        path: `${path}/${entry.name}`,
        isDirectory: entry.isDirectory,
        isFile: entry.isFile,
      }));
    },

    readFile(path) {
      return readTextFile(toNativePath(path));
    },

    watchFile(path, onChange) {
      return stopLater(watch(toNativePath(path), () => onChange()));
    },

    async takeOpenedFile() {
      const path = await invoke<string | null>('take_opened_file');
      return path === null ? null : toViewerPath(path);
    },

    watchOpenedFile(onOpen) {
      return stopLater(
        listen<string>(OPENED_EVENT, event =>
          onOpen(toViewerPath(event.payload)),
        ),
      );
    },

    forgetOpenedFile() {},

    async imageSource(pathOrUrl) {
      return pathOrUrl.startsWith('/')
        ? convertFileSrc(toNativePath(pathOrUrl))
        : pathOrUrl;
    },

    openLink(href) {
      openUrl(href).catch(() => {});
    },
  };
}
