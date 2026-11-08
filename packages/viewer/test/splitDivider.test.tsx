/**
 * Resizing the editor and the preview with the split pane between them.
 */

import { fireEvent, screen } from '@testing-library/react';

import type { M3eSplitPaneElement } from '../src/m3e';
import {
  createFakePlatform,
  renderViewer,
  settle,
  storeSession,
} from './fakePlatform';

const FRACTION_KEY = 'mdviewer.editorFraction';

beforeEach(() => {
  storeSession('/notes', '/notes/notes.md');
});

async function openEditor(): Promise<void> {
  const platform = createFakePlatform(
    { '/notes': ['notes.md'] },
    { '/notes/notes.md': '# Notes' },
  );
  await renderViewer(platform);
  fireEvent.click(screen.getByRole('radio', { name: 'Split' }));
  await settle();
}

function pane(): M3eSplitPaneElement {
  return document.querySelector('m3e-split-pane') as M3eSplitPaneElement;
}

/** The drag handle lives in the pane's shadow root, out of `getByRole`. */
function handle(): HTMLElement {
  return pane().shadowRoot!.querySelector('[role="separator"]')!;
}

/** What a drag does: m3e moves its value, then tells the page. */
async function dragTo(value: number, end: boolean): Promise<void> {
  pane().value = value;
  fireEvent(pane(), new Event('input', { bubbles: true }));
  if (end) {
    fireEvent(pane(), new Event('change', { bubbles: true }));
  }
  await settle();
}

it('splits evenly by default, between 20% and 80%', async () => {
  await openEditor();

  expect(pane().value).toBe(50);
  expect(pane().min).toBe(20);
  expect(pane().max).toBe(80);
  expect(pane().step).toBe(5);
  expect(handle()).toHaveAttribute('aria-label', 'Resize editor');
  expect(handle()).toHaveAttribute('aria-valuenow', '50');
});

it('follows a drag and keeps the share only when released', async () => {
  await openEditor();

  await dragTo(30, false);

  expect(pane().value).toBe(30);
  expect(window.localStorage.getItem(FRACTION_KEY)).toBeNull();

  await dragTo(30, true);

  expect(window.localStorage.getItem(FRACTION_KEY)).toBe('0.3');
});

it('ignores input that bubbles up from inside a pane', async () => {
  await openEditor();
  const field = screen.getByRole('textbox', { name: 'Markdown source' });

  fireEvent.change(field, { target: { value: '# Changed' } });
  await settle();

  expect(pane().value).toBe(50);
  expect(window.localStorage.getItem(FRACTION_KEY)).toBeNull();
});

it('moves with the arrow keys and resets on a double click', async () => {
  await openEditor();

  fireEvent.keyDown(handle(), { key: 'ArrowLeft' });
  await settle();
  expect(pane().value).toBe(45);
  expect(window.localStorage.getItem(FRACTION_KEY)).toBe('0.45');

  fireEvent.doubleClick(handle());
  await settle();
  expect(pane().value).toBe(50);
  expect(window.localStorage.getItem(FRACTION_KEY)).toBe('0.5');
});

it('keeps the editor mounted, with no handle, when the editor shows alone', async () => {
  await openEditor();
  const field = screen.getByRole('textbox', { name: 'Markdown source' });

  fireEvent.click(screen.getByRole('radio', { name: 'Editor' }));
  await settle();

  expect(screen.getByRole('textbox', { name: 'Markdown source' })).toBe(field);
  expect(pane().disabled).toBe(true);
  expect(pane().querySelector('[slot="end"]')).toBeNull();
});

it('restores the stored share', async () => {
  window.localStorage.setItem(FRACTION_KEY, '0.65');
  await openEditor();

  expect(pane().value).toBe(65);
});

it('falls back to an even split for a stored share out of range', async () => {
  window.localStorage.setItem(FRACTION_KEY, '0.95');
  await openEditor();

  expect(pane().value).toBe(50);
});

it('keeps a share released past the limit inside it', async () => {
  await openEditor();

  await dragTo(17, true);

  expect(window.localStorage.getItem(FRACTION_KEY)).toBe('0.2');
});

it('starts no text selection on a press of the handle', async () => {
  await openEditor();

  // jsdom has no PointerEvent.
  const press = new MouseEvent('pointerdown', {
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  handle().dispatchEvent(press);

  expect(press.defaultPrevented).toBe(true);
});

it('sizes each pane by the split, not by its content', async () => {
  await openEditor();

  for (const slot of ['start', 'end']) {
    const element = pane().querySelector<HTMLElement>(`[slot="${slot}"]`)!;
    expect(element.style.contain).toBe('inline-size');
  }
});
