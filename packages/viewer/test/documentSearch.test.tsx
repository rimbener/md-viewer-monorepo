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

it('explains the tools in tooltips, not in titles above them', async () => {
  await renderApp();
  const tipFor = (control: HTMLElement) =>
    Array.from(document.querySelectorAll('m3e-tooltip')).find(
      tip => (tip as HTMLElement & { htmlFor: string }).htmlFor === control.id,
    );

  ['History', 'Font', 'Width', 'Zoom', 'Find'].forEach(title =>
    expect(screen.queryByText(title, { exact: true })).toBeNull(),
  );
  for (const name of ['Back', 'Next', 'Change font, currently Editorial']) {
    const control = screen.getByRole('button', { name });
    expect(control.id).not.toBe('');
    expect(tipFor(control)).toBeDefined();
  }
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

function sourceHits(): HTMLElement[] {
  return [
    ...screen.getByTestId('editor-marks').querySelectorAll<HTMLElement>('mark'),
  ];
}

function previewHits(): HTMLElement[] {
  return [
    ...screen
      .getByTestId('document-scroll')
      .querySelectorAll<HTMLElement>('mark[data-find-hit]'),
  ];
}

it('finds in the source, not the preview, while the split shows', async () => {
  const user = userEvent.setup();
  await renderApp();
  await user.click(screen.getByRole('radio', { name: 'Split' }));

  // `# Title` is a hit in the source only: the preview drops the `#`.
  await user.type(findField(), '# t');

  expect(screen.getByLabelText('Match 1 of 1')).toBeInTheDocument();
  expect(sourceHits().map(mark => mark.textContent)).toEqual(['# T']);
  expect(previewHits()).toEqual([]);
});

it('finds in the source when only the editor shows', async () => {
  const user = userEvent.setup();
  await renderApp();
  await user.click(screen.getByRole('radio', { name: 'Split' }));
  await user.click(screen.getByRole('radio', { name: 'Editor' }));

  await user.type(findField(), 'alpha');
  await user.click(screen.getByRole('button', { name: 'Next match' }));

  expect(screen.getByLabelText('Match 2 of 2')).toBeInTheDocument();
  expect(sourceHits().map(mark => mark.style.backgroundColor)).toEqual([
    'rgb(255, 224, 138)',
    'rgb(245, 165, 36)',
  ]);
});

it('counts the source again as it is typed', async () => {
  const user = userEvent.setup();
  await renderApp();
  await user.click(screen.getByRole('radio', { name: 'Split' }));
  await user.type(findField(), 'alpha');

  await user.type(
    screen.getByRole('textbox', { name: 'Markdown source' }),
    ' alpha',
  );

  expect(screen.getByLabelText('Match 1 of 3')).toBeInTheDocument();
});

it('finds in the preview again once the editor hides', async () => {
  const user = userEvent.setup();
  await renderApp();
  await user.click(screen.getByRole('radio', { name: 'Split' }));
  await user.click(screen.getByRole('radio', { name: 'Editor' }));
  await user.type(findField(), 'alpha');

  await user.click(screen.getByRole('radio', { name: 'Preview' }));

  expect(screen.queryByTestId('editor-marks')).not.toBeInTheDocument();
  expect(previewHits()).toHaveLength(2);
  expect(screen.getByLabelText('Match 1 of 2')).toBeInTheDocument();
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
