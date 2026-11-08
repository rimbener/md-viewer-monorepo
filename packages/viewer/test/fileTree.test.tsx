/**
 * The file tree: what it selects and how it opens files.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';

import { FileTree } from '../src/components/FileTree';
import { ThemeRoot } from '../src/components/ThemeRoot';
import { PlatformProvider } from '../src/platform';
import type { DirectoryNode } from '../src/types';
import {
  createFakePlatform,
  press,
  renderViewer,
  renderWithPlatform,
  settle,
  storeSession,
} from './fakePlatform';

beforeEach(() => {
  storeSession('/notes', '/notes/a.md');
});

async function renderNotes(): Promise<void> {
  const platform = createFakePlatform(
    { '/notes': ['a.md', 'sub/'], '/notes/sub': ['b.md'] },
    { '/notes/a.md': '# A', '/notes/sub/b.md': '# B' },
  );
  await renderViewer(platform);
}

function item(name: string): HTMLElement {
  return screen.getByRole('treeitem', { name });
}

it('keeps a folder open across renders', async () => {
  await renderNotes();
  await press(item('sub folder'));
  await press(item('b.md'));

  expect(item('sub folder')).toHaveAttribute('aria-expanded', 'true');
});

it('selects the open file and never a folder', async () => {
  await renderNotes();
  expect(item('a.md')).toHaveAttribute('aria-selected', 'true');

  await press(item('sub folder'));

  expect(item('sub folder')).not.toHaveAttribute('aria-selected', 'true');
  expect(item('a.md')).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('heading', { name: 'A' })).toBeInTheDocument();
});

it('opens a file from the keyboard', async () => {
  await renderNotes();
  const tree = screen.getByRole('tree');
  await press(item('sub folder'));

  // From the sub folder, down to b.md inside it.
  await act(async () => {
    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    fireEvent.keyDown(tree, { key: 'Enter' });
  });
  await settle();

  expect(item('b.md')).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('heading', { name: 'B' })).toBeInTheDocument();
});

describe('scrolling to the selected file', () => {
  const scrolls = vi.fn();
  beforeEach(() => {
    scrolls.mockClear();
    HTMLElement.prototype.scrollIntoView = scrolls;
  });

  function scrolledTo(): string[] {
    return scrolls.mock.instances.map(
      element => (element as HTMLElement).dataset.path ?? '',
    );
  }

  it('centers a restored file', async () => {
    await renderNotes();

    expect(scrolledTo()).toContain('/notes/a.md');
    expect(scrolls).toHaveBeenCalledWith({ block: 'center' });
  });

  it('does not center the first file picked when none was restored', async () => {
    const root: DirectoryNode = {
      kind: 'directory',
      name: 'notes',
      path: '/notes',
      children: [{ kind: 'file', name: 'x.md', path: '/notes/x.md' }],
    };
    const platform = createFakePlatform();
    const tree = (selectedPath: string | null) => (
      <PlatformProvider value={platform}>
        <ThemeRoot>
          <FileTree
            root={root}
            selectedPath={selectedPath}
            onSelectFile={() => {}}
            onSelectDirectory={() => {}}
          />
        </ThemeRoot>
      </PlatformProvider>
    );
    const { rerender } = render(tree(null));
    await settle();
    rerender(tree('/notes/x.md'));
    await settle();

    expect(scrolls).toHaveBeenCalledWith({ block: 'nearest' });
    expect(scrolls).not.toHaveBeenCalledWith({ block: 'center' });
  });

  it('scrolls to a file in a folder at the root of the disk', async () => {
    renderWithPlatform(
      <ThemeRoot>
        <FileTree
          root={{
            kind: 'directory',
            name: '/',
            path: '/',
            children: [{ kind: 'file', name: 'x.md', path: '/x.md' }],
          }}
          selectedPath="/x.md"
          onSelectFile={() => {}}
          onSelectDirectory={() => {}}
        />
      </ThemeRoot>,
    );
    await settle();

    expect(scrolledTo()).toContain('/x.md');
  });
});
