import { screen } from '@testing-library/react';

import { createFakePlatform, renderViewer, storeSession } from './fakePlatform';

test('reopens the stored folder and file, and renders its markdown', async () => {
  storeSession('/notes', '/notes/notes.md');
  const platform = createFakePlatform(
    { '/notes': ['notes.md', 'todo.md'] },
    { '/notes/notes.md': '# Hello\n\nSome **bold** text.' },
  );

  await renderViewer(platform);

  expect(
    screen.getByRole('heading', { level: 1, name: 'notes.md' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument();
  expect(screen.getByText('bold').tagName).toBe('STRONG');
  expect(screen.getByText('2 markdown files')).toBeInTheDocument();
  expect(platform.askForFolder).not.toHaveBeenCalled();
});

test('renders with nothing stored', async () => {
  await renderViewer(createFakePlatform());

  expect(screen.getByText('No folder selected yet.')).toBeInTheDocument();
  expect(
    screen.getByText('Select a markdown file from the sidebar.'),
  ).toBeInTheDocument();
});
