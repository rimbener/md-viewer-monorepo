import { realpathSync } from 'node:fs';
import { join } from 'node:path';

const litReact = join(
  realpathSync(join(import.meta.dirname, 'node_modules/@lit/react')),
  'development/index.js',
);

/** Vitest settings that every project rendering m3e components needs. */
export const m3eTestConfig = {
  resolve: {
    // The node build of @lit/react is SSR-only and never sets props or events.
    alias: [{ find: /^@lit\/react$/, replacement: litReact }],
  },
  server: { deps: { inline: [/@m3e\/react/, /@lit\/react/] } },
};
