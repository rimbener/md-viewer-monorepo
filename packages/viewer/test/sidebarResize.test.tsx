/**
 * Resizing the sidebar with the handle on its edge, and remembering the width.
 */

import { act, fireEvent, screen } from '@testing-library/react';

import { createFakePlatform, renderViewer, settle } from './fakePlatform';

const KEY = 'mdviewer.sidebarWidth';

function drawer(): HTMLElement {
  return document.querySelector('m3e-drawer-container') as HTMLElement;
}

function width(): string {
  return drawer().style.getPropertyValue('--m3e-drawer-container-width');
}

function handle(): HTMLElement {
  return screen.getByRole('separator', { name: 'Resize sidebar' });
}

/** jsdom has no PointerEvent, so a mouse event carries the pointer fields. */
function pointer(type: string, clientX: number): MouseEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    button: 0,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  return event;
}

async function send(event: MouseEvent): Promise<void> {
  await act(async () => {
    handle().dispatchEvent(event);
  });
}

async function renderApp(): Promise<void> {
  await renderViewer(createFakePlatform());
}

it('starts at 280 px', async () => {
  await renderApp();

  expect(width()).toBe('280px');
  expect(handle()).toHaveAttribute('aria-valuenow', '280');
});

it('follows a drag and keeps the width only when released', async () => {
  await renderApp();

  const press = pointer('pointerdown', 100);
  await send(press);
  await send(pointer('pointermove', 160));

  expect(press.defaultPrevented).toBe(true);
  expect(width()).toBe('340px');
  expect(window.localStorage.getItem(KEY)).toBeNull();

  await send(pointer('pointerup', 160));
  await settle();

  expect(window.localStorage.getItem(KEY)).toBe('340');
  expect(handle()).toHaveAttribute('aria-valuenow', '340');
});

it('stops a drag at the limits', async () => {
  await renderApp();

  await send(pointer('pointerdown', 100));
  await send(pointer('pointermove', 1000));
  expect(width()).toBe('560px');
  await send(pointer('pointerup', -1000));
  await settle();

  expect(window.localStorage.getItem(KEY)).toBe('200');
  expect(width()).toBe('200px');
});

it('moves with the arrow keys and resets on a double click', async () => {
  await renderApp();

  fireEvent.keyDown(handle(), { key: 'ArrowRight' });
  await settle();
  expect(width()).toBe('296px');
  expect(window.localStorage.getItem(KEY)).toBe('296');

  fireEvent.keyDown(handle(), { key: 'Home' });
  await settle();
  expect(width()).toBe('200px');

  fireEvent.doubleClick(handle());
  await settle();
  expect(width()).toBe('280px');
  expect(window.localStorage.getItem(KEY)).toBe('280');
});

it('restores the stored width', async () => {
  window.localStorage.setItem(KEY, '400');
  await renderApp();
  expect(width()).toBe('400px');
});

it('falls back to 280 px for a stored width out of range', async () => {
  window.localStorage.setItem(KEY, '9000');
  await renderApp();
  expect(width()).toBe('280px');
});

it('keeps the old width when the drag is cancelled', async () => {
  await renderApp();

  await send(pointer('pointerdown', 100));
  await send(pointer('pointermove', 160));
  await send(pointer('pointercancel', 0));
  await settle();

  expect(width()).toBe('280px');
  expect(window.localStorage.getItem(KEY)).toBeNull();
});

it('snaps back to the kept width when released at the limit again', async () => {
  await renderApp();

  await send(pointer('pointerdown', 100));
  await send(pointer('pointermove', -1000));
  await send(pointer('pointerup', -1000));
  await settle();
  expect(width()).toBe('200px');

  await send(pointer('pointerdown', 100));
  await send(pointer('pointermove', 160));
  expect(width()).toBe('260px');
  await send(pointer('pointerup', -1000));
  await settle();

  expect(width()).toBe('200px');
});
