import '@testing-library/jest-dom/vitest';
import '../../../packages/viewer/test/m3ePolyfills';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
