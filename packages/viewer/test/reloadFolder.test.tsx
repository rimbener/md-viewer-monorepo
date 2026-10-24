/**
 * Rescanning the open folder so markdown files added since the last walk
 * appear in the tree.
 */

import { screen } from '@testing-library/react';

import {
  createFakePlatform,
  press,
  renderViewer,
  storeSession,
  type FakeFolders,
} from './fakePlatform';

let folders: FakeFolders;

function notesPlatform() {
  const platform = createFakePlatform(folders);
  platform.readFile.mockResolvedValue('# Notes');
  return platform;
}

function treeItem(name: string) {
  return screen.queryByRole('treeitem', { name });
}

async function reload(): Promise<void> {
  await press(screen.getByRole('button', { name: 'Reload folder' }));
}

beforeEach(() => {
  folders = { '/notes': ['notes.md'] };
  storeSession('/notes');
});

it('shows markdown files added since the folder was opened', async () => {
  await renderViewer(notesPlatform());
  expect(treeItem('new.md')).not.toBeInTheDocument();

  folders['/notes'] = ['notes.md', 'new.md'];
  await reload();

  expect(treeItem('new.md')).toBeInTheDocument();
});

it('keeps the selected file after a reload', async () => {
  storeSession('/notes', '/notes/notes.md');

  await renderViewer(notesPlatform());
  folders['/notes'] = ['notes.md', 'new.md'];
  await reload();

  expect(
    screen.getByRole('heading', { level: 1, name: 'notes.md' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Notes' })).toBeInTheDocument();
});

it('clears the selection when the selected file is gone', async () => {
  storeSession('/notes', '/notes/notes.md');

  await renderViewer(notesPlatform());
  folders['/notes'] = ['other.md'];
  await reload();

  expect(treeItem('other.md')).toBeInTheDocument();
  expect(
    screen.getByText('Select a markdown file from the sidebar.'),
  ).toBeInTheDocument();
});

it('does not offer Reload before a folder is open', async () => {
  window.localStorage.clear();

  await renderViewer(notesPlatform());

  expect(
    screen.queryByRole('button', { name: 'Reload folder' }),
  ).not.toBeInTheDocument();
});
