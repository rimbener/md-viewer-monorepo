/**
 * Following links in a document: web links go to the browser, markdown files
 * open in the viewer.
 */

import { screen } from '@testing-library/react';

import {
  createFakePlatform,
  press,
  renderViewer,
  storeSession,
} from './fakePlatform';

const START =
  '# Start\n\n[Site](https://example.com) [Deep](a/b/c/deep.md) [Data](data.csv)';

function setup() {
  storeSession('/notes', '/notes/start.md');
  return createFakePlatform(
    {
      '/notes': ['start.md', 'a/', 'z/'],
      '/notes/z': ['y/'],
      '/notes/z/y': ['last.md'],
      '/notes/a': ['b/'],
      '/notes/a/b': ['c/'],
      '/notes/a/b/c': ['deep.md'],
    },
    {
      '/notes/start.md': START,
      '/notes/a/b/c/deep.md': '# Deep\n\n[Out](../../../../other/out.md)',
      '/other/out.md': '# Out',
    },
  );
}

it('opens a web link in the browser', async () => {
  const platform = setup();
  await renderViewer(platform);

  await press(screen.getByRole('link', { name: 'Site' }));

  expect(platform.openLink).toHaveBeenCalledWith('https://example.com');
  expect(screen.getByRole('heading', { name: 'Start' })).toBeInTheDocument();
});

it('opens a linked markdown file in the viewer and shows it in the tree', async () => {
  const platform = setup();
  await renderViewer(platform);

  await press(screen.getByRole('link', { name: 'Deep' }));

  expect(screen.getByRole('heading', { name: 'Deep' })).toBeInTheDocument();
  expect(screen.getByRole('treeitem', { name: 'deep.md' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  for (const folder of ['/notes/a', '/notes/a/b', '/notes/a/b/c']) {
    const item = document.querySelector<HTMLElement & { open: boolean }>(
      `m3e-tree-item[data-path="${folder}"]`,
    );
    expect(item?.open).toBe(true);
  }
  expect(platform.openLink).not.toHaveBeenCalled();

  await press(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('heading', { name: 'Start' })).toBeInTheDocument();
});

it('does nothing for a link to another kind of local file', async () => {
  const platform = setup();
  await renderViewer(platform);

  await press(screen.getByRole('link', { name: 'Data' }));

  expect(platform.openLink).not.toHaveBeenCalled();
  expect(screen.getByRole('heading', { name: 'Start' })).toBeInTheDocument();
});

it('leaves a folder closed after the tree changes', async () => {
  const platform = setup();
  await renderViewer(platform);
  await press(screen.getByRole('link', { name: 'Deep' }));
  const folder = (path: string) =>
    document.querySelector<HTMLElement & { open: boolean }>(
      `m3e-tree-item[data-path="${path}"]`,
    )!;

  folder('/notes/a/b/c').open = false;
  await press(folder('/notes/z'));

  expect(folder('/notes/z/y')).not.toBeNull();
  expect(folder('/notes/a/b/c').open).toBe(false);
});

it('opens the folders again on a return from a file outside the tree', async () => {
  const platform = setup();
  await renderViewer(platform);
  await press(screen.getByRole('link', { name: 'Deep' }));
  const folder = () =>
    document.querySelector<HTMLElement & { open: boolean }>(
      'm3e-tree-item[data-path="/notes/a/b/c"]',
    )!;
  folder().open = false;

  await press(screen.getByRole('link', { name: 'Out' }));
  expect(screen.getByRole('heading', { name: 'Out' })).toBeInTheDocument();
  await press(screen.getByRole('button', { name: 'Back' }));

  expect(screen.getByRole('heading', { name: 'Deep' })).toBeInTheDocument();
  expect(folder().open).toBe(true);
});

it('shows the file outside the folder again on Next', async () => {
  await renderViewer(setup());
  await press(screen.getByRole('link', { name: 'Deep' }));
  await press(screen.getByRole('link', { name: 'Out' }));

  await press(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('heading', { name: 'Deep' })).toBeInTheDocument();
  await press(screen.getByRole('button', { name: 'Next' }));

  expect(screen.getByRole('heading', { name: 'Out' })).toBeInTheDocument();
  expect(window.localStorage.getItem('mdviewer.lastFile')).toBe(
    '/other/out.md',
  );
});
