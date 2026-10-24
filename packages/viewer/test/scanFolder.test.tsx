/**
 * Clicking a folder in the sidebar walks that folder again, so files added
 * since the last walk — or sitting deeper than the three-level cap — appear.
 */

import { screen } from '@testing-library/react';

import {
  createFakePlatform,
  press,
  renderViewer,
  storeSession,
  type FakeFolders,
} from './fakePlatform';

const BURIED: FakeFolders = {
  '/notes': ['a/'],
  '/notes/a': ['b/'],
  '/notes/a/b': ['c/'],
  '/notes/a/b/c': ['d/'],
  '/notes/a/b/c/d': ['buried.md'],
};

function notesPlatform(folders: FakeFolders) {
  const platform = createFakePlatform(folders);
  platform.readFile.mockResolvedValue('# Notes');
  return platform;
}

function treeItem(name: string) {
  return screen.queryByRole('treeitem', { name });
}

async function pressFolder(name: string): Promise<void> {
  await press(screen.getByRole('treeitem', { name: `${name} folder` }));
}

beforeEach(() => {
  storeSession('/notes');
});

it('shows markdown files added since that folder was last walked', async () => {
  const folders: FakeFolders = {
    '/notes': ['sub/', 'notes.md'],
    '/notes/sub': ['old.md'],
  };
  await renderViewer(notesPlatform(folders));
  expect(treeItem('new.md')).not.toBeInTheDocument();

  folders['/notes/sub'] = ['old.md', 'new.md'];
  await pressFolder('sub');

  expect(treeItem('new.md')).toBeInTheDocument();
});

it('reads a folder past the three-level cap when that folder is clicked', async () => {
  await renderViewer(notesPlatform(BURIED));
  expect(treeItem('buried.md')).not.toBeInTheDocument();

  await pressFolder('a');
  await pressFolder('b');
  await pressFolder('c');
  await pressFolder('d');

  expect(treeItem('buried.md')).toBeInTheDocument();
});

it('reopens a stored file deeper than three levels', async () => {
  storeSession('/notes', '/notes/a/b/c/d/buried.md');

  await renderViewer(notesPlatform(BURIED));

  expect(treeItem('buried.md')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Notes' })).toBeInTheDocument();
});
