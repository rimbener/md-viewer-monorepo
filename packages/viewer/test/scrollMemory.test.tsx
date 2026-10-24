/**
 * Each file opens where it was scrolled to last, in this launch or a
 * previous one.
 */

import { act, fireEvent } from '@testing-library/react';
import type { Mock } from 'vitest';

import { DocumentPanel } from '../src/components/DocumentPanel';
import type { FileNode } from '../src/types';
import { createFakePlatform, renderWithPlatform, settle } from './fakePlatform';
import { documentScroll, layOut, stubLayout, unstubLayout } from './layout';

const KEY = 'mdviewer.scrollPositions';
const VIEW_HEIGHT = 600;

const file: FileNode = {
  kind: 'file',
  name: 'notes.md',
  path: '/notes/notes.md',
};

let scrollTo: Mock<(options: ScrollToOptions) => void>;

beforeEach(() => {
  scrollTo = stubLayout();
});

afterEach(() => {
  vi.useRealTimers();
  unstubLayout();
});

async function renderPanel(): Promise<void> {
  renderWithPlatform(
    <DocumentPanel
      file={file}
      isSidebarVisible
      onToggleSidebar={() => {}}
      canGoBack={false}
      canGoNext={false}
      onBack={() => {}}
      onNext={() => {}}
    />,
    createFakePlatform({}, { [file.path]: 'A long note.' }),
  );
  await settle();
}

function scroll(y: number): void {
  const scroller = documentScroll();
  scroller.scrollTop = y;
  fireEvent.scroll(scroller);
}

function lastScrollY(): number | undefined {
  return scrollTo.mock.calls.at(-1)?.[0]?.top;
}

function storePosition(y: number): void {
  window.localStorage.setItem(KEY, JSON.stringify([{ path: file.path, y }]));
}

it('opens a file where it was scrolled to', async () => {
  storePosition(400);
  await renderPanel();

  layOut(VIEW_HEIGHT, 2000);

  expect(lastScrollY()).toBe(400);
});

it('waits for the content to grow tall enough', async () => {
  storePosition(900);
  await renderPanel();

  layOut(VIEW_HEIGHT, 1000);
  expect(lastScrollY()).toBe(400);

  layOut(VIEW_HEIGHT, 2000);
  expect(lastScrollY()).toBe(900);
});

it('stops when the person scrolls first', async () => {
  storePosition(900);
  await renderPanel();

  layOut(VIEW_HEIGHT, 1000);
  scroll(120);
  scrollTo.mockClear();
  layOut(VIEW_HEIGHT, 2000);

  expect(scrollTo).not.toHaveBeenCalled();
});

it('stores the position once the scrolling stops', async () => {
  vi.useFakeTimers();
  await renderPanel();

  scroll(250);
  await act(() => vi.advanceTimersByTimeAsync(350));

  expect(JSON.parse(window.localStorage.getItem(KEY) ?? '[]')).toEqual([
    { path: file.path, y: 250 },
  ]);
});
