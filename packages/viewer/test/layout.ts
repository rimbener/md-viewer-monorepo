/** jsdom lays nothing out, so this sizes the document scroll view instead. */

import { act, screen } from '@testing-library/react';
import type { Mock } from 'vitest';

const SCROLL_TEST_ID = 'document-scroll';

const heights = { view: 0, content: 0 };
const notices = new Set<() => void>();

class FakeResizeObserver {
  private readonly notify: () => void;

  constructor(callback: ResizeObserverCallback) {
    this.notify = () => callback([], this as unknown as ResizeObserver);
  }

  observe() {
    notices.add(this.notify);
  }

  unobserve() {}

  disconnect() {
    notices.delete(this.notify);
  }
}

function heightOf(element: HTMLElement): number {
  if (element.dataset.testid === SCROLL_TEST_ID) {
    return heights.view;
  }
  return element.parentElement?.dataset.testid === SCROLL_TEST_ID
    ? heights.content
    : 0;
}

/** Stubs layout for one test. Returns the `scrollTo` every element calls. */
export function stubLayout(): Mock<(options: ScrollToOptions) => void> {
  heights.view = 0;
  heights.content = 0;
  notices.clear();
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(
    function (this: HTMLElement) {
      return heightOf(this);
    },
  );
  const scrollTo = vi.fn<(options: ScrollToOptions) => void>();
  Element.prototype.scrollTo = scrollTo as unknown as Element['scrollTo'];
  return scrollTo;
}

export function unstubLayout(): void {
  vi.unstubAllGlobals();
  delete (Element.prototype as Partial<Element>).scrollTo;
}

/** Sizes the view and its content, and tells every observer. */
export function layOut(
  viewHeight: number,
  contentHeight = heights.content,
): void {
  heights.view = viewHeight;
  heights.content = contentHeight;
  act(() => {
    notices.forEach(notify => notify());
  });
}

export function documentScroll(): HTMLElement {
  return screen.getByTestId(SCROLL_TEST_ID);
}
