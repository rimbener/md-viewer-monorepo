/**
 * An in-memory platform for view tests. A folder is a map from a directory
 * path to the names it holds; a name ending in `/` is a directory. Files map
 * from path to contents.
 */

import {
  act,
  fireEvent,
  render,
  type RenderResult,
} from '@testing-library/react';
import type { ReactElement } from 'react';
import type { Mock } from 'vitest';

import { PlatformProvider, type Platform } from '../src/platform';
import { Viewer } from '../src/Viewer';

export type FakeFolders = Record<string, string[]>;
export type FakeFiles = Record<string, string>;

type MockedPlatform = {
  [Key in keyof Platform]-?: NonNullable<Platform[Key]> extends (
    ...args: infer A
  ) => infer R
    ? Mock<(...args: A) => R>
    : Platform[Key];
};

export type FakePlatform = MockedPlatform & {
  /** Says the file at `path` changed, as a watcher would. */
  changeFile(path: string): void;
  /** Hands the app a file from outside, as Finder or a link would. */
  openFromOutside(path: string): void;
};

export function createFakePlatform(
  folders: FakeFolders = {},
  files: FakeFiles = {},
): FakePlatform {
  const watchers = new Map<string, Set<() => void>>();
  const openers = new Set<(path: string) => void>();

  const platform: FakePlatform = {
    canOpenFolders: true,
    askForFolder: vi.fn(async () => null),
    bookmarkFolder: vi.fn(async () => null),
    openFolder: vi.fn(async () => null),
    closeFolder: vi.fn(),
    folderExists: vi.fn(async (path: string) => path in folders),
    readDir: vi.fn(async (path: string) => {
      const names = folders[path];
      if (names === undefined) {
        throw new Error(`ENOENT: ${path}`);
      }
      return names.map(entry => {
        const isDirectory = entry.endsWith('/');
        const name = isDirectory ? entry.slice(0, -1) : entry;
        return {
          name,
          path: `${path}/${name}`,
          isDirectory,
          isFile: !isDirectory,
        };
      });
    }),
    readFile: vi.fn(async (path: string) => {
      const contents = files[path];
      if (contents === undefined) {
        throw new Error(`ENOENT: ${path}`);
      }
      return contents;
    }),
    writeFile: vi.fn(async (path: string, contents: string) => {
      files[path] = contents;
    }),
    watchFile: vi.fn((path: string, onChange: () => void) => {
      const set = watchers.get(path) ?? new Set();
      set.add(onChange);
      watchers.set(path, set);
      return () => set.delete(onChange);
    }),
    takeOpenedFile: vi.fn(async () => null),
    watchOpenedFile: vi.fn((onOpen: (path: string) => void) => {
      openers.add(onOpen);
      return () => openers.delete(onOpen);
    }),
    forgetOpenedFile: vi.fn(),
    openUrl: undefined as never,
    imageSource: vi.fn(async (pathOrUrl: string) => pathOrUrl),
    openLink: vi.fn(),
    changeFile(path) {
      watchers.get(path)?.forEach(onChange => onChange());
    },
    openFromOutside(path) {
      openers.forEach(onOpen => onOpen(path));
    },
  };
  return platform;
}

/** Lets every queued promise and the effects they trigger run. */
export async function settle(passes = 6): Promise<void> {
  for (let pass = 0; pass < passes; pass += 1) {
    await act(async () => {});
  }
}

/** Renders the viewer on `platform` with every read settled. */
export async function renderViewer(platform: Platform): Promise<RenderResult> {
  let result: RenderResult | undefined;
  await act(async () => {
    result = render(<Viewer platform={platform} />);
  });
  await settle();
  return result as RenderResult;
}

/** Clicks `element` and lets every read it starts settle. */
export async function press(element: Element): Promise<void> {
  await act(async () => {
    fireEvent.click(element);
  });
  await settle();
}

/** Stores a session to restore: the last folder and, optionally, its file. */
export function storeSession(folder: string, file?: string): void {
  window.localStorage.setItem('mdviewer.lastFolder', folder);
  if (file !== undefined) {
    window.localStorage.setItem('mdviewer.lastFile', file);
  }
}

/** Renders `ui` inside a provider for `platform`, as the viewer would. */
export function renderWithPlatform(
  ui: ReactElement,
  platform: Platform = createFakePlatform(),
): RenderResult {
  return render(<PlatformProvider value={platform}>{ui}</PlatformProvider>);
}
