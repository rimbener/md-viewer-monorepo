/**
 * Changing the text size of the document and the editor, and remembering it.
 */

import { fireEvent, screen } from '@testing-library/react';

import { DEFAULT_CHARACTERS } from '../src/column';
import {
  BODY_SIZE,
  columnWidth,
  DEFAULT_SCHEME_ID,
  schemeById,
} from '../src/typography';
import { px } from './dom';
import {
  createFakePlatform,
  press,
  renderViewer,
  settle,
  storeSession,
} from './fakePlatform';

const KEY = 'mdviewer.fontSize';
const scheme = schemeById(DEFAULT_SCHEME_ID);

beforeEach(() => {
  storeSession('/notes', '/notes/notes.md');
});

async function renderApp(): Promise<void> {
  await renderViewer(
    createFakePlatform(
      { '/notes': ['notes.md'] },
      { '/notes/notes.md': '# Notes\n\nSome prose.\n\nMore prose.' },
    ),
  );
}

function button(label: string): HTMLElement {
  return screen.getByRole('button', { name: label });
}

function prose(): HTMLElement {
  return screen.getByText('Some prose.');
}

function bodySize(size: number): number {
  return Math.round(size * scheme.body.scale * 2) / 2;
}

function columnMaxWidth(): number {
  const column = prose().closest<HTMLElement>('[style*="max-width"]');
  return px(column?.style.maxWidth ?? '');
}

it('starts at the default body size', async () => {
  await renderApp();

  expect(button('Reset font size')).toHaveTextContent(`${BODY_SIZE}px`);
  expect(button('Reset font size')).toBeDisabled();
  expect(px(prose().style.fontSize)).toBe(bodySize(BODY_SIZE));
});

it('changes the text one pixel at a time and keeps the spacing', async () => {
  await renderApp();
  const spacing = prose().style.marginBottom;
  expect(spacing).not.toBe('0px');

  await press(button('Increase font size'));
  await press(button('Increase font size'));

  expect(button('Reset font size')).toHaveTextContent(`${BODY_SIZE + 2}px`);
  expect(px(prose().style.fontSize)).toBe(bodySize(BODY_SIZE + 2));
  expect(prose().style.marginBottom).toBe(spacing);
  expect(columnMaxWidth()).toBe(
    columnWidth(scheme, (BODY_SIZE + 2) / BODY_SIZE, DEFAULT_CHARACTERS),
  );

  await press(button('Reset font size'));
  expect(px(prose().style.fontSize)).toBe(bodySize(BODY_SIZE));
});

it('changes the editor text too', async () => {
  await renderApp();
  fireEvent.click(screen.getByRole('radio', { name: 'Editor' }));
  await settle();
  const field = screen.getByRole('textbox', { name: 'Markdown source' });
  const before = px(field.style.fontSize);

  await press(button('Decrease font size'));

  expect(px(field.style.fontSize)).toBeCloseTo(
    (before * (BODY_SIZE - 1)) / BODY_SIZE,
  );
});

it('remembers the chosen size', async () => {
  await renderApp();
  await press(button('Increase font size'));
  expect(window.localStorage.getItem(KEY)).toBe(`${BODY_SIZE + 1}`);
});

it('opens at the stored size', async () => {
  window.localStorage.setItem(KEY, '18');

  await renderApp();

  expect(px(prose().style.fontSize)).toBe(bodySize(18));
  expect(button('Reset font size')).toBeEnabled();
});
