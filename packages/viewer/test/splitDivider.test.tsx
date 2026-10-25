/**
 * Dragging the line between the editor and the preview to resize them.
 */

import { fireEvent, screen } from '@testing-library/react';

import {
  createFakePlatform,
  renderViewer,
  settle,
  storeSession,
} from './fakePlatform';

const FRACTION_KEY = 'mdviewer.editorFraction';

// jsdom has no PointerEvent, and the plain Event it falls back to drops clientX.
if (typeof window.PointerEvent === 'undefined') {
  window.PointerEvent = class extends MouseEvent {
    pointerId = 1;
  } as unknown as typeof PointerEvent;
}

beforeEach(() => {
  storeSession('/notes', '/notes/notes.md');
});

async function openEditor(): Promise<void> {
  const platform = createFakePlatform(
    { '/notes': ['notes.md'] },
    { '/notes/notes.md': '# Notes' },
  );
  await renderViewer(platform);
  fireEvent.click(screen.getByRole('button', { name: 'Show editor' }));
}

function divider(): HTMLElement {
  return screen.getByRole('separator', { name: 'Resize editor' });
}

function sourceShare(): string {
  const field = screen.getByRole('textbox', { name: 'Markdown source' });
  return field.parentElement!.style.flexBasis;
}

/** jsdom lays nothing out, so the split gets a box of its own. */
function placeSplit(left: number, width: number): void {
  const split = divider().parentElement!.parentElement!;
  split.getBoundingClientRect = () =>
    ({ left, width, top: 0, height: 0 }) as DOMRect;
}

it('splits evenly by default', async () => {
  await openEditor();

  expect(sourceShare()).toBe('50%');
  expect(divider()).toHaveAttribute('aria-valuenow', '50');
});

it('follows the pointer and keeps the share when released', async () => {
  await openEditor();
  placeSplit(100, 1000);

  fireEvent.pointerDown(divider(), { button: 0, clientX: 600 });
  fireEvent.pointerMove(divider(), { clientX: 400 });

  expect(sourceShare()).toBe('30%');
  // Only the end of the drag is written.
  expect(window.localStorage.getItem(FRACTION_KEY)).toBeNull();

  fireEvent.pointerUp(divider(), { clientX: 400 });

  expect(window.localStorage.getItem(FRACTION_KEY)).toBe('0.3');
});

it('stops short of either edge', async () => {
  await openEditor();
  placeSplit(0, 1000);

  fireEvent.pointerDown(divider(), { button: 0, clientX: 500 });
  fireEvent.pointerMove(divider(), { clientX: 10 });
  expect(sourceShare()).toBe('20%');

  fireEvent.pointerMove(divider(), { clientX: 990 });
  expect(sourceShare()).toBe('80%');
});

it('ignores pointer moves without a drag', async () => {
  await openEditor();
  placeSplit(0, 1000);

  fireEvent.pointerMove(divider(), { clientX: 300 });

  expect(sourceShare()).toBe('50%');
});

it('moves with the arrow keys and resets on double click', async () => {
  await openEditor();

  fireEvent.keyDown(divider(), { key: 'ArrowLeft' });
  expect(divider()).toHaveAttribute('aria-valuenow', '45');

  fireEvent.doubleClick(divider());
  expect(sourceShare()).toBe('50%');
  expect(window.localStorage.getItem(FRACTION_KEY)).toBe('0.5');
});

it('restores the stored share', async () => {
  window.localStorage.setItem(FRACTION_KEY, '0.65');
  await openEditor();
  await settle();

  expect(sourceShare()).toBe('65%');
});

it('falls back to an even split for a stored share out of range', async () => {
  window.localStorage.setItem(FRACTION_KEY, '0.95');
  await openEditor();
  await settle();

  expect(sourceShare()).toBe('50%');
});
