/**
 * The config a ```mermaid fence is drawn with, and the draw itself.
 *
 * Mermaid is loaded on the first diagram, so a document without one never
 * pays for it. Its config is global, so draws run one at a time.
 */

import type { Theme } from './theme';
import { BODY_SIZE } from './typography';

/** Mermaid's own default. A longer fence is shown as source. */
export const MERMAID_TEXT_CAP = 50_000;

export type MermaidOptions = {
  theme: Theme;
  /** Zoom factor; 1 is the natural size. */
  scale: number;
  /** The body face's x-height scale, so the diagram matches the prose. */
  bodyScale: number;
  fontFamily: string;
};

export function isMermaid(language: string | null): boolean {
  return language !== null && language.toLowerCase() === 'mermaid';
}

export function mermaidConfig(options: MermaidOptions) {
  const { theme } = options;
  return {
    startOnLoad: false,
    securityLevel: 'strict' as const,
    suppressErrorRendering: true,
    maxTextSize: MERMAID_TEXT_CAP,
    // A `%%{init}%%` block in the fence cannot change these.
    secure: ['secure', 'securityLevel', 'startOnLoad', 'maxTextSize'],
    theme: 'base' as const,
    fontFamily: options.fontFamily,
    fontSize: Math.round(BODY_SIZE * options.scale * options.bodyScale * 2) / 2,
    themeVariables: {
      background: theme.background,
      primaryColor: theme.code,
      primaryTextColor: theme.text,
      primaryBorderColor: theme.border,
      lineColor: theme.mutedText,
      secondaryColor: theme.sidebar,
      tertiaryColor: theme.sidebar,
      textColor: theme.text,
      mainBkg: theme.code,
      nodeBorder: theme.border,
      clusterBkg: theme.sidebar,
      titleColor: theme.text,
      actorBkg: theme.code,
      actorBorder: theme.border,
      actorTextColor: theme.text,
      signalColor: theme.accent,
      noteBkgColor: theme.sidebar,
      noteTextColor: theme.text,
      noteBorderColor: theme.border,
    },
  };
}

export type MermaidConfig = ReturnType<typeof mermaidConfig>;

let queue: Promise<unknown> = Promise.resolve();
let sequence = 0;

/** The diagram as SVG markup. Rejects when Mermaid cannot draw the fence. */
export function renderMermaid(
  text: string,
  config: MermaidConfig,
): Promise<string> {
  const draw = queue.then(async () => {
    const { default: mermaid } = await import('mermaid');
    mermaid.initialize(config);
    sequence += 1;
    const { svg } = await mermaid.render(`mermaid-${sequence}`, text);
    return svg;
  });
  queue = draw.catch(() => undefined);
  return draw;
}
