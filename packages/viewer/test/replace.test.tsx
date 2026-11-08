/**
 * Replacing find hits in the markdown source.
 */

import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createFakePlatform, renderViewer, storeSession } from './fakePlatform';

const SOURCE = 'alpha one\nalpha two\nalpha three';

beforeEach(() => {
  storeSession('/notes', '/notes/notes.md');
});

async function renderApp(): Promise<void> {
  await renderViewer(
    createFakePlatform(
      { '/notes': ['notes.md'] },
      { '/notes/notes.md': SOURCE },
    ),
  );
}

function source(): HTMLTextAreaElement {
  return screen.getByRole('textbox', { name: 'Markdown source' });
}

function findField(): HTMLInputElement {
  return screen.getByRole('searchbox', { name: 'Find in document' });
}

function replaceField(): HTMLInputElement {
  return screen.getByRole('textbox', { name: 'Replace with' });
}

function pressReplace(): boolean {
  return fireEvent.keyDown(window, { key: 'g', metaKey: true });
}

async function openWith(query: string, replacement: string) {
  const user = userEvent.setup();
  await renderApp();
  pressReplace();
  await user.type(findField(), query);
  await user.type(replaceField(), replacement);
  return user;
}

it('shows no replace row while the editor is hidden', async () => {
  await renderApp();

  expect(screen.queryByRole('textbox', { name: 'Replace with' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Replace one' })).toBeNull();
});

it('opens the split and focuses the replace field on Command-G', async () => {
  await renderApp();

  const isDefault = pressReplace();

  // The browser find-next must not run.
  expect(isDefault).toBe(false);
  expect(source()).toBeInTheDocument();
  expect(replaceField()).toBeEnabled();
  expect(replaceField()).toHaveFocus();
});

it('focuses the replace field on Command-G from the find field', async () => {
  const user = userEvent.setup();
  await renderApp();
  pressReplace();
  await user.click(findField());

  pressReplace();

  expect(replaceField()).toHaveFocus();
});

it('replaces the current hit and moves to the next', async () => {
  const user = await openWith('alpha', 'beta');

  await user.click(screen.getByRole('button', { name: 'Replace one' }));

  expect(source()).toHaveValue('beta one\nalpha two\nalpha three');
  expect(screen.getByLabelText('Match 1 of 2')).toBeInTheDocument();
});

it('replaces the current hit on Return in the replace field', async () => {
  const user = await openWith('alpha', 'beta');
  await user.click(screen.getByRole('button', { name: 'Next match' }));

  fireEvent.keyDown(replaceField(), { key: 'Enter' });

  expect(source()).toHaveValue('alpha one\nbeta two\nalpha three');
  expect(screen.getByLabelText('Match 2 of 2')).toBeInTheDocument();
});

it('steps past a replacement that holds the query', async () => {
  const user = await openWith('alpha', 'alpha!');

  await user.click(screen.getByRole('button', { name: 'Replace one' }));

  expect(source()).toHaveValue('alpha! one\nalpha two\nalpha three');
  expect(screen.getByLabelText('Match 2 of 3')).toBeInTheDocument();
});

it('replaces every hit', async () => {
  const user = await openWith('ALPHA', 'beta');

  await user.click(screen.getByRole('button', { name: 'Replace all' }));

  expect(source()).toHaveValue('beta one\nbeta two\nbeta three');
  expect(screen.getByLabelText('No matches')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Replace all' })).toBeDisabled();
});

it('undoes a replace all in one step', async () => {
  const user = await openWith('alpha', 'beta');
  await user.click(screen.getByRole('button', { name: 'Replace all' }));

  await user.click(screen.getByRole('button', { name: 'Undo' }));

  expect(source()).toHaveValue(SOURCE);
});

it('hides the replace row with the editor and keeps its text', async () => {
  const user = await openWith('alpha', 'beta');

  await user.click(screen.getByRole('radio', { name: 'Preview' }));
  expect(screen.queryByRole('textbox', { name: 'Replace with' })).toBeNull();
  await user.click(screen.getByRole('radio', { name: 'Split' }));

  expect(replaceField()).toHaveValue('beta');
  expect(replaceField()).not.toHaveFocus();
});
