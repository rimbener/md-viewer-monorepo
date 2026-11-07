import { defineProject } from 'vitest/config';

import { m3eTestConfig } from './m3eTestConfig';

export default defineProject({
  resolve: m3eTestConfig.resolve,
  test: {
    name: 'viewer',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    server: m3eTestConfig.server,
  },
});
