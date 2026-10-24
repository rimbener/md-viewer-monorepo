import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // Tauri expects a fixed port, and shows its own errors over Vite's.
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  build: {
    // Mermaid's diagram chunks are large, and each loads only when needed.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    name: 'tauri',
    globals: true,
    environment: 'jsdom',
  },
});
