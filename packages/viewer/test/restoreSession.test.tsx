/**
 * The launch path that reopens the last session, end to end: stored folder →
 * scan → stored file selected → its markdown rendered. A sandboxed build
 * reaches that folder through a stored bookmark.
 */

import { screen } from '@testing-library/react';

import { createFakePlatform, renderViewer, storeSession } from './fakePlatform';

const YESTERDAY = '# Yesterday\n\nStill here.';

/** One directory holding `notes.md` and `todo.md`. */
function notesPlatform() {
  return createFakePlatform(
    { '/notes': ['notes.md', 'todo.md'] },
    { '/notes/notes.md': YESTERDAY, '/notes/todo.md': YESTERDAY },
  );
}

function treeItem(name: string) {
  return screen.queryByRole('treeitem', { name });
}

it('reopens the stored folder and file without asking', async () => {
  storeSession('/notes', '/notes/todo.md');
  const platform = notesPlatform();

  await renderViewer(platform);

  expect(platform.askForFolder).not.toHaveBeenCalled();
  expect(
    screen.getByRole('heading', { level: 1, name: 'todo.md' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: 'Yesterday' }),
  ).toBeInTheDocument();
});

it('asks for a folder when nothing was stored', async () => {
  const platform = notesPlatform();

  await renderViewer(platform);

  expect(platform.askForFolder).toHaveBeenCalled();
});

it('reopens the folder but selects nothing when the file is gone', async () => {
  storeSession('/notes', '/notes/deleted.md');
  const platform = notesPlatform();

  await renderViewer(platform);

  expect(platform.askForFolder).not.toHaveBeenCalled();
  expect(treeItem('notes.md')).toBeInTheDocument();
  expect(
    screen.getByText('Select a markdown file from the sidebar.'),
  ).toBeInTheDocument();
});

it('falls back to the dialog when the stored folder is gone', async () => {
  storeSession('/notes');
  const platform = notesPlatform();
  platform.folderExists.mockResolvedValueOnce(false);

  await renderViewer(platform);

  expect(platform.askForFolder).toHaveBeenCalled();
});

it('reopens the folder the bookmark points at, wherever it moved to', async () => {
  storeSession('/before-the-move');
  window.localStorage.setItem('mdviewer.lastFolderBookmark', 'BOOKMARK');
  const platform = notesPlatform();
  platform.openFolder.mockResolvedValueOnce({ path: '/notes', isStale: false });

  await renderViewer(platform);

  expect(platform.openFolder).toHaveBeenCalledWith('BOOKMARK');
  expect(platform.askForFolder).not.toHaveBeenCalled();
  expect(treeItem('notes.md')).toBeInTheDocument();
  expect(window.localStorage.getItem('mdviewer.lastFolder')).toBe('/notes');
});

it('asks for a folder when the stored bookmark no longer opens', async () => {
  storeSession('/notes');
  window.localStorage.setItem('mdviewer.lastFolderBookmark', 'BOOKMARK');
  const platform = notesPlatform();
  platform.folderExists.mockResolvedValueOnce(false);

  await renderViewer(platform);

  expect(platform.openFolder).toHaveBeenCalledWith('BOOKMARK');
  expect(platform.askForFolder).toHaveBeenCalled();
});

it('makes the bookmark again when the resolved one is stale', async () => {
  storeSession('/notes');
  window.localStorage.setItem('mdviewer.lastFolderBookmark', 'OLD');
  const platform = notesPlatform();
  platform.openFolder.mockResolvedValueOnce({ path: '/notes', isStale: true });
  platform.bookmarkFolder.mockResolvedValueOnce('FRESH');

  await renderViewer(platform);

  expect(window.localStorage.getItem('mdviewer.lastFolderBookmark')).toBe(
    'FRESH',
  );
});

it('moves the open file and its history when the bookmarked folder moved', async () => {
  storeSession('/before', '/before/todo.md');
  window.localStorage.setItem('mdviewer.lastFolderBookmark', 'BOOKMARK');
  window.localStorage.setItem(
    'mdviewer.fileHistory:/before',
    JSON.stringify({
      paths: ['/before/notes.md', '/before/todo.md'],
      index: 1,
    }),
  );
  const platform = notesPlatform();
  platform.openFolder.mockResolvedValueOnce({ path: '/notes', isStale: false });

  await renderViewer(platform);

  expect(
    screen.getByRole('heading', { level: 1, name: 'todo.md' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: 'Yesterday' }),
  ).toBeInTheDocument();
  expect(window.localStorage.getItem('mdviewer.lastFile')).toBe(
    '/notes/todo.md',
  );
  expect(
    window.localStorage.getItem('mdviewer.fileHistory:/before'),
  ).toBeNull();
  expect(window.localStorage.getItem('mdviewer.fileHistory:/notes')).toContain(
    '/notes/notes.md',
  );
});

it('stores a bookmark for the folder someone picks', async () => {
  const platform = notesPlatform();
  platform.askForFolder.mockResolvedValue('/notes');
  platform.bookmarkFolder.mockResolvedValueOnce('BOOKMARK');

  await renderViewer(platform);

  expect(platform.bookmarkFolder).toHaveBeenCalledWith('/notes');
  expect(window.localStorage.getItem('mdviewer.lastFolderBookmark')).toBe(
    'BOOKMARK',
  );
  expect(treeItem('notes.md')).toBeInTheDocument();
});
