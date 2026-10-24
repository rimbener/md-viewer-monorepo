import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'markdown',
    globals: true,
    environment: 'node',
  },
});
