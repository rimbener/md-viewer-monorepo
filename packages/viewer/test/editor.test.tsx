/**
 * Opening the source editor, and the rendered document following what is
 * typed into it.
 */

import { act, fireEvent, screen } from '@testing-library/react';

import {
  createFakePlatform,
  renderViewer,
  settle,
  storeSession,
} from './fakePlatform';

beforeEach(() => {
  vi.useFakeTimers();
  storeSession('/notes', '/notes/notes.md');
});

afterEach(() => {
  vi.useRealTimers();
});

async function renderApp(): Promise<void> {
  await renderViewer(
    createFakePlatform(
      { '/notes': ['notes.md', 'other.md'] },
      { '/notes/notes.md': '# Notes', '/notes/other.md': '# Other' },
    ),
  );
}

function toggle(): HTMLElement {
  return screen.getByRole('button', { name: /^(Show|Hide) editor$/ });
}

function editor(): HTMLTextAreaElement {
  return screen.getByRole('textbox', { name: 'Markdown source' });
}

function hasEditor(): boolean {
  return screen.queryByRole('textbox', { name: 'Markdown source' }) !== null;
}

function shows(heading: string): boolean {
  return screen.queryByRole('heading', { name: heading }) !== null;
}

/** Types into the editor, without waiting for the preview to catch up. */
function type(source: string): void {
  fireEvent.change(editor(), { target: { value: source } });
}

/** Waits out the debounce, so the preview holds what was last typed. */
async function waitForPreview(): Promise<void> {
  await act(() => vi.advanceTimersByTimeAsync(200));
}

async function open(name: string): Promise<void> {
  fireEvent.click(screen.getByRole('treeitem', { name }));
  await settle();
}

it('opens the editor beside the document and closes it again', async () => {
  await renderApp();
  expect(hasEditor()).toBe(false);
  expect(toggle()).toHaveAccessibleName('Show editor');

  fireEvent.click(toggle());

  expect(editor()).toHaveValue('# Notes');
  // The document stays on screen: the editor is a second pane, not a mode.
  expect(shows('Notes')).toBe(true);
  expect(toggle()).toHaveAccessibleName('Hide editor');

  fireEvent.click(toggle());

  expect(hasEditor()).toBe(false);
});

it('rerenders the document as the source is typed', async () => {
  await renderApp();
  fireEvent.click(toggle());

  type('# Changed');
  await waitForPreview();

  expect(shows('Changed')).toBe(true);
  expect(shows('Notes')).toBe(false);
});

it('holds the preview while the typing continues', async () => {
  await renderApp();
  fireEvent.click(toggle());

  type('# Cha');
  type('# Chang');
  type('# Changed');

  // The editor takes every keystroke; the document waits for the pause.
  expect(editor()).toHaveValue('# Changed');
  expect(shows('Notes')).toBe(true);

  await waitForPreview();

  expect(shows('Changed')).toBe(true);
  expect(shows('Notes')).toBe(false);
});

it('remembers that the editor was open', async () => {
  await renderApp();

  fireEvent.click(toggle());

  expect(window.localStorage.getItem('mdviewer.editorVisible')).toBe('true');
});

it('opens with the editor showing when that is what was stored', async () => {
  window.localStorage.setItem('mdviewer.editorVisible', 'true');

  await renderApp();

  expect(hasEditor()).toBe(true);
});

it('keeps edits when another file is opened and comes back to them', async () => {
  await renderApp();
  fireEvent.click(toggle());
  type('# Changed');
  await waitForPreview();

  await open('other.md');
  expect(editor()).toHaveValue('# Other');

  await open('notes.md');
  expect(editor()).toHaveValue('# Changed');
  expect(shows('Changed')).toBe(true);
});

it('says so when the buffer no longer matches the file on disk', async () => {
  await renderApp();
  expect(
    screen.getByRole('heading', { level: 1, name: 'notes.md' }),
  ).toBeInTheDocument();
  expect(screen.queryByText(/edited, not saved/)).toBeNull();

  fireEvent.click(toggle());
  type('# Changed');

  expect(screen.getByText('— edited, not saved')).toBeInTheDocument();
});
