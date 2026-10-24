import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the site under the repository name.
  base: process.env.PAGES_BASE ?? '/',
  build: {
    // Mermaid's diagram chunks are large, and each loads only when needed.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    name: 'web',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
  },
});
