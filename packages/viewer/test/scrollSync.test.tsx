/**
 * The source editor and the preview scrolling together, by fraction.
 */

import { fireEvent, screen } from '@testing-library/react';

import { followingScrollTop } from '../src/scrollSync';
import {
  createFakePlatform,
  renderViewer,
  settle,
  storeSession,
} from './fakePlatform';

describe('followingScrollTop', () => {
  it('stands the target as far down as the source', () => {
    expect(
      followingScrollTop(
        { scrollTop: 250, scrollHeight: 1100, clientHeight: 100 },
        { scrollHeight: 2100, clientHeight: 100 },
      ),
    ).toBe(500);
  });

  it('keeps the target in its range', () => {
    expect(
      followingScrollTop(
        { scrollTop: 5000, scrollHeight: 1100, clientHeight: 100 },
        { scrollHeight: 600, clientHeight: 100 },
      ),
    ).toBe(500);
  });

  it('answers the top when either side cannot scroll', () => {
    expect(
      followingScrollTop(
        { scrollTop: 0, scrollHeight: 100, clientHeight: 100 },
        { scrollHeight: 600, clientHeight: 100 },
      ),
    ).toBe(0);
    expect(
      followingScrollTop(
        { scrollTop: 50, scrollHeight: 200, clientHeight: 100 },
        { scrollHeight: 80, clientHeight: 100 },
      ),
    ).toBe(0);
  });
});

/** Gives `element` a size and a scroll offset that jsdom does not lay out. */
function size(element: HTMLElement, scrollHeight: number): void {
  let top = 0;
  Object.defineProperties(element, {
    scrollHeight: { configurable: true, get: () => scrollHeight },
    clientHeight: { configurable: true, get: () => 100 },
    scrollTop: {
      configurable: true,
      get: () => top,
      set: (next: number) => {
        top = next;
      },
    },
  });
}

describe('the split view', () => {
  beforeEach(() => {
    storeSession('/notes', '/notes/notes.md');
    window.localStorage.setItem('mdviewer.editorVisible', 'true');
  });

  async function renderSplit(): Promise<{
    editor: HTMLElement;
    preview: HTMLElement;
  }> {
    await renderViewer(
      createFakePlatform(
        { '/notes': ['notes.md'] },
        { '/notes/notes.md': '# Notes' },
      ),
    );
    await settle();
    const editor = screen.getByRole('textbox', { name: 'Markdown source' });
    const preview = screen.getByTestId('document-scroll');
    size(editor, 1100);
    size(preview, 2100);
    return { editor, preview };
  }

  it('moves the preview when the editor scrolls', async () => {
    const { editor, preview } = await renderSplit();

    editor.scrollTop = 500;
    fireEvent.scroll(editor);

    expect(preview.scrollTop).toBe(1000);
  });

  it('moves the editor when the preview scrolls', async () => {
    const { editor, preview } = await renderSplit();

    preview.scrollTop = 1500;
    fireEvent.scroll(preview);

    expect(editor.scrollTop).toBe(750);
  });

  it('does not echo its own move back', async () => {
    const { editor, preview } = await renderSplit();
    editor.scrollTop = 500;
    fireEvent.scroll(editor);

    // The browser reports the preview's move; the editor must stay put.
    editor.scrollTop = 499;
    fireEvent.scroll(preview);

    expect(editor.scrollTop).toBe(499);
  });
});
