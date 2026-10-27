/**
 * A folder too large to read in reasonable time can be left: Cancel under the
 * spinner stops the walk, forgets the folder and asks for another.
 */

import { screen } from '@testing-library/react';

import {
  createFakePlatform,
  press,
  renderViewer,
  storeSession,
} from './fakePlatform';

function hangingPlatform() {
  const platform = createFakePlatform({
    '/huge': ['a.md'],
    '/notes': ['n.md'],
  });
  platform.readFile.mockResolvedValue('# Notes');
  const read = platform.readDir.getMockImplementation()!;
  platform.readDir.mockImplementation(path =>
    path === '/huge' ? new Promise(() => {}) : read(path),
  );
  return platform;
}

function cancelButton() {
  return screen.queryByRole('button', { name: 'Cancel' });
}

it('shows Cancel under the spinner only while a folder is read', async () => {
  storeSession('/huge');
  const platform = hangingPlatform();

  await renderViewer(platform);

  expect(screen.getByText('Scanning…')).toBeInTheDocument();
  expect(cancelButton()).toBeInTheDocument();
});

it('stops the walk, forgets the folder and asks for another', async () => {
  storeSession('/huge', '/huge/a.md');
  window.localStorage.setItem('mdviewer.lastFolderBookmark', 'HUGE');
  const platform = hangingPlatform();
  platform.askForFolder.mockResolvedValueOnce('/notes');

  await renderViewer(platform);
  await press(cancelButton()!);

  expect(platform.askForFolder).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('treeitem', { name: 'n.md' })).toBeInTheDocument();
  expect(cancelButton()).not.toBeInTheDocument();
  expect(window.localStorage.getItem('mdviewer.lastFolder')).toBe('/notes');
});

it('opens no folder at the next launch when the dialog is dismissed', async () => {
  storeSession('/huge', '/huge/a.md');
  window.localStorage.setItem('mdviewer.lastFolderBookmark', 'HUGE');
  const platform = hangingPlatform();

  await renderViewer(platform);
  await press(cancelButton()!);

  expect(screen.getByText('No folder selected yet.')).toBeInTheDocument();
  expect(window.localStorage.getItem('mdviewer.lastFolder')).toBeNull();
  expect(window.localStorage.getItem('mdviewer.lastFolderBookmark')).toBeNull();
  expect(window.localStorage.getItem('mdviewer.lastFile')).toBeNull();
});

it('shows Cancel when a large folder replaces an open one', async () => {
  storeSession('/notes');
  const platform = hangingPlatform();
  platform.askForFolder.mockResolvedValueOnce('/huge');

  await renderViewer(platform);
  expect(screen.getByRole('treeitem', { name: 'n.md' })).toBeInTheDocument();
  await press(screen.getByRole('button', { name: 'Change Folder…' }));

  expect(
    screen.queryByRole('treeitem', { name: 'n.md' }),
  ).not.toBeInTheDocument();
  expect(screen.getByText('Scanning…')).toBeInTheDocument();
  expect(cancelButton()).toBeInTheDocument();
});
