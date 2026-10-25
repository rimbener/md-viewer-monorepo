/**
 * The color scheme control on the file name row.
 */

import { screen } from '@testing-library/react';

import { ColorSchemeProvider } from '../src/components/ColorSchemeProvider';
import { DocumentPanel } from '../src/components/DocumentPanel';
import { storage } from '../src/storage';
import type { FileNode } from '../src/types';
import { css } from './dom';
import {
  createFakePlatform,
  press,
  renderWithPlatform,
  settle,
} from './fakePlatform';

const file: FileNode = {
  kind: 'file',
  name: 'notes.md',
  path: '/notes/notes.md',
};

beforeEach(() => {
  // jsdom has no matchMedia; the system here prefers light.
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.style.colorScheme = '';
});

async function renderPanel(): Promise<void> {
  renderWithPlatform(
    <ColorSchemeProvider>
      <DocumentPanel
        file={file}
        isSidebarVisible
        onToggleSidebar={() => {}}
        canGoBack={false}
        canGoNext={false}
        onBack={() => {}}
        onNext={() => {}}
      />
    </ColorSchemeProvider>,
    createFakePlatform({}, { '/notes/notes.md': '# Notes' }),
  );
  await settle();
}

function nameColor(): string {
  return screen.getByRole('heading', { name: 'notes.md' }).style.color;
}

function schemeButton(label: string): HTMLElement {
  return screen.getByRole('button', { name: label });
}

function follows(first: Node, second: Node): boolean {
  return (
    (first.compareDocumentPosition(second) &
      Node.DOCUMENT_POSITION_FOLLOWING) !==
    0
  );
}

it('sits on the file name row, to the right of the name', async () => {
  await renderPanel();
  const name = screen.getByRole('heading', { name: 'notes.md' });
  const system = schemeButton('System color scheme');
  const history = screen.getByText('History');

  expect(follows(name, system)).toBe(true);
  expect(follows(system, history)).toBe(true);
});

it('starts on System and switches the document to dark', async () => {
  await renderPanel();

  expect(schemeButton('System color scheme')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(nameColor()).toBe(css('color', '#1A2536'));
  expect(document.documentElement.style.colorScheme).toBe('light dark');

  await press(schemeButton('Dark color scheme'));

  expect(nameColor()).toBe(css('color', '#ececee'));
  expect(schemeButton('Dark color scheme')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(document.documentElement.style.colorScheme).toBe('dark');
  expect(storage.setItem).toHaveBeenCalledWith('mdviewer.colorScheme', 'dark');
});

it('restores a stored scheme', async () => {
  window.localStorage.setItem('mdviewer.colorScheme', 'dark');

  await renderPanel();

  expect(nameColor()).toBe(css('color', '#ececee'));
  expect(document.documentElement.style.colorScheme).toBe('dark');
});
