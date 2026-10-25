/**
 * Opening the source editor, and the rendered document following what is
 * typed into it.
 */

import { act, fireEvent, screen } from '@testing-library/react';

import {
  createFakePlatform,
  type FakePlatform,
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

async function renderApp(): Promise<FakePlatform> {
  const platform = createFakePlatform(
    { '/notes': ['notes.md', 'other.md'] },
    { '/notes/notes.md': '# Notes', '/notes/other.md': '# Other' },
  );
  await renderViewer(platform);
  return platform;
}

function saveButton(): HTMLElement | null {
  return screen.queryByRole('button', { name: 'Save' });
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

it('shows Save only while the editor is open', async () => {
  await renderApp();
  expect(saveButton()).toBeNull();

  fireEvent.click(toggle());
  expect(saveButton()).toBeDisabled();

  type('# Changed');
  expect(saveButton()).toBeEnabled();

  fireEvent.click(toggle());
  expect(saveButton()).toBeNull();
});

it('writes the buffer to disk and clears the unsaved mark', async () => {
  const platform = await renderApp();
  fireEvent.click(toggle());
  type('# Changed');

  fireEvent.click(saveButton() as HTMLElement);
  await settle();

  expect(platform.writeFile).toHaveBeenCalledWith(
    '/notes/notes.md',
    '# Changed',
  );
  expect(screen.queryByText(/edited, not saved/)).toBeNull();
  expect(saveButton()).toBeDisabled();
  expect(editor()).toHaveValue('# Changed');

  // The watcher sees the app's own write; it is not a change under a buffer.
  platform.changeFile('/notes/notes.md');
  await act(() => vi.advanceTimersByTimeAsync(200));
  expect(screen.queryByText(/file changed on disk/)).toBeNull();
});

it('keeps the buffer and says why when the save fails', async () => {
  const platform = await renderApp();
  platform.writeFile.mockRejectedValueOnce(new Error('Disk full.'));
  fireEvent.click(toggle());
  type('# Changed');

  fireEvent.click(saveButton() as HTMLElement);
  await settle();

  expect(
    screen.getByText('— edited, not saved — Disk full.'),
  ).toBeInTheDocument();
  expect(editor()).toHaveValue('# Changed');
  expect(saveButton()).toBeEnabled();
});

function undoButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Undo' });
}

function redoButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Redo' });
}

/** Types `source`, then waits long enough that the next edit is a new step. */
async function typeStep(source: string): Promise<void> {
  type(source);
  await act(() => vi.advanceTimersByTimeAsync(1100));
}

it('shows Undo and Redo only while the editor is open', async () => {
  await renderApp();
  expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();

  fireEvent.click(toggle());

  expect(undoButton()).toBeDisabled();
  expect(redoButton()).toBeDisabled();
});

it('takes edits back and puts them back with the buttons', async () => {
  await renderApp();
  fireEvent.click(toggle());
  await typeStep('# One');
  await typeStep('# Two');

  fireEvent.click(undoButton());
  expect(editor()).toHaveValue('# One');
  expect(redoButton()).toBeEnabled();

  fireEvent.click(undoButton());
  expect(editor()).toHaveValue('# Notes');
  // Back to what is on disk, so there is nothing left to save.
  expect(screen.queryByText(/edited, not saved/)).toBeNull();
  expect(undoButton()).toBeDisabled();

  fireEvent.click(redoButton());
  fireEvent.click(redoButton());
  expect(editor()).toHaveValue('# Two');
  await waitForPreview();
  expect(shows('Two')).toBe(true);
});

it('undoes and redoes from the keyboard', async () => {
  await renderApp();
  fireEvent.click(toggle());
  await typeStep('# One');

  fireEvent.keyDown(editor(), { key: 'z', metaKey: true });
  expect(editor()).toHaveValue('# Notes');

  fireEvent.keyDown(editor(), { key: 'z', metaKey: true, shiftKey: true });
  expect(editor()).toHaveValue('# One');

  fireEvent.keyDown(editor(), { key: 'z', ctrlKey: true });
  fireEvent.keyDown(editor(), { key: 'y', ctrlKey: true });
  expect(editor()).toHaveValue('# One');
});

it('takes back a burst of typing in one step', async () => {
  await renderApp();
  fireEvent.click(toggle());
  type('# N');
  type('# Ne');
  type('# New');

  fireEvent.click(undoButton());

  expect(editor()).toHaveValue('# Notes');
});

it('keeps each file its own history', async () => {
  await renderApp();
  fireEvent.click(toggle());
  await typeStep('# Changed');

  await open('other.md');
  expect(undoButton()).toBeDisabled();

  await open('notes.md');
  fireEvent.click(undoButton());
  expect(editor()).toHaveValue('# Notes');
});

it('undoes past a save', async () => {
  await renderApp();
  fireEvent.click(toggle());
  await typeStep('# Changed');
  fireEvent.click(saveButton() as HTMLElement);
  await settle();

  fireEvent.click(undoButton());

  expect(editor()).toHaveValue('# Notes');
  expect(screen.getByText('— edited, not saved')).toBeInTheDocument();
});

it.each([
  ['Command', { metaKey: true }],
  ['Control', { ctrlKey: true }],
])('saves on %s-S', async (_name, modifier) => {
  const platform = await renderApp();
  fireEvent.click(toggle());
  type('# Changed');

  let isDefault = true;
  await act(async () => {
    isDefault = fireEvent.keyDown(window, { key: 's', ...modifier });
  });
  await settle();

  expect(platform.writeFile).toHaveBeenCalledWith(
    '/notes/notes.md',
    '# Changed',
  );
  // The browser's own save would otherwise open over the page.
  expect(isDefault).toBe(false);
  expect(screen.queryByText(/edited, not saved/)).toBeNull();
});

it('writes nothing on Command-S with nothing to save', async () => {
  const platform = await renderApp();
  fireEvent.click(toggle());

  const isDefault = fireEvent.keyDown(window, { key: 's', metaKey: true });

  expect(platform.writeFile).not.toHaveBeenCalled();
  expect(isDefault).toBe(false);
});

it('writes nothing on Command-S while the editor is closed', async () => {
  const platform = await renderApp();
  fireEvent.click(toggle());
  type('# Changed');
  fireEvent.click(toggle());

  fireEvent.keyDown(window, { key: 's', metaKey: true });
  await settle();

  expect(platform.writeFile).not.toHaveBeenCalled();
});
