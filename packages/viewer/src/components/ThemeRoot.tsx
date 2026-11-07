import { useCallback, useMemo, useState, type ReactNode } from 'react';

import type { ColorSchemeId } from '../colorScheme';
import { M3eTheme } from '../m3e';
import { ThemeHostContext, useColorSchemeChoice } from '../theme';
import { ColorSchemeProvider } from './ColorSchemeProvider';

type ThemeRootProps = {
  children: ReactNode;
};

const M3E_SCHEME = {
  system: 'auto',
  light: 'light',
  dark: 'dark',
} as const satisfies Record<ColorSchemeId, string>;

function M3Theme({ children }: ThemeRootProps) {
  const { schemeId } = useColorSchemeChoice();
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [version, setVersion] = useState(0);
  const host = useMemo(() => ({ element, version }), [element, version]);

  const onChange = useCallback((event: Event) => {
    if (event.target === event.currentTarget) {
      setVersion(previous => previous + 1);
    }
  }, []);

  return (
    <M3eTheme
      ref={setElement}
      variant="monochrome"
      motion="standard"
      density={-2}
      scheme={M3E_SCHEME[schemeId]}
      onChange={onChange}
    >
      <ThemeHostContext.Provider value={host}>
        {children}
      </ThemeHostContext.Provider>
    </M3eTheme>
  );
}

/** The color scheme and M3 theme around every screen, in each app. */
export function ThemeRoot({ children }: ThemeRootProps) {
  return (
    <ColorSchemeProvider>
      <M3Theme>{children}</M3Theme>
    </ColorSchemeProvider>
  );
}
