/**
 * The color scheme control in the top app bar.
 */

import { screen } from '@testing-library/react';

import { ThemeRoot } from '../src/components/ThemeRoot';
import { DocumentPanel } from '../src/components/DocumentPanel';
import { TopAppBar } from '../src/components/TopAppBar';
import { storage } from '../src/storage';
import type { FileNode } from '../src/types';
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
    <ThemeRoot>
      <TopAppBar isSidebarVisible onToggleSidebar={() => {}}>
        <DocumentPanel
          file={file}
          isSidebarVisible
          onToggleSidebar={() => {}}
          canGoBack={false}
          canGoNext={false}
          onBack={() => {}}
          onNext={() => {}}
        />
      </TopAppBar>
    </ThemeRoot>,
    createFakePlatform({}, { '/notes/notes.md': '# Notes' }),
  );
  await settle();
}

function m3Scheme(): string | undefined {
  return document.querySelector('m3e-theme')?.scheme;
}

function schemeButton(label: string): HTMLElement {
  return screen.getByRole('radio', { name: label });
}

function follows(first: Node, second: Node): boolean {
  return (
    (first.compareDocumentPosition(second) &
      Node.DOCUMENT_POSITION_FOLLOWING) !==
    0
  );
}

it('sits in the top app bar, to the right of the name', async () => {
  await renderPanel();
  const name = screen.getByRole('heading', { name: 'notes.md' });
  const system = schemeButton('System color scheme');
  const history = screen.getByRole('button', { name: 'Back' });

  expect(follows(name, system)).toBe(true);
  expect(follows(system, history)).toBe(true);
});

it('starts on System and switches the document to dark', async () => {
  await renderPanel();

  expect(schemeButton('System color scheme')).toHaveAttribute(
    'aria-checked',
    'true',
  );
  expect(m3Scheme()).toBe('auto');
  expect(document.documentElement.style.colorScheme).toBe('light dark');

  await press(schemeButton('Dark color scheme'));

  expect(m3Scheme()).toBe('dark');
  expect(schemeButton('Dark color scheme')).toHaveAttribute(
    'aria-checked',
    'true',
  );
  expect(document.documentElement.style.colorScheme).toBe('dark');
  expect(storage.setItem).toHaveBeenCalledWith('mdviewer.colorScheme', 'dark');
});

it('restores a stored scheme', async () => {
  window.localStorage.setItem('mdviewer.colorScheme', 'dark');

  await renderPanel();

  expect(m3Scheme()).toBe('dark');
  expect(document.documentElement.style.colorScheme).toBe('dark');
});
