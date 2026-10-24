import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'viewer',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
  },
});
