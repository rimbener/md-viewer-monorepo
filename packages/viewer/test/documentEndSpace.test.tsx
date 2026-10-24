/**
 * Blank space after the last line. Full scroll leaves that line 300 px
 * below the top of the view.
 */

import { fireEvent, screen } from '@testing-library/react';

import { DocumentPanel } from '../src/components/DocumentPanel';
import type { FileNode } from '../src/types';
import { createFakePlatform, renderWithPlatform, settle } from './fakePlatform';
import { documentScroll, layOut, stubLayout, unstubLayout } from './layout';

/** Full scroll leaves the last line this far below the top of the view. */
const LAST_LINE_INSET = 300;

const file: FileNode = {
  kind: 'file',
  name: 'notes.md',
  path: '/notes/notes.md',
};

beforeEach(() => {
  stubLayout();
});

afterEach(() => {
  unstubLayout();
});

async function renderPanel(): Promise<void> {
  renderWithPlatform(
    <DocumentPanel
      file={file}
      isSidebarVisible
      onToggleSidebar={() => {}}
      canGoBack={false}
      canGoNext={false}
      onBack={() => {}}
      onNext={() => {}}
    />,
    createFakePlatform({}, { [file.path]: 'Last line of the note.' }),
  );
  await settle();
}

function px(value: string): number {
  return Number.parseFloat(value);
}

/** The line height of the last text in the document. */
function lastLineHeight(): number {
  const styled = [...documentScroll().querySelectorAll<HTMLElement>('*')]
    .map(element => element.style.lineHeight)
    .filter(lineHeight => lineHeight !== '');
  if (styled.length === 0) {
    throw new Error('The document has no line.');
  }
  return px(styled[styled.length - 1]);
}

/** Space under the last line, padding included. */
function spaceUnderText(): number {
  const content = documentScroll().firstElementChild as HTMLElement;
  return px(content.style.paddingBottom);
}

function expectedSpace(viewHeight: number): number {
  return viewHeight - lastLineHeight() - LAST_LINE_INSET;
}

it('leaves the last line 300 px below the top of the view', async () => {
  await renderPanel();

  layOut(640);

  expect(spaceUnderText()).toBe(expectedSpace(640));
});

it('keeps that space when the view changes height', async () => {
  await renderPanel();

  layOut(640);
  layOut(800);

  expect(spaceUnderText()).toBe(expectedSpace(800));
});

it('shrinks the space when the line grows', async () => {
  await renderPanel();
  layOut(640);
  const before = lastLineHeight();

  fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));

  expect(lastLineHeight()).toBeGreaterThan(before);
  expect(spaceUnderText()).toBe(expectedSpace(640));
});
