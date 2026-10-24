/**
 * Hiding and showing the file tree, and remembering the choice.
 */

import { fireEvent, screen } from '@testing-library/react';

import { createFakePlatform, renderViewer, storeSession } from './fakePlatform';

beforeEach(() => {
  storeSession('/notes');
});

async function renderApp(): Promise<void> {
  await renderViewer(
    createFakePlatform(
      { '/notes': ['notes.md'] },
      { '/notes/notes.md': '# Notes' },
    ),
  );
}

function toggle(): HTMLElement {
  return screen.getByRole('button', { name: /^(Show|Hide) sidebar$/ });
}

function showsTree(): boolean {
  return screen.queryByRole('tree') !== null;
}

it('hides the tree and brings it back', async () => {
  await renderApp();
  expect(showsTree()).toBe(true);
  expect(toggle()).toHaveAccessibleName('Hide sidebar');

  fireEvent.click(toggle());

  expect(showsTree()).toBe(false);
  // The control has to survive the panel it hides, or there is no way back.
  expect(toggle()).toHaveAccessibleName('Show sidebar');

  fireEvent.click(toggle());

  expect(showsTree()).toBe(true);
});

it('remembers that the tree was hidden', async () => {
  await renderApp();

  fireEvent.click(toggle());

  expect(window.localStorage.getItem('mdviewer.sidebarVisible')).toBe('false');
});

it('opens with the tree hidden when that is what was stored', async () => {
  window.localStorage.setItem('mdviewer.sidebarVisible', 'false');

  await renderApp();

  expect(showsTree()).toBe(false);
  expect(toggle()).toHaveAccessibleName('Show sidebar');
});
