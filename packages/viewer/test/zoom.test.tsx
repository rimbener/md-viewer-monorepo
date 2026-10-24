import { cleanup, screen } from '@testing-library/react';

import { parseMarkdown } from '@md-viewer/markdown/parseBlocks';

import { Markdown } from '../src/components/Markdown';
import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM, stepZoom } from '../src/zoom';
import { px } from './dom';
import { renderWithPlatform } from './fakePlatform';

/** Font size of the element rendering `text` at a given zoom. */
function fontSizeAt(source: string, text: string, scale: number): number {
  // The scheme is pinned to the unscaled one so this measures zoom alone.
  renderWithPlatform(
    <Markdown
      blocks={parseMarkdown(source)}
      basePath="/notes"
      scale={scale}
      schemeId="native"
    />,
  );
  const size = px(screen.getByText(text).style.fontSize);
  cleanup();
  return size;
}

describe('stepZoom', () => {
  it('moves five percent at a time', () => {
    expect(stepZoom(DEFAULT_ZOOM, 1)).toBe(1.05);
    expect(stepZoom(DEFAULT_ZOOM, -1)).toBe(0.95);
  });

  it('stops at both ends instead of wrapping', () => {
    expect(stepZoom(MIN_ZOOM, -1)).toBe(MIN_ZOOM);
    expect(stepZoom(MAX_ZOOM, 1)).toBe(MAX_ZOOM);
  });

  it('falls back to the default for an unknown scale', () => {
    expect(stepZoom(1.07, 1)).toBe(1.05);
  });
});

describe('Markdown zoom', () => {
  it('scales headings and body text together', () => {
    expect(fontSizeAt('# Title', 'Title', 1)).toBe(26);
    expect(fontSizeAt('# Title', 'Title', 2)).toBe(52);
    expect(fontSizeAt('body text', 'body text', 1)).toBe(14);
    expect(fontSizeAt('body text', 'body text', 1.5)).toBe(21);
  });
});
