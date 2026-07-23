// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores([
    'dist/',
    'node_modules/',
    '.wrangler/',
    '**/*.tsbuildinfo',
    // Gitignored local scratch space (`*.local`), not part of the app.
    '*.local/',
  ]),

  // Browser SPA source.
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      // The loaders warn deliberately on malformed content and carry
      // `eslint-disable-next-line no-console` for it; keep the rule on so
      // those directives stay meaningful.
      'no-console': 'error',
    },
  },

  // Node ESM: build config, validators, and this file.
  {
    files: ['scripts/**/*.mjs', 'vite.config.ts', 'eslint.config.js'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: globals.node,
    },
  },
]);
