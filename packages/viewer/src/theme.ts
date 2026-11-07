import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react';

import { DEFAULT_COLOR_SCHEME_ID, type ColorSchemeId } from './colorScheme';

export interface Theme {
  background: string;
  sidebar: string;
  border: string;
  text: string;
  mutedText: string;
  selectedBackground: string;
  selectedText: string;
  hairline: string;
  accent: string;
  /** Status text for a problem: unsaved edits, a bad file name. */
  error: string;
  /** The `box-shadow` under a control that floats over the page. */
  floatShadow: string;
  /** The veil over the page behind a dialog. */
  backdrop: string;
  /** Backdrop for code spans and fenced code blocks. */
  code: string;
  /** Text of a `code` span. */
  inlineCode: string;
  codeBorder: string;
  link: string;
  /** The rule running down the left of a blockquote. */
  quoteBar: string;
  tableHeader: string;
  /** Gherkin: the Given/When/Then that opens a step. */
  gherkinKeyword: string;
  /** Gherkin: an `@tag` above a scenario. */
  gherkinTag: string;
  /** Gherkin: an `<outline parameter>`. */
  gherkinParameter: string;
  /** Gherkin: a "quoted string" inside a step. */
  gherkinString: string;
  /** Code: a comment, in any highlighted language. */
  syntaxComment: string;
  /** Code: a language keyword, a CSS at-rule, an HTML doctype. */
  syntaxKeyword: string;
  /** Code: a string, a regex, an HTML attribute value. */
  syntaxString: string;
  /** Code: a number, a literal, an HTML entity, a CSS value. */
  syntaxConstant: string;
  /** Code: an HTML tag name, a CSS selector. */
  syntaxTag: string;
  /** Code: an HTML attribute name, a CSS property name. */
  syntaxAttribute: string;
  /** Code: a name being called. */
  syntaxFunction: string;
  /** Find: a hit that is not the current one. */
  searchHit: string;
  /** Find: the current hit. */
  searchCurrent: string;
}

/** An M3 color role, as `m3e-theme` writes it on its host. */
function role(name: M3Role): string {
  return `var(--md-sys-color-${name})`;
}

type M3Role = keyof typeof monochromeLight;

/** `m3e-theme` monochrome roles, for where no theme host computes them: jsdom. */
const monochromeLight = {
  surface: '#f9f9f9',
  'surface-container-low': '#f3f3f3',
  'surface-container': '#eeeeee',
  'surface-container-highest': '#e2e2e2',
  'on-surface': '#1b1b1b',
  'on-surface-variant': '#474747',
  'outline-variant': '#c6c6c6',
  primary: '#000000',
  'secondary-container': '#d4d4d4',
  'on-secondary-container': '#1b1b1b',
  error: '#ba1a1a',
  shadow: '#000000',
  scrim: '#000000',
};

const monochromeDark: Record<M3Role, string> = {
  surface: '#131313',
  'surface-container-low': '#1b1b1b',
  'surface-container': '#1f1f1f',
  'surface-container-highest': '#353535',
  'on-surface': '#e2e2e2',
  'on-surface-variant': '#c6c6c6',
  'outline-variant': '#474747',
  primary: '#ffffff',
  'secondary-container': '#474747',
  'on-secondary-container': '#e2e2e2',
  error: '#ffb4ab',
  shadow: '#000000',
  scrim: '#000000',
};

function shadowMix(percent: number): string {
  return `color-mix(in srgb, ${role('shadow')} ${percent}%, transparent)`;
}

/** The roles every scheme shares; m3e picks the light or dark value. */
const roles = {
  background: role('surface'),
  sidebar: role('surface-container-low'),
  border: role('outline-variant'),
  text: role('on-surface'),
  mutedText: role('on-surface-variant'),
  selectedBackground: role('secondary-container'),
  selectedText: role('on-secondary-container'),
  hairline: role('outline-variant'),
  accent: role('primary'),
  error: role('error'),
  // M3 elevation level 2, as m3e draws it.
  floatShadow: `${shadowMix(20)} 0px 3px 3px -2px, ${shadowMix(14)} 0px 3px 4px 0px, ${shadowMix(12)} 0px 1px 8px 0px`,
  backdrop: `color-mix(in srgb, ${role('scrim')} 32%, transparent)`,
  code: role('surface-container-highest'),
  inlineCode: role('on-surface'),
  codeBorder: role('outline-variant'),
  quoteBar: role('outline-variant'),
  tableHeader: role('surface-container'),
};

const light: Theme = {
  ...roles,
  link: '#0a66d0',
  gherkinKeyword: '#8250df',
  gherkinTag: '#1a7f37',
  gherkinParameter: '#bc4c00',
  gherkinString: '#0a3069',
  syntaxComment: '#6e7781',
  syntaxKeyword: '#cf222e',
  syntaxString: '#0a3069',
  syntaxConstant: '#0550ae',
  syntaxTag: '#116329',
  syntaxAttribute: '#0550ae',
  syntaxFunction: '#8250df',
  searchHit: '#ffe08a',
  searchCurrent: '#f5a524',
};

const dark: Theme = {
  ...roles,
  link: '#69a8f5',
  gherkinKeyword: '#d2a8ff',
  gherkinTag: '#7ee787',
  gherkinParameter: '#ffa657',
  gherkinString: '#a5d6ff',
  syntaxComment: '#8b949e',
  syntaxKeyword: '#ff7b72',
  syntaxString: '#a5d6ff',
  syntaxConstant: '#79c0ff',
  syntaxTag: '#7ee787',
  syntaxAttribute: '#79c0ff',
  syntaxFunction: '#d2a8ff',
  searchHit: '#5c4e24',
  searchCurrent: '#8d6b1f',
};

export interface ColorSchemeChoice {
  schemeId: ColorSchemeId;
  setSchemeId: (schemeId: ColorSchemeId) => void;
}

export const ColorSchemeContext = createContext<ColorSchemeChoice>({
  schemeId: DEFAULT_COLOR_SCHEME_ID,
  setSchemeId: () => {},
});

export function useColorSchemeChoice(): ColorSchemeChoice {
  return useContext(ColorSchemeContext);
}

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeToSystem(onChange: () => void): () => void {
  const query = window.matchMedia?.(DARK_QUERY);
  query?.addEventListener('change', onChange);
  return () => query?.removeEventListener('change', onChange);
}

function systemScheme(): 'light' | 'dark' {
  return window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light';
}

function useResolvedScheme(): 'light' | 'dark' {
  const system = useSyncExternalStore(subscribeToSystem, systemScheme);
  const { schemeId } = useColorSchemeChoice();
  return schemeId === 'system' ? system : schemeId;
}

export function useTheme(): Theme {
  return useResolvedScheme() === 'dark' ? dark : light;
}

export interface ThemeHost {
  /** The `m3e-theme` element, which holds the computed `--md-sys-color-*`. */
  element: HTMLElement | null;
  /** Grows on each `change` of the host, so readers compute again. */
  version: number;
}

export const ThemeHostContext = createContext<ThemeHost>({
  element: null,
  version: 0,
});

const ROLE_PATTERN = /var\(--md-sys-color-([a-z-]+)\)/g;

/** `theme` with every M3 role swapped for its computed color. */
export function resolvedPalette(
  theme: Theme,
  host: HTMLElement | null,
  scheme: 'light' | 'dark',
): Theme {
  const computed = host === null ? null : getComputedStyle(host);
  const fallback = scheme === 'dark' ? monochromeDark : monochromeLight;
  const resolve = (value: string): string =>
    value.replace(ROLE_PATTERN, (match, name: string) => {
      const live = computed?.getPropertyValue(`--md-sys-color-${name}`).trim();
      return live || (fallback[name as M3Role] ?? match);
    });
  return Object.fromEntries(
    Object.entries(theme).map(([key, value]) => [key, resolve(value)]),
  ) as unknown as Theme;
}

/** The palette as plain colors, for a reader that cannot take `var()`: Mermaid. */
export function useResolvedTheme(): Theme {
  const scheme = useResolvedScheme();
  const { element, version } = useContext(ThemeHostContext);
  return useMemo(
    () => resolvedPalette(scheme === 'dark' ? dark : light, element, scheme),
    // `version` marks a recompute of the host's colors.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheme, element, version],
  );
}
