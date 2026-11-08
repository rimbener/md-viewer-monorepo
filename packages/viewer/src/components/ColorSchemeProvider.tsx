import { useEffect, type ReactNode } from 'react';

import { DEFAULT_COLOR_SCHEME_ID, type ColorSchemeId } from '../colorScheme';
import { loadColorScheme, saveColorScheme } from '../preferences';
import { ColorSchemeContext } from '../theme';
import { useStoredPreference } from '../useStoredPreference';

type ColorSchemeProviderProps = {
  children: ReactNode;
};

/** Form fields and scrollbars read `color-scheme`, not the React palette. */
function applyColorScheme(schemeId: ColorSchemeId): void {
  document.documentElement.style.colorScheme =
    schemeId === 'system' ? 'light dark' : schemeId;
}

export function ColorSchemeProvider({ children }: ColorSchemeProviderProps) {
  const [schemeId, setSchemeId] = useStoredPreference(
    loadColorScheme,
    saveColorScheme,
    DEFAULT_COLOR_SCHEME_ID,
  );

  useEffect(() => applyColorScheme(schemeId), [schemeId]);

  return (
    <ColorSchemeContext.Provider value={{ schemeId, setSchemeId }}>
      {children}
    </ColorSchemeContext.Provider>
  );
}
