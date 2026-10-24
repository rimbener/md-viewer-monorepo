/**
 * The menu of folders opened before. It sits above Change Folder and opens
 * the chosen folder with the bookmark stored for it.
 */

import { screen } from '@testing-library/react';

import {
  createFakePlatform,
  press,
  renderViewer,
  storeSession,
  type FakePlatform,
} from './fakePlatform';

type Bookmarks = Record<string, { path: string; isStale: boolean } | undefined>;

function folderPlatform(): FakePlatform {
  const platform = createFakePlatform({
    '/notes': ['a.md'],
    '/docs': ['d.md'],
    '/moved': ['moved.md'],
    '/work': ['w.md'],
  });
  platform.readFile.mockImplementation(async path => `# ${path}`);
  return platform;
}

function resolveBookmarks(platform: FakePlatform, bookmarks: Bookmarks): void {
  platform.openFolder.mockImplementation(
    async bookmark => bookmarks[bookmark] ?? null,
  );
}

function storeRecentFolders(
  folders: { path: string; bookmark: string }[],
): void {
  window.localStorage.setItem(
    'mdviewer.recentFolders',
    JSON.stringify(folders),
  );
}

/** The folder open at launch, plus a second folder in the menu. */
function storeNotesAndDocs(platform: FakePlatform): void {
  storeSession('/notes', '/notes/a.md');
  window.localStorage.setItem('mdviewer.lastFolderBookmark', 'NOTES');
  storeRecentFolders([
    { path: '/notes', bookmark: 'NOTES' },
    { path: '/docs', bookmark: 'DOCS' },
  ]);
  resolveBookmarks(platform, {
    NOTES: { path: '/notes', isStale: false },
    DOCS: { path: '/docs', isStale: false },
  });
}

function treeItem(name: string) {
  return screen.queryByRole('treeitem', { name });
}

async function openMenu(): Promise<void> {
  await press(screen.getByRole('button', { name: 'Recent folders' }));
}

async function pick(path: string): Promise<void> {
  await press(screen.getByRole('menuitem', { name: path }));
}

it('puts the menu above Change Folder and opens the folder you pick', async () => {
  const platform = folderPlatform();
  storeNotesAndDocs(platform);

  await renderViewer(platform);
  const menu = screen.getByRole('button', { name: 'Recent folders' });
  const changeFolder = screen.getByRole('button', { name: 'Change Folder…' });
  expect(menu).toHaveTextContent('notes');
  expect(menu.compareDocumentPosition(changeFolder)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
  expect(platform.askForFolder).not.toHaveBeenCalled();

  await openMenu();
  await pick('/docs');

  expect(platform.openFolder).toHaveBeenCalledWith('DOCS');
  expect(treeItem('d.md')).toBeInTheDocument();
  expect(treeItem('a.md')).not.toBeInTheDocument();
  expect(platform.askForFolder).not.toHaveBeenCalled();
});

it('does not open the folder that is already open', async () => {
  const platform = folderPlatform();
  storeNotesAndDocs(platform);
  await renderViewer(platform);
  const calls = platform.openFolder.mock.calls.length;

  await openMenu();
  await pick('/notes');

  expect(platform.openFolder.mock.calls.length).toBe(calls);
  expect(treeItem('a.md')).toBeInTheDocument();
});

it('adds a folder chosen from the panel', async () => {
  storeSession('/notes', '/notes/a.md');
  const platform = folderPlatform();
  platform.askForFolder.mockResolvedValueOnce('/work');
  platform.bookmarkFolder.mockResolvedValueOnce('WORK');

  await renderViewer(platform);
  await press(screen.getByRole('button', { name: 'Change Folder…' }));
  await openMenu();

  expect(screen.getByRole('menuitem', { name: '/work' })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: '/notes' })).toBeInTheDocument();
  expect(window.localStorage.getItem('mdviewer.recentFolders')).toContain(
    'WORK',
  );
});

it('stays on the open folder when the chosen one cannot be opened', async () => {
  const platform = folderPlatform();
  storeNotesAndDocs(platform);
  storeRecentFolders([
    { path: '/notes', bookmark: 'NOTES' },
    { path: '/gone', bookmark: 'GONE' },
  ]);

  await renderViewer(platform);
  await openMenu();
  await pick('/gone');

  expect(treeItem('a.md')).toBeInTheDocument();
  expect(screen.getByText('Could not open that folder.')).toBeInTheDocument();
});

it('stores a fresh bookmark when the chosen one is stale', async () => {
  storeSession('/notes');
  window.localStorage.setItem('mdviewer.lastFolderBookmark', 'NOTES');
  storeRecentFolders([
    { path: '/notes', bookmark: 'NOTES' },
    { path: '/docs', bookmark: 'OLD' },
  ]);
  const platform = folderPlatform();
  resolveBookmarks(platform, {
    NOTES: { path: '/notes', isStale: false },
    OLD: { path: '/docs', isStale: true },
  });
  platform.bookmarkFolder.mockImplementation(async path =>
    path === '/docs' ? 'FRESH' : null,
  );

  await renderViewer(platform);
  await openMenu();
  await pick('/docs');

  expect(window.localStorage.getItem('mdviewer.lastFolderBookmark')).toBe(
    'FRESH',
  );
  expect(window.localStorage.getItem('mdviewer.recentFolders')).toContain(
    'FRESH',
  );
  expect(treeItem('d.md')).toBeInTheDocument();
});

it('follows a bookmark when the folder has moved', async () => {
  const platform = folderPlatform();
  storeNotesAndDocs(platform);
  resolveBookmarks(platform, {
    NOTES: { path: '/notes', isStale: false },
    DOCS: { path: '/moved', isStale: false },
  });

  await renderViewer(platform);
  await openMenu();
  await pick('/docs');

  expect(treeItem('moved.md')).toBeInTheDocument();
  const stored = window.localStorage.getItem('mdviewer.recentFolders');
  expect(stored).toContain('/moved');
  expect(stored).not.toContain('/docs');
});

it('hides the menu until a folder has been opened', async () => {
  const platform = folderPlatform();

  await renderViewer(platform);

  expect(
    screen.queryByRole('button', { name: 'Recent folders' }),
  ).not.toBeInTheDocument();
  expect(platform.askForFolder).toHaveBeenCalled();
});
