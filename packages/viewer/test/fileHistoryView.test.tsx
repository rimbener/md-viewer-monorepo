/**
 * Back and Next through the files opened in the current folder, and the list
 * that remembers them for that folder.
 */

import { act, screen } from '@testing-library/react';

import {
  createFakePlatform,
  press,
  renderViewer,
  storeSession,
  type FakePlatform,
} from './fakePlatform';

function historyPlatform(): FakePlatform {
  const platform = createFakePlatform({
    '/notes': ['a.md', 'b.md', 'c.md'],
    '/docs': ['d.md', 'e.md'],
  });
  platform.readFile.mockImplementation(async path => `# ${path}`);
  return platform;
}

function button(name: string) {
  return screen.getByRole('button', { name });
}

function heading(path: string) {
  return screen.queryByRole('heading', { level: 1, name: path });
}

async function openFile(name: string): Promise<void> {
  await press(screen.getByRole('treeitem', { name }));
}

beforeEach(() => {
  storeSession('/notes', '/notes/a.md');
});

it('moves back and next through files opened in this folder', async () => {
  await renderViewer(historyPlatform());
  expect(button('Back')).toBeDisabled();
  expect(button('Next')).toBeDisabled();

  await openFile('b.md');
  expect(heading('/notes/b.md')).toBeInTheDocument();
  expect(button('Back')).toBeEnabled();

  await press(button('Back'));
  expect(heading('/notes/a.md')).toBeInTheDocument();
  expect(button('Next')).toBeEnabled();

  await press(button('Next'));
  expect(heading('/notes/b.md')).toBeInTheDocument();
});

it('drops the forward files when a different file is opened after Back', async () => {
  await renderViewer(historyPlatform());
  await openFile('b.md');
  await press(button('Back'));
  await openFile('c.md');

  expect(button('Next')).toBeDisabled();
  await press(button('Back'));
  expect(heading('/notes/a.md')).toBeInTheDocument();
});

it('restores the list for this folder on the next launch', async () => {
  const { unmount } = await renderViewer(historyPlatform());
  await openFile('b.md');
  await press(button('Back'));
  await act(async () => {
    unmount();
  });

  await renderViewer(historyPlatform());
  expect(heading('/notes/a.md')).toBeInTheDocument();
  await press(button('Next'));
  expect(heading('/notes/b.md')).toBeInTheDocument();
});

it('keeps a separate list for each folder', async () => {
  const platform = historyPlatform();
  await renderViewer(platform);
  await openFile('b.md');

  platform.askForFolder.mockResolvedValueOnce('/docs');
  await press(button('Change Folder…'));
  await openFile('d.md');
  await openFile('e.md');
  await press(button('Back'));
  expect(heading('/docs/d.md')).toBeInTheDocument();

  platform.askForFolder.mockResolvedValueOnce('/notes');
  await press(button('Change Folder…'));
  expect(heading('/notes/b.md')).toBeInTheDocument();
  await press(button('Back'));
  expect(heading('/notes/a.md')).toBeInTheDocument();
  expect(heading('/docs/d.md')).not.toBeInTheDocument();
});
