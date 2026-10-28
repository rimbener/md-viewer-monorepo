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

it.each([
  ['Command', { metaKey: true }],
  ['Control', { ctrlKey: true }],
])('toggles the tree on %s-B', async (_name, modifier) => {
  await renderApp();

  const isDefault = fireEvent.keyDown(window, { key: 'b', ...modifier });
  expect(isDefault).toBe(false);
  expect(showsTree()).toBe(false);

  fireEvent.keyDown(window, { key: 'b', ...modifier });
  expect(showsTree()).toBe(true);
});

it('points the way the sidebar will move', async () => {
  await renderApp();
  expect(toggle()).toHaveTextContent('←');
  expect(toggle()).toHaveStyle({ position: 'absolute', left: '-14px' });

  fireEvent.click(toggle());

  expect(toggle()).toHaveTextContent('→');
  expect(toggle()).toHaveStyle({ left: '6px' });
});

it('floats at the middle of the header, outside the tools', async () => {
  await renderApp();
  const header = toggle().closest('header') as HTMLElement;

  expect(toggle()).toHaveStyle({ top: '50%', marginTop: '-14px' });
  expect(header).toHaveStyle({ position: 'relative' });
  expect(screen.queryByText('Sidebar')).toBeNull();
});

it('moves the header clear of the button while the tree is hidden', async () => {
  await renderApp();
  const header = () => toggle().closest('header') as HTMLElement;
  expect(header()).toHaveStyle({ paddingLeft: '24px' });

  fireEvent.click(toggle());

  expect(header()).toHaveStyle({ paddingLeft: '44px' });
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
