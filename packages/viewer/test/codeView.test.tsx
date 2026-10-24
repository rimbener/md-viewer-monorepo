import { screen } from '@testing-library/react';

import { parseMarkdown } from '@md-viewer/markdown/parseBlocks';

import { Markdown } from '../src/components/Markdown';
import { css, strings } from './dom';
import { press, renderWithPlatform } from './fakePlatform';

function render(source: string): HTMLElement {
  return renderWithPlatform(
    <Markdown blocks={parseMarkdown(source)} basePath="/notes" />,
  ).container;
}

const FENCE = '```ts\nconst greeting = say("hi"); // wave\n```';

describe('a highlighted code block', () => {
  it('renders the source unchanged', () => {
    expect(strings(render(FENCE)).join('')).toBe(
      'const greeting = say("hi"); // wave',
    );
  });

  it('gives keywords, calls, strings and comments their own colours', () => {
    render(FENCE);
    const colors = ['const', 'say', '"hi"', '// wave'].map(
      token => screen.getByText(token).style.color,
    );

    expect(colors.every(color => color !== '')).toBe(true);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('leaves a fence in an unknown language as plain code', () => {
    expect(strings(render('```python\nx = 1\n```'))).toEqual(['x = 1']);
  });

  it('leaves a fence with no language as plain code', () => {
    expect(strings(render('```\nx = 1\n```'))).toEqual(['x = 1']);
  });

  it('does not scroll on the vertical axis', () => {
    const scroller = render(FENCE).querySelector('pre') as HTMLElement;

    expect(scroller.style.overflowX).toBe('auto');
    expect(scroller.style.overflowY).toBe('');
  });
});

describe('a code span', () => {
  it('tints text inside backticks', () => {
    render('use `name` here');

    expect(screen.getByText('name').style.color).toBe(css('color', '#d39039'));
  });
});

describe('the copy button', () => {
  const writeText = vi.fn(async (_text: string) => {});

  beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  async function pressCopy(source: string): Promise<void> {
    render(source);
    await press(screen.getByRole('button', { name: 'Copy' }));
  }

  it('copies the fence text and says so', async () => {
    await pressCopy(FENCE);

    expect(writeText).toHaveBeenCalledWith(
      'const greeting = say("hi"); // wave',
    );
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('copies a gherkin fence as written', async () => {
    await pressCopy('```gherkin\nFeature: Login\n```');

    expect(writeText).toHaveBeenCalledWith('Feature: Login');
  });

  it('does nothing without a pasteboard', async () => {
    Reflect.deleteProperty(navigator, 'clipboard');
    await pressCopy(FENCE);

    expect(screen.queryByRole('button', { name: 'Copied' })).toBeNull();
  });
});
