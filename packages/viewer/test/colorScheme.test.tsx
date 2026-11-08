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
  renderViewer,
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
      <TopAppBar isSidebarVisible onToggleSidebar={() => {}} actions={null}>
        <DocumentPanel
          file={file}
          isSidebarVisible
          canGoBack={false}
          canGoNext={false}
          onBack={() => {}}
          onNext={() => {}}
          onOpenFile={() => {}}
          isToolbarVisible
          isFindVisible
          onShowFind={() => {}}
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

it('sits after Zoom, before the editor button, under a label', async () => {
  await renderPanel();
  const system = schemeButton('System color scheme');
  const zoom = screen.getByRole('group', { name: 'Zoom' });
  const toolbars = document.querySelectorAll('m3e-toolbar');

  expect(system.closest('m3e-app-bar')).toBeNull();
  expect(follows(zoom, system)).toBe(true);
  expect(system.closest('m3e-toolbar')).toBe(toolbars[toolbars.length - 2]);
  expect(screen.getByRole('group', { name: 'Theme' })).toContainElement(system);
});

it('shows with no file open', async () => {
  await renderViewer(createFakePlatform());

  expect(screen.queryByRole('heading', { name: 'notes.md' })).toBeNull();
  expect(schemeButton('System color scheme')).toBeInTheDocument();
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
