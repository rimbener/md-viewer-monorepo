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
      '/notes': ['start.md', 'a/'],
      '/notes/a': ['b/'],
      '/notes/a/b': ['c/'],
      '/notes/a/b/c': ['deep.md'],
    },
    { '/notes/start.md': START, '/notes/a/b/c/deep.md': '# Deep' },
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
