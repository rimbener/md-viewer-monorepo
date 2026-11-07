import type { ReactNode } from 'react';

import { ColorSchemeProvider } from './ColorSchemeProvider';

type ThemeRootProps = {
  children: ReactNode;
};

/** The color scheme and M3 theme around every screen, in each app. */
export function ThemeRoot({ children }: ThemeRootProps) {
  return <ColorSchemeProvider>{children}</ColorSchemeProvider>;
}
