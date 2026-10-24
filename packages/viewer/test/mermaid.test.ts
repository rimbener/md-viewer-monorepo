import { isMermaid, MERMAID_TEXT_CAP, mermaidConfig } from '../src/mermaid';
import type { Theme } from '../src/theme';

const theme = {
  background: '#111111',
  sidebar: '#666666',
  border: '#444444',
  text: '#222222',
  mutedText: '#555555',
  selectedBackground: '#000000',
  selectedText: '#000000',
  hairline: '#000000',
  accent: '#777777',
  code: '#333333',
  inlineCode: '#000000',
  codeBorder: '#000000',
  link: '#000000',
  quoteBar: '#000000',
  tableHeader: '#000000',
  gherkinKeyword: '#000000',
  gherkinTag: '#000000',
  gherkinParameter: '#000000',
  gherkinString: '#000000',
  syntaxComment: '#000000',
  syntaxKeyword: '#000000',
  syntaxString: '#000000',
  syntaxConstant: '#000000',
  syntaxTag: '#000000',
  syntaxAttribute: '#000000',
  syntaxFunction: '#000000',
  searchHit: '#000000',
  searchCurrent: '#000000',
} satisfies Theme;

describe('mermaidConfig', () => {
  it('locks the security keys and paints with the given palette', () => {
    const config = mermaidConfig({
      theme,
      scale: 2,
      bodyScale: 1,
      fontFamily: 'Charter',
    });

    expect(config).toMatchObject({
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true,
      maxTextSize: MERMAID_TEXT_CAP,
      secure: ['secure', 'securityLevel', 'startOnLoad', 'maxTextSize'],
      theme: 'base',
      fontFamily: 'Charter',
      fontSize: 28,
    });
    expect(config.themeVariables).toMatchObject({
      background: '#111111',
      primaryColor: '#333333',
      primaryTextColor: '#222222',
      primaryBorderColor: '#444444',
      lineColor: '#555555',
      secondaryColor: '#666666',
      textColor: '#222222',
      signalColor: '#777777',
    });
  });
});

describe('isMermaid', () => {
  it('accepts the mermaid tag in any case', () => {
    expect(isMermaid('mermaid')).toBe(true);
    expect(isMermaid('Mermaid')).toBe(true);
    expect(isMermaid('mmd')).toBe(false);
    expect(isMermaid(null)).toBe(false);
  });
});
