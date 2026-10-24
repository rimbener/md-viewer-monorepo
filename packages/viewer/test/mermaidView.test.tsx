import { screen } from '@testing-library/react';

import { parseMarkdown } from '@md-viewer/markdown/parseBlocks';

import { Markdown } from '../src/components/Markdown';
import { renderMermaid } from '../src/mermaid';
import { strings } from './dom';
import { press, renderWithPlatform, settle } from './fakePlatform';

vi.mock('../src/mermaid', async importOriginal => ({
  ...(await importOriginal<typeof import('../src/mermaid')>()),
  renderMermaid: vi.fn(),
}));

const draw = vi.mocked(renderMermaid);

const DIAGRAM = '```mermaid\ngraph TD\n  A-->B\n```';

const SVG = '<svg data-testid="diagram"></svg>';

beforeEach(() => {
  draw.mockReset();
  draw.mockResolvedValue(SVG);
});

async function render(source: string): Promise<HTMLElement> {
  const { container } = renderWithPlatform(
    <Markdown blocks={parseMarkdown(source)} basePath="/notes" />,
  );
  await settle();
  return container;
}

describe('a mermaid fence', () => {
  it('draws the diagram from the fence, strictly, in place of the code', async () => {
    const root = await render(DIAGRAM);

    expect(draw).toHaveBeenCalledWith(
      'graph TD\n  A-->B',
      expect.objectContaining({ securityLevel: 'strict' }),
    );
    expect(screen.getByRole('img')).toContainElement(
      screen.getByTestId('diagram'),
    );
    expect(root.querySelector('pre')).toBeNull();
  });

  it('shows the fence as source when the draw fails', async () => {
    draw.mockRejectedValue(new Error('Parse error'));
    const root = await render(DIAGRAM);

    expect(screen.queryByRole('img')).toBeNull();
    expect(strings(root).join('')).toContain('A-->B');
  });

  it('switches between the diagram and the fence text', async () => {
    const root = await render(DIAGRAM);

    await press(screen.getByRole('button', { name: 'View Text' }));

    expect(screen.queryByRole('img')).toBeNull();
    expect(strings(root).join('')).toContain('A-->B');

    await press(screen.getByRole('button', { name: 'View Diagram' }));

    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('leaves a fence in another language as plain code', async () => {
    const root = await render('```python\nx = 1\n```');

    expect(draw).not.toHaveBeenCalled();
    expect(screen.queryByRole('img')).toBeNull();
    expect(strings(root)).toEqual(['x = 1']);
  });

  it('copies the fence text, in either view', async () => {
    const writeText = vi.fn(async (_text: string) => {});
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    await render(DIAGRAM);

    await press(screen.getByRole('button', { name: 'Copy' }));
    Reflect.deleteProperty(navigator, 'clipboard');

    expect(writeText).toHaveBeenCalledWith('graph TD\n  A-->B');
    expect(
      screen.getByRole('button', { name: 'View Text' }),
    ).toBeInTheDocument();
  });
});
