/**
 * The two buttons at the end of the top app bar: they show or hide the tools
 * and the Find and Replace row, and the choice is kept.
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
  storeSession('/notes', '/notes/notes.md');
});

async function renderApp(): Promise<void> {
  await renderViewer(
    createFakePlatform(
      { '/notes': ['notes.md'] },
      { '/notes/notes.md': '# Notes\n\nalpha' },
    ),
  );
}

function toggle(name: string): HTMLElement {
  return screen.getByRole('button', { name });
}

/** Also while hidden: the row stays mounted. */
function findField(): HTMLInputElement {
  return screen.getByRole('searchbox', {
    name: 'Find in document',
    hidden: true,
  });
}

function findRow(): HTMLElement {
  return findField().closest('m3e-form-field')!.parentElement!;
}

it('puts both toggles in the top app bar, both on', async () => {
  await renderApp();

  for (const name of ['Find and replace', 'Toolbar']) {
    expect(toggle(name).closest('m3e-app-bar')).not.toBeNull();
    expect((toggle(name) as HTMLElement & { selected: boolean }).selected).toBe(
      true,
    );
  }
});

it('hides and shows the tools, and keeps the choice', async () => {
  await renderApp();

  await press(toggle('Toolbar'));

  expect(document.querySelector('m3e-toolbar')).toBeNull();
  expect(window.localStorage.getItem('mdviewer.toolbarVisible')).toBe('false');
  expect(findRow().style.display).not.toBe('none');

  await press(toggle('Toolbar'));
  expect(screen.getByRole('group', { name: 'Zoom' })).toBeInTheDocument();
});

it('opens with the tools hidden when that was stored', async () => {
  window.localStorage.setItem('mdviewer.toolbarVisible', 'false');

  await renderApp();

  expect(document.querySelector('m3e-toolbar')).toBeNull();
});

it('hides the find row, and Command-F shows it with the focus', async () => {
  await renderApp();

  await press(toggle('Find and replace'));
  expect(findRow().style.display).toBe('none');
  expect(window.localStorage.getItem('mdviewer.findVisible')).toBe('false');

  await act(async () => {
    fireEvent.keyDown(window, { key: 'f', metaKey: true });
    await new Promise(resolve => setTimeout(resolve));
  });
  await settle();

  expect(findRow().style.display).not.toBe('none');
  expect(findField()).toHaveFocus();
});

it('shows a hidden find row for Command-G and focuses Replace', async () => {
  await renderApp();
  await press(toggle('Find and replace'));

  await act(async () => {
    fireEvent.keyDown(window, { key: 'g', metaKey: true });
  });
  await settle();

  expect(findRow().style.display).not.toBe('none');
  expect(screen.getByRole('textbox', { name: 'Replace with' })).toHaveFocus();
});
