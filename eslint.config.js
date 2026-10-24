import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist',
      '**/node_modules',
      'apps/tauri/src-tauri/target',
      'apps/tauri/src-tauri/gen',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Storage and platform calls are best-effort; a failure is dropped.
      'no-empty': ['error', { allowEmptyCatch: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-exports': [
        'error',
        { restrictDefaultExports: { direct: true, named: true } },
      ],
    },
  },
  {
    files: ['**/*.config.{js,ts}', 'eslint.config.js'],
    rules: { 'no-restricted-exports': 'off' },
  },
);
