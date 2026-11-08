/**
 * Finder can open one markdown file. That file is the whole tree: the stored
 * folder stays stored, and the directory beside the file is not read.
 */

import { act, screen } from '@testing-library/react';

import {
  createFakePlatform,
  press,
  renderViewer,
  settle,
  storeSession,
} from './fakePlatform';

function openedPlatform() {
  return createFakePlatform(
    {},
    {
      '/opened/readme.md': '# From Finder\n',
      '/opened/other.mdc': '# Other\n',
    },
  );
}

it('shows the file Finder opened and leaves the stored folder alone', async () => {
  storeSession('/notes', '/notes/todo.md');
  const platform = openedPlatform();
  platform.takeOpenedFile.mockResolvedValue('/opened/readme.md');

  await renderViewer(platform);

  expect(platform.askForFolder).not.toHaveBeenCalled();
  expect(platform.readDir).not.toHaveBeenCalled();
  expect(platform.closeFolder).toHaveBeenCalled();
  expect(
    screen.getByRole('treeitem', { name: 'readme.md' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: 'From Finder' }),
  ).toBeInTheDocument();
  expect(screen.queryByText('todo.md')).not.toBeInTheDocument();
  expect(window.localStorage.getItem('mdviewer.lastFolder')).toBe('/notes');
  expect(window.localStorage.getItem('mdviewer.lastFile')).toBe(
    '/notes/todo.md',
  );
});

it('switches to a file Finder opens while the app is running', async () => {
  const platform = openedPlatform();

  await renderViewer(platform);
  await act(async () => {
    platform.openFromOutside('/opened/other.mdc');
  });
  await settle();

  expect(
    screen.getByRole('treeitem', { name: 'other.mdc' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Other' })).toBeInTheDocument();
  expect(platform.readDir).not.toHaveBeenCalled();
});

it('takes the file Finder opened once, under Strict Mode', async () => {
  storeSession('/notes', '/notes/todo.md');
  const platform = openedPlatform();
  platform.takeOpenedFile.mockResolvedValueOnce('/opened/readme.md');

  await renderViewer(platform);

  expect(platform.takeOpenedFile).toHaveBeenCalledTimes(1);
  expect(platform.folderExists).not.toHaveBeenCalledWith('/notes');
  expect(
    screen.getByRole('heading', { name: 'From Finder' }),
  ).toBeInTheDocument();
});

function storedRecent(): string[] {
  const stored = window.localStorage.getItem('mdviewer.recentFolders');
  return stored === null
    ? []
    : (JSON.parse(stored) as { path: string }[]).map(folder => folder.path);
}

it('adds the folder of the file Finder opened to recent folders', async () => {
  const platform = createFakePlatform(
    { '/opened': ['readme.md'] },
    { '/opened/readme.md': '# From Finder\n' },
  );
  platform.takeOpenedFile.mockResolvedValue('/opened/readme.md');

  await renderViewer(platform);
  await settle();

  expect(storedRecent()).toEqual(['/opened']);
  expect(platform.readDir).not.toHaveBeenCalled();
});

it('adds the folder of a file opened while the app runs', async () => {
  const platform = createFakePlatform(
    { '/opened': ['other.mdc'] },
    { '/opened/other.mdc': '# Other\n' },
  );

  await renderViewer(platform);
  await act(async () => {
    platform.openFromOutside('/opened/other.mdc');
  });
  await settle();

  expect(storedRecent()).toEqual(['/opened']);
});

it('leaves recent folders alone when the folder cannot be opened again', async () => {
  const platform = openedPlatform();
  platform.takeOpenedFile.mockResolvedValue('/opened/readme.md');

  await renderViewer(platform);
  await settle();

  expect(storedRecent()).toEqual([]);
});

it('forgets the file from outside once a folder is opened', async () => {
  const platform = createFakePlatform(
    { '/notes': ['todo.md'] },
    { '/opened/readme.md': '# From Finder\n' },
  );
  platform.takeOpenedFile.mockResolvedValueOnce('/opened/readme.md');
  platform.askForFolder.mockResolvedValueOnce('/notes');

  await renderViewer(platform);
  expect(platform.forgetOpenedFile).not.toHaveBeenCalled();
  await press(screen.getByRole('button', { name: 'Change Folder…' }));

  expect(platform.forgetOpenedFile).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('treeitem', { name: 'todo.md' })).toBeInTheDocument();
});
