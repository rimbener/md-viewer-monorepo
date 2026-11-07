/**
 * Hiding and showing the file tree, and remembering the choice.
 */

import { fireEvent, screen } from '@testing-library/react';

import {
  createFakePlatform,
  press,
  renderViewer,
  settle,
  storeSession,
} from './fakePlatform';

beforeEach(() => {
  storeSession('/notes');
});

async function renderApp(): Promise<void> {
  await renderViewer(
    createFakePlatform(
      { '/notes': ['notes.md'] },
      { '/notes/notes.md': '# Notes' },
    ),
  );
}

function toggle(): HTMLElement {
  return screen.getByRole('button', { name: /^(Show|Hide) sidebar$/ });
}

type Drawer = HTMLElement & { start: boolean };

function drawer(): Drawer {
  return document.querySelector('m3e-drawer-container') as Drawer;
}

/** The drawer keeps the tree mounted; open or closed is the drawer's state. */
function showsTree(): boolean {
  return drawer().start && screen.queryByRole('tree') !== null;
}

it('hides the tree and brings it back', async () => {
  await renderApp();
  expect(showsTree()).toBe(true);
  expect(toggle()).toHaveAccessibleName('Hide sidebar');

  fireEvent.click(toggle());

  expect(showsTree()).toBe(false);
  // The control has to survive the panel it hides, or there is no way back.
  expect(toggle()).toHaveAccessibleName('Show sidebar');

  fireEvent.click(toggle());

  expect(showsTree()).toBe(true);
});

it.each([
  ['Command', { metaKey: true }],
  ['Control', { ctrlKey: true }],
])('toggles the tree on %s-B', async (_name, modifier) => {
  await renderApp();

  const isDefault = fireEvent.keyDown(window, { key: 'b', ...modifier });
  expect(isDefault).toBe(false);
  expect(showsTree()).toBe(false);

  fireEvent.keyDown(window, { key: 'b', ...modifier });
  expect(showsTree()).toBe(true);
});

function iconName(): string | null {
  return toggle().querySelector('m3e-icon')?.name ?? null;
}

it('points the way the sidebar will move', async () => {
  await renderApp();
  expect(toggle()).toHaveAttribute('aria-pressed', 'true');
  expect(iconName()).toBe('left_panel_close');
  expect(toggle()).toHaveStyle({ position: 'absolute', left: '-16px' });

  fireEvent.click(toggle());
  await settle();

  expect(toggle()).toHaveAttribute('aria-pressed', 'false');
  expect(iconName()).toBe('left_panel_open');
  expect(toggle()).toHaveStyle({ left: '6px' });
});

it('floats at the middle of the header, outside the tools', async () => {
  await renderApp();
  const header = toggle().closest('header') as HTMLElement;

  expect(toggle()).toHaveStyle({ top: '50%', marginTop: '-16px' });
  expect(header).toHaveStyle({ position: 'relative' });
  expect(screen.queryByText('Sidebar')).toBeNull();
});

it('moves the header clear of the button while the tree is hidden', async () => {
  await renderApp();
  const header = () => toggle().closest('header') as HTMLElement;
  expect(header()).toHaveStyle({ paddingLeft: '24px' });

  fireEvent.click(toggle());

  expect(header()).toHaveStyle({ paddingLeft: '48px' });
});

it('remembers that the tree was hidden', async () => {
  await renderApp();

  fireEvent.click(toggle());

  expect(window.localStorage.getItem('mdviewer.sidebarVisible')).toBe('false');
});

it('opens with the tree hidden when that is what was stored', async () => {
  window.localStorage.setItem('mdviewer.sidebarVisible', 'false');

  await renderApp();

  expect(showsTree()).toBe(false);
  expect(toggle()).toHaveAccessibleName('Show sidebar');
});

it('keeps the tree, and what is open in it, while hidden', async () => {
  await renderApp();
  fireEvent.click(toggle());
  await settle();

  expect(screen.getByRole('tree')).toBeInTheDocument();
  expect(drawer().start).toBe(false);
});

describe('on a narrow window', () => {
  beforeEach(() => {
    // Phone width: every max-width query matches, no min-width one does.
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: !query.includes('min-width') && query.includes('max-width'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function openDrawer(): Promise<void> {
    await renderApp();
    if (!drawer().start) {
      fireEvent.click(toggle());
      await settle();
    }
    window.localStorage.removeItem('mdviewer.sidebarVisible');
  }

  it('keeps the choice when the scrim closes the drawer', async () => {
    await openDrawer();
    // m3e reads breakpoints through an observer made before this stub.
    (drawer() as Drawer & { _startMode: string })._startMode = 'over';
    const scrim = drawer().shadowRoot!.querySelector('.scrim') as HTMLElement;

    fireEvent.click(scrim);
    await settle();

    expect(drawer().start).toBe(false);
    expect(toggle()).toHaveAccessibleName('Show sidebar');
    expect(window.localStorage.getItem('mdviewer.sidebarVisible')).toBe(
      'false',
    );
  });

  it('closes the drawer before Command-F focuses Find', async () => {
    storeSession('/notes', '/notes/notes.md');
    await openDrawer();

    fireEvent.keyDown(window, { key: 'f', metaKey: true });
    await settle();

    expect(drawer().start).toBe(false);
    expect(document.activeElement).toBe(
      screen.getByRole('textbox', { name: 'Find in document' }),
    );
  });

  it('closes the drawer after a file is picked, without keeping it', async () => {
    await openDrawer();

    await press(screen.getByRole('treeitem', { name: 'notes.md' }));

    expect(drawer().start).toBe(false);
    expect(screen.getByRole('heading', { name: 'Notes' })).toBeInTheDocument();
    expect(window.localStorage.getItem('mdviewer.sidebarVisible')).toBeNull();
  });
});

it('does not keep a close that a breakpoint made', async () => {
  await renderApp();

  drawer().start = false;
  fireEvent(drawer(), new Event('change', { bubbles: true }));
  await settle();

  expect(toggle()).toHaveAccessibleName('Show sidebar');
  expect(window.localStorage.getItem('mdviewer.sidebarVisible')).toBeNull();
});
