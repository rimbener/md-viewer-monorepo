import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

import { m3eTestConfig } from '../../packages/viewer/m3eTestConfig';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the site under the repository name.
  base: process.env.PAGES_BASE ?? '/',
  build: {
    // Mermaid's diagram chunks are large, and each loads only when needed.
    chunkSizeWarningLimit: 2000,
  },
  resolve: process.env.VITEST ? m3eTestConfig.resolve : undefined,
  test: {
    name: 'web',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    server: m3eTestConfig.server,
  },
});
