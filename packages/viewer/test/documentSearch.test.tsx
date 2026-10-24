/**
 * Finding text in the open document.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';

import { parseMarkdown } from '@md-viewer/markdown/parseBlocks';

import { Markdown } from '../src/components/Markdown';
import { FindProvider } from '../src/find';
import { PlatformProvider } from '../src/platform';
import { createFakePlatform, renderViewer, storeSession } from './fakePlatform';

const SOURCE = ['# Title', '', 'alpha is here', '', 'and alpha again'].join(
  '\n',
);

const HIT = '#ffe08a';
const CURRENT = '#f5a524';

beforeEach(() => {
  storeSession('/notes', '/notes/notes.md');
});

async function renderApp(): Promise<void> {
  await renderViewer(
    createFakePlatform(
      { '/notes': ['notes.md'] },
      { '/notes/notes.md': SOURCE },
    ),
  );
}

function findField(): HTMLInputElement {
  return screen.getByRole('textbox', { name: 'Find in document' });
}

function hits(content: string): HTMLElement[] {
  return [
    ...document.querySelectorAll<HTMLElement>('mark[data-find-hit]'),
  ].filter(mark => mark.textContent === content);
}

function expectBackgrounds(content: string, colors: string[]): void {
  const marks = hits(content);
  expect(marks).toHaveLength(colors.length);
  marks.forEach((mark, index) =>
    expect(mark).toHaveStyle({ backgroundColor: colors[index] }),
  );
}

it('names each tool', async () => {
  await renderApp();

  ['Sidebar', 'History', 'Editor', 'Font', 'Width', 'Zoom', 'Find'].forEach(
    title => expect(screen.getByText(title)).toBeInTheDocument(),
  );
});

it('places the field last in the header', async () => {
  await renderApp();
  const zoomIn = screen.getByRole('button', { name: 'Zoom in' });

  expect(
    zoomIn.compareDocumentPosition(findField()) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(findField().tagName).toBe('INPUT');
});

it('marks hits and moves the current one', async () => {
  const user = userEvent.setup();
  await renderApp();

  await user.type(findField(), 'alpha');

  expect(screen.getByLabelText('Match 1 of 2')).toBeInTheDocument();
  expectBackgrounds('alpha', [CURRENT, HIT]);

  await user.click(screen.getByRole('button', { name: 'Next match' }));

  expect(screen.getByLabelText('Match 2 of 2')).toBeInTheDocument();
  expectBackgrounds('alpha', [HIT, CURRENT]);
});

it('moves with the down arrow in the field', async () => {
  const user = userEvent.setup();
  await renderApp();
  await user.type(findField(), 'alpha');

  await user.keyboard('{ArrowDown}');

  expect(screen.getByLabelText('Match 2 of 2')).toBeInTheDocument();
  expectBackgrounds('alpha', [HIT, CURRENT]);
});

it('matches without regard to letter case', async () => {
  const user = userEvent.setup();
  await renderApp();

  await user.type(findField(), 'ALPHA');

  expect(screen.getByLabelText('Match 1 of 2')).toBeInTheDocument();
  expect(hits('alpha')).toHaveLength(2);
});

it('clears the marks', async () => {
  const user = userEvent.setup();
  await renderApp();
  await user.type(findField(), 'alpha');

  await user.click(screen.getByRole('button', { name: 'Clear find' }));

  expect(hits('alpha')).toEqual([]);
  expect(findField()).toHaveValue('');
});

function Probe({
  source,
  query,
  onCount,
}: {
  source: string;
  query: string;
  onCount: (count: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <PlatformProvider value={createFakePlatform()}>
      <FindProvider
        query={query}
        active={0}
        scrollRef={scrollRef}
        onCount={onCount}
      >
        <div ref={scrollRef}>
          <Markdown blocks={parseMarkdown(source)} basePath="/notes" />
        </div>
      </FindProvider>
    </PlatformProvider>
  );
}

function countFor(source: string, query: string): number {
  let count = -1;
  const { unmount } = render(
    <Probe
      source={source}
      query={query}
      onCount={next => {
        count = next;
      }}
    />,
  );
  unmount();
  return count;
}

it('does not join a hit across bold and plain text', () => {
  expect(countFor('**al**pha', 'alpha')).toBe(0);
});

it('marks text inside a code fence', () => {
  expect(countFor('```\nalpha\n```', 'alpha')).toBe(1);
});

it('marks text inside a gherkin step', () => {
  expect(
    countFor('```gherkin\nFeature: Cart\n  Given alpha\n```', 'alpha'),
  ).toBe(1);
});
