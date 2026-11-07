/**
 * Making a new markdown file in the open folder from the sidebar.
 */

import { act, fireEvent, screen } from '@testing-library/react';

import {
  createFakePlatform,
  press,
  renderViewer,
  settle,
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

/** The `dialog` role lives in the m3e shadow root. */
function dialog(): HTMLElement | null {
  return document.querySelector('m3e-dialog');
}

/** OK submits through the form, a timer tick after the click. */
async function pressOk(): Promise<void> {
  await press(screen.getByRole('button', { name: 'OK' }));
  await act(() => new Promise(resolve => setTimeout(resolve, 0)));
  await settle();
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
  await pressOk();

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
  await pressOk();

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

it('gives the focus back to Add new file after it closes', async () => {
  await renderNotes();
  const add = screen.getByRole('button', { name: 'Add new file' });
  add.focus();
  await askForName();

  await press(screen.getByRole('button', { name: 'Cancel' }));

  expect(dialog()).not.toBeInTheDocument();
  expect(document.activeElement).toBe(add);
});

it('closes on Escape', async () => {
  await renderNotes();
  await askForName();

  fireEvent.keyDown(screen.getByRole('textbox', { name: 'File name' }), {
    key: 'Escape',
  });
  await settle();

  expect(dialog()).not.toBeInTheDocument();
});

it('keeps the dialog open and says why when the name is taken', async () => {
  await renderNotes();
  await askForName();

  typeName('notes.md');
  await pressOk();

  expect(dialog()).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent(
    'A file with that name already exists.',
  );
});

it('refuses an empty name without asking the platform', async () => {
  const platform = await renderNotes();
  await askForName();

  await pressOk();

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
