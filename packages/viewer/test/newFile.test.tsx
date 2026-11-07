/**
 * Making a new markdown file in the open folder from the sidebar.
 */

import { fireEvent, screen } from '@testing-library/react';

import {
  createFakePlatform,
  press,
  renderViewer,
  storeSession,
  type FakeFolders,
} from './fakePlatform';

let folders: FakeFolders;

beforeEach(() => {
  folders = { '/notes': ['notes.md'] };
  storeSession('/notes');
});

async function renderNotes() {
  const platform = createFakePlatform(folders, {
    '/notes/notes.md': '# Notes',
  });
  await renderViewer(platform);
  return platform;
}

function dialog() {
  return screen.queryByRole('dialog', { name: 'New file' });
}

async function askForName(): Promise<void> {
  await press(screen.getByRole('button', { name: 'Add new file' }));
}

function typeName(name: string): void {
  fireEvent.change(screen.getByRole('textbox', { name: 'File name' }), {
    target: { value: name },
  });
}

it('shows the open folder when no file is selected', async () => {
  await renderNotes();
  expect(dialog()).not.toBeInTheDocument();

  await askForName();

  expect(dialog()).toHaveTextContent('In /notes');
});

it('makes the file, shows it in the tree and opens it', async () => {
  const platform = await renderNotes();
  await askForName();

  typeName('ideas');
  await press(screen.getByRole('button', { name: 'OK' }));

  expect(platform.createFile).toHaveBeenCalledWith('/notes/ideas.md', '');
  expect(dialog()).not.toBeInTheDocument();
  expect(
    screen.getByRole('treeitem', { name: 'ideas.md' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { level: 1, name: 'ideas.md' }),
  ).toBeInTheDocument();
});

it('makes the file in the folder of the selected file', async () => {
  folders = { '/notes': ['notes.md', 'specs/'], '/notes/specs': ['a.md'] };
  storeSession('/notes', '/notes/specs/a.md');
  const platform = createFakePlatform(folders, { '/notes/specs/a.md': '# A' });
  await renderViewer(platform);
  await askForName();

  expect(dialog()).toHaveTextContent('In /notes/specs');

  typeName('b');
  await press(screen.getByRole('button', { name: 'OK' }));

  expect(platform.createFile).toHaveBeenCalledWith('/notes/specs/b.md', '');
  expect(
    screen.getByRole('heading', { level: 1, name: 'b.md' }),
  ).toBeInTheDocument();
});

it('makes nothing on Cancel', async () => {
  const platform = await renderNotes();
  await askForName();

  typeName('ideas');
  await press(screen.getByRole('button', { name: 'Cancel' }));

  expect(dialog()).not.toBeInTheDocument();
  expect(platform.createFile).not.toHaveBeenCalled();
});

it('closes on Escape', async () => {
  await renderNotes();
  await askForName();

  fireEvent.keyDown(screen.getByRole('textbox', { name: 'File name' }), {
    key: 'Escape',
  });

  expect(dialog()).not.toBeInTheDocument();
});

it('keeps the dialog open and says why when the name is taken', async () => {
  await renderNotes();
  await askForName();

  typeName('notes.md');
  await press(screen.getByRole('button', { name: 'OK' }));

  expect(dialog()).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent(
    'A file with that name already exists.',
  );
});

it('refuses an empty name without asking the platform', async () => {
  const platform = await renderNotes();
  await askForName();

  await press(screen.getByRole('button', { name: 'OK' }));

  expect(screen.getByRole('alert')).toHaveTextContent('Type a file name.');
  expect(platform.createFile).not.toHaveBeenCalled();
});

it('does not offer a new file before a folder is open', async () => {
  window.localStorage.clear();

  await renderNotes();

  expect(
    screen.queryByRole('button', { name: 'Add new file' }),
  ).not.toBeInTheDocument();
});
