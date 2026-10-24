import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '../src/App';

afterEach(() => {
  delete (window as { showDirectoryPicker?: unknown }).showDirectoryPicker;
  window.history.replaceState(null, '', '/');
  vi.unstubAllGlobals();
});

test('says the browser is not compatible when it cannot open folders', () => {
  render(<App />);

  expect(
    screen.getByRole('heading', { name: 'Browser not compatible' }),
  ).toBeInTheDocument();
  expect(screen.queryByText('Choose Folder…')).toBeNull();
});

test('still opens a document by URL there', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('# From the web')),
  );
  render(<App />);

  await userEvent.type(
    screen.getByLabelText('Markdown URL'),
    'https://example.com/docs/README.md',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Open URL' }));
  for (let pass = 0; pass < 6; pass += 1) {
    await act(async () => {});
  }

  expect(window.location.search).toBe(
    `?src=${encodeURIComponent('https://example.com/docs/README.md')}`,
  );
  expect(
    screen.getByRole('heading', { name: 'From the web' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/This browser cannot open folders/),
  ).toBeInTheDocument();
});

test('shows the viewer where folders can be opened', async () => {
  window.showDirectoryPicker = vi.fn(async () => {
    throw new DOMException('no click', 'SecurityError');
  });
  await act(async () => {
    render(<App />);
  });

  expect(
    screen.getByRole('button', { name: 'Choose Folder…' }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('Markdown URL')).toBeInTheDocument();
});
