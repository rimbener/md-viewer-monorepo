/**
 * What the viewer needs from the place it runs: a folder to read, files in
 * it, and the few system services around them. The web app and the Tauri app
 * each provide one. Every path is absolute and `/`-separated, whatever the
 * platform writes natively.
 */

import { createContext, useContext } from 'react';

export type DirectoryEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
};

export type OpenedFolder = {
  path: string;
  /** The folder moved, so the bookmark must be made again to stay usable. */
  isStale: boolean;
};

export interface Platform {
  /** False where folders cannot be opened at all. Only a URL can be read. */
  canOpenFolders: boolean;
  /** Asks for a folder. Null when the person cancelled. */
  askForFolder(): Promise<string | null>;
  /** A token that opens the folder again on a later run, or null. */
  bookmarkFolder(path: string): Promise<string | null>;
  /** Restores access from a bookmark, or null when the grant is gone. */
  openFolder(bookmark: string): Promise<OpenedFolder | null>;
  /** Gives up the access held for the open folder. */
  closeFolder(): void;
  folderExists(path: string): Promise<boolean>;
  readDir(path: string): Promise<DirectoryEntry[]>;
  readFile(path: string): Promise<string>;
  /** Calls `onChange` when the file at `path` changes. Returns the stop. */
  watchFile(path: string, onChange: () => void): () => void;
  /** A file handed to the app from outside — Finder, a link — or null. */
  takeOpenedFile(): Promise<string | null>;
  watchOpenedFile(onOpen: (path: string) => void): () => void;
  /** Called when a folder replaces the file from outside. */
  forgetOpenedFile(): void;
  /** Opens a document by URL. Absent where that is not offered. */
  openUrl?: (url: string) => void;
  /** Something an `<img>` loads, for an absolute path or a URL. */
  imageSource(pathOrUrl: string): Promise<string>;
  openLink(href: string): void;
}

const PlatformContext = createContext<Platform | null>(null);

export const PlatformProvider = PlatformContext.Provider;

export function usePlatform(): Platform {
  const platform = useContext(PlatformContext);
  if (platform === null) {
    throw new Error('usePlatform needs a PlatformProvider');
  }
  return platform;
}
