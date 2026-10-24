import { cleanup, screen } from '@testing-library/react';

import { parseMarkdown } from '@md-viewer/markdown/parseBlocks';

import { Markdown } from '../src/components/Markdown';
import { DEFAULT_CHARACTERS } from '../src/column';
import {
  CODE_FONT,
  columnWidth,
  DEFAULT_SCHEME_ID,
  FONT_SCHEMES,
  isSchemeId,
  nextSchemeId,
  schemeById,
  SYSTEM_FONT,
} from '../src/typography';
import { css, px } from './dom';
import { renderWithPlatform } from './fakePlatform';

/** Inline style of the element that renders `text` for `source`. */
function styleOf(
  source: string,
  text: string,
  schemeId: string | null,
): CSSStyleDeclaration {
  renderWithPlatform(
    <Markdown
      blocks={parseMarkdown(source)}
      basePath="/notes"
      schemeId={schemeId}
    />,
  );
  const element = screen.getByText(text);
  const styled = element.closest<HTMLElement>('pre, p, h1') ?? element;
  cleanup();
  return styled.style;
}

const bodyFont = (schemeId: string) =>
  styleOf('body text', 'body text', schemeId).fontFamily;

const headingFont = (schemeId: string) =>
  styleOf('# Title', 'Title', schemeId).fontFamily;

const firstFace = (stack: string) =>
  stack
    .split(',')[0]
    .trim()
    .replace(/^['"]|['"]$/g, '');

describe('font schemes', () => {
  it('cycles through every scheme and wraps', () => {
    const seen = new Set<string>();
    let id = DEFAULT_SCHEME_ID;
    for (let step = 0; step < FONT_SCHEMES.length; step += 1) {
      seen.add(id);
      id = nextSchemeId(id);
    }
    expect(seen.size).toBe(FONT_SCHEMES.length);
    expect(id).toBe(DEFAULT_SCHEME_ID);
  });

  it('falls back to the default for an unknown id', () => {
    expect(schemeById('nonsense').id).toBe(DEFAULT_SCHEME_ID);
    expect(schemeById(null).id).toBe(DEFAULT_SCHEME_ID);
    expect(isSchemeId('nonsense')).toBe(false);
    expect(isSchemeId('editorial')).toBe(true);
  });

  it('every scheme leads with a font that ships with macOS', () => {
    // Guards against a typo silently falling back to the next face.
    const available = new Set([
      'system-ui',
      'Charter',
      'Seravek',
      'Avenir Next',
      'Iowan Old Style',
      'Menlo',
    ]);
    for (const scheme of FONT_SCHEMES) {
      for (const role of [scheme.heading, scheme.body, scheme.code]) {
        expect(available).toContain(firstFace(role.family));
        expect(role.scale).toBeGreaterThan(0.8);
        expect(role.scale).toBeLessThan(1.2);
      }
    }
  });
});

describe('scheme rendering', () => {
  it('applies the body font to paragraphs', () => {
    expect(firstFace(bodyFont('editorial'))).toBe('Charter');
    expect(firstFace(bodyFont('humanist'))).toBe('Seravek');
    expect(bodyFont('native')).toBe(css('fontFamily', SYSTEM_FONT));
  });

  it('applies the heading font independently of the body', () => {
    expect(headingFont('editorial')).toBe(css('fontFamily', SYSTEM_FONT));
    expect(firstFace(headingFont('humanist'))).toBe('Avenir Next');
  });

  it('keeps code monospaced in every scheme', () => {
    for (const scheme of FONT_SCHEMES) {
      expect(
        styleOf('    indented code', 'indented code', scheme.id).fontFamily,
      ).toBe(css('fontFamily', CODE_FONT));
    }
  });

  it('compensates size so schemes look equally large', () => {
    const native = px(styleOf('body text', 'body text', 'native').fontSize);
    const editorial = px(
      styleOf('body text', 'body text', 'editorial').fontSize,
    );
    // Charter's smaller x-height per em is corrected by a larger point size.
    expect(editorial).toBeGreaterThan(native);
    expect(editorial).toBeLessThan(native * 1.1);
  });
});

describe('columnWidth', () => {
  it('gives every scheme the same line length in characters', () => {
    const widths = FONT_SCHEMES.map(scheme => {
      const bodySize = 14 * scheme.body.scale;
      return (
        columnWidth(scheme, 1, DEFAULT_CHARACTERS) /
        (scheme.body.advance * bodySize)
      );
    });
    // Each is the same target character count, give or take pixel rounding.
    for (const characters of widths) {
      expect(characters).toBeCloseTo(widths[0], 0);
    }
    expect(widths[0]).toBeCloseTo(DEFAULT_CHARACTERS, 0);
  });

  it('grows with zoom so the line length does not shrink', () => {
    const scheme = schemeById(DEFAULT_SCHEME_ID);
    const doubled = columnWidth(scheme, 1, DEFAULT_CHARACTERS) * 2;
    expect(columnWidth(scheme, 2, DEFAULT_CHARACTERS)).toBeGreaterThan(
      doubled - 2,
    );
    expect(columnWidth(scheme, 2, DEFAULT_CHARACTERS)).toBeLessThan(
      doubled + 2,
    );
  });

  it('grows with the target character count', () => {
    const scheme = schemeById(DEFAULT_SCHEME_ID);
    const atDefault = columnWidth(scheme, 1, DEFAULT_CHARACTERS);
    const atHalf = columnWidth(scheme, 1, DEFAULT_CHARACTERS / 2);
    expect(atDefault).toBeGreaterThan(atHalf * 2 - 2);
    expect(atDefault).toBeLessThan(atHalf * 2 + 2);
  });

  it('lands in a sensible pixel range at natural size', () => {
    for (const scheme of FONT_SCHEMES) {
      const width = columnWidth(scheme, 1, DEFAULT_CHARACTERS);
      expect(width).toBeGreaterThan(500);
      expect(width).toBeLessThan(700);
    }
  });
});
