/**
 * Rereading the open file when it changes on disk.
 */

import { act, fireEvent, screen } from '@testing-library/react';

import {
  createFakePlatform,
  renderViewer,
  storeSession,
  type FakeFiles,
  type FakePlatform,
} from './fakePlatform';

const PATH = '/notes/notes.md';

let files: FakeFiles;
let platform: FakePlatform;

beforeEach(() => {
  vi.useFakeTimers();
  storeSession('/notes', PATH);
  files = { [PATH]: '# Notes', '/notes/other.md': '# Other' };
  platform = createFakePlatform({ '/notes': ['notes.md', 'other.md'] }, files);
});

afterEach(() => {
  vi.useRealTimers();
});

function editor(): HTMLTextAreaElement {
  return screen.getByRole('textbox', { name: 'Markdown source' });
}

function shows(heading: string): boolean {
  return screen.queryByRole('heading', { name: heading }) !== null;
}

async function waitOutDebounce(): Promise<void> {
  await act(() => vi.advanceTimersByTimeAsync(200));
}

async function changeOnDisk(contents: string): Promise<void> {
  files[PATH] = contents;
  act(() => {
    platform.changeFile(PATH);
  });
  await waitOutDebounce();
}

it('rerenders the open file when it changes on disk', async () => {
  await renderViewer(platform);
  expect(shows('Notes')).toBe(true);

  await changeOnDisk('# Reloaded');

  expect(shows('Reloaded')).toBe(true);
  expect(shows('Notes')).toBe(false);
});

it('keeps a draft and says so when disk changes under it', async () => {
  await renderViewer(platform);
  fireEvent.click(screen.getByRole('button', { name: 'Show editor' }));
  fireEvent.change(editor(), { target: { value: '# Changed' } });
  await waitOutDebounce();

  await changeOnDisk('# Reloaded');

  expect(editor()).toHaveValue('# Changed');
  expect(shows('Changed')).toBe(true);
  expect(shows('Reloaded')).toBe(false);
  expect(
    screen.getByText('— edited, not saved — file changed on disk'),
  ).toBeInTheDocument();
});
