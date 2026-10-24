import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

import { storage } from '../src/storage';

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(storage, 'getItem');
  vi.spyOn(storage, 'setItem');
  vi.spyOn(storage, 'removeItem');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
