/**
 * The file tree: what it selects and how it opens files.
 */

import { act, fireEvent, screen } from '@testing-library/react';

import {
  createFakePlatform,
  press,
  renderViewer,
  settle,
  storeSession,
} from './fakePlatform';

beforeEach(() => {
  storeSession('/notes', '/notes/a.md');
});

async function renderNotes(): Promise<void> {
  const platform = createFakePlatform(
    { '/notes': ['a.md', 'sub/'], '/notes/sub': ['b.md'] },
    { '/notes/a.md': '# A', '/notes/sub/b.md': '# B' },
  );
  await renderViewer(platform);
}

function item(name: string): HTMLElement {
  return screen.getByRole('treeitem', { name });
}

it('keeps a folder open across renders', async () => {
  await renderNotes();
  await press(item('sub folder'));
  await press(item('b.md'));

  expect(item('sub folder')).toHaveAttribute('aria-expanded', 'true');
});

it('selects the open file and never a folder', async () => {
  await renderNotes();
  expect(item('a.md')).toHaveAttribute('aria-selected', 'true');

  await press(item('sub folder'));

  expect(item('sub folder')).not.toHaveAttribute('aria-selected', 'true');
  expect(item('a.md')).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('heading', { name: 'A' })).toBeInTheDocument();
});

it('opens a file from the keyboard', async () => {
  await renderNotes();
  const tree = screen.getByRole('tree');
  await press(item('sub folder'));

  // From the sub folder, down to b.md inside it.
  await act(async () => {
    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    fireEvent.keyDown(tree, { key: 'Enter' });
  });
  await settle();

  expect(item('b.md')).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('heading', { name: 'B' })).toBeInTheDocument();
});
