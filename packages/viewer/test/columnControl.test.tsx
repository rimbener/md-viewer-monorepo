/**
 * Changing the line length, and remembering the choice.
 */

import { screen } from '@testing-library/react';

import { DEFAULT_CHARACTERS } from '../src/column';
import { columnWidth, DEFAULT_SCHEME_ID, schemeById } from '../src/typography';
import { DEFAULT_ZOOM } from '../src/zoom';
import { px } from './dom';
import {
  createFakePlatform,
  press,
  renderViewer,
  storeSession,
} from './fakePlatform';

beforeEach(() => {
  storeSession('/notes', '/notes/notes.md');
});

async function renderApp(): Promise<void> {
  await renderViewer(
    createFakePlatform(
      { '/notes': ['notes.md'] },
      { '/notes/notes.md': '# Notes' },
    ),
  );
}

function button(label: string): HTMLElement {
  return screen.getByRole('button', { name: label });
}

function columnMaxWidth(): number {
  const column = screen
    .getByRole('heading', { name: 'Notes' })
    .closest<HTMLElement>('[style*="max-width"]');
  return px(column?.style.maxWidth ?? '');
}

function widthAt(characters: number): number {
  return columnWidth(schemeById(DEFAULT_SCHEME_ID), DEFAULT_ZOOM, characters);
}

it('starts at 100 characters', async () => {
  await renderApp();

  expect(columnMaxWidth()).toBe(widthAt(DEFAULT_CHARACTERS));
  expect(button('Reset line length')).toBeDisabled();
});

it('widens and narrows five characters at a time', async () => {
  await renderApp();

  await press(button('Increase line length'));
  expect(columnMaxWidth()).toBe(widthAt(105));

  await press(button('Decrease line length'));
  await press(button('Decrease line length'));
  expect(columnMaxWidth()).toBe(widthAt(95));
});

it('resets to 100 when the number is pressed', async () => {
  await renderApp();
  await press(button('Increase line length'));

  await press(button('Reset line length'));

  expect(columnMaxWidth()).toBe(widthAt(DEFAULT_CHARACTERS));
});

it('remembers the chosen line length', async () => {
  await renderApp();

  await press(button('Increase line length'));

  expect(window.localStorage.getItem('mdviewer.characters')).toBe('105');
});

it('opens at the stored line length', async () => {
  window.localStorage.setItem('mdviewer.characters', '80');

  await renderApp();

  expect(columnMaxWidth()).toBe(widthAt(80));
  expect(button('Reset line length')).toBeEnabled();
});
