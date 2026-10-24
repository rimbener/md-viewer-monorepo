/**
 * Finder can open one markdown file. That file is the whole tree: the stored
 * folder stays stored, and the directory beside the file is not read.
 */

import { act, screen } from '@testing-library/react';

import {
  createFakePlatform,
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
