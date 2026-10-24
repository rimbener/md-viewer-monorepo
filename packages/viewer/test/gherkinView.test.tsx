import { parseMarkdown } from '@md-viewer/markdown/parseBlocks';

import { Markdown } from '../src/components/Markdown';
import { FONT_SCHEMES } from '../src/typography';
import { px, strings, textFor } from './dom';
import { renderWithPlatform } from './fakePlatform';

const FEATURE = [
  '```gherkin',
  'Feature: ProgressStepper',
  '',
  '  @AC-1',
  '  Scenario Outline: Step appearance',
  '    Given a step of kind <kind>',
  '    Then it shows the translation of "button.continue"',
  '',
  '    Examples:',
  '      | kind     | appearance |',
  '      | video    | circle     |',
  '      | activity | bar        |',
  '```',
].join('\n');

function render(
  source: string,
  scale = 1,
  schemeId: string | null = null,
): HTMLElement {
  return renderWithPlatform(
    <Markdown
      blocks={parseMarkdown(source)}
      basePath="/notes"
      scale={scale}
      schemeId={schemeId}
    />,
  ).container;
}

describe('a gherkin fence', () => {
  it('renders as a feature rather than as a code block', () => {
    const root = render(FEATURE);

    expect(root.querySelector('pre')).toBeNull();
    expect(strings(root)).toEqual(
      expect.arrayContaining([
        'FEATURE',
        'ProgressStepper',
        '@AC-1',
        'Step appearance',
        'Given',
        'Then',
      ]),
    );
  });

  it('leaves the fence to the code block renderer for other languages', () => {
    const root = render('```ts\nconst a = 1;\n```');

    expect(root.querySelectorAll('pre')).toHaveLength(1);
    expect(strings(root).join('')).toBe('const a = 1;');
  });

  it('sets step keywords apart from the step text', () => {
    const root = render(FEATURE);
    const given = textFor(root, 'Given').style;

    expect(given.color).toBe(textFor(root, 'Then').style.color);
    expect(given.color).not.toBe(textFor(root, 'ProgressStepper').style.color);
    expect(given.textAlign).toBe('right');
  });

  it('sets step keywords in the code font in every scheme', () => {
    for (const scheme of FONT_SCHEMES) {
      const root = render(FEATURE, 1, scheme.id);
      const keyword = textFor(root, 'Given').style;
      const step = textFor(root, 'Step appearance').style;

      expect(keyword.fontFamily).toBe(textFor(root, '<kind>').style.fontFamily);
      expect(keyword.fontFamily).not.toBe(step.fontFamily);
      // The keyword still sits on the baseline of the step text beside it.
      expect(keyword.lineHeight).toBe(step.lineHeight);
    }
  });

  it('colours outline parameters and quoted strings differently', () => {
    const root = render(FEATURE);
    const parameter = textFor(root, '<kind>').style;
    const quoted = textFor(root, '"button.continue"').style;

    expect(parameter.color).not.toBe(quoted.color);
    // Both stand in for a value, so both keep the code font.
    expect(parameter.fontFamily).toBe(quoted.fontFamily);
    expect(parameter.fontFamily).not.toBe(
      textFor(root, 'Step appearance').style.fontFamily,
    );
  });

  it('lays an Examples block out as a table', () => {
    const root = render(FEATURE);
    const cells = Array.from(root.querySelectorAll('th, td'), cell =>
      cell.textContent?.trim(),
    );

    expect(strings(root)).toContain('EXAMPLES');
    expect(cells).toEqual([
      'kind',
      'appearance',
      'video',
      'circle',
      'activity',
      'bar',
    ]);
  });

  it('scales with the document zoom', () => {
    // The scheme is pinned to the unscaled one so this measures zoom alone.
    const small = px(
      textFor(render(FEATURE, 1, 'native'), 'Given').style.fontSize,
    );
    const large = px(
      textFor(render(FEATURE, 2, 'native'), 'Given').style.fontSize,
    );

    expect(large).toBe(small * 2);
  });
});
