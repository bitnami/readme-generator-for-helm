import js from '@eslint/js';
import globals from 'globals';
import json from '@eslint/json';
import markdown from '@eslint/markdown';
import { globalIgnores, defineConfig } from 'eslint/config';
import jest from 'eslint-plugin-jest';
import node from 'eslint-plugin-node';
import unicorn from 'eslint-plugin-unicorn';
import { fixupPluginRules } from '@eslint/compat';
import _import from 'eslint-plugin-import';

export default defineConfig([
  // Non-required paths
  globalIgnores(['**/node_modules/', '.git/']),
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: {
      js,
      node,
      unicorn,
      import: fixupPluginRules(_import),
    },
    extends: ['js/recommended'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      'semi': ['error', 'always'],
      'prefer-const': 'error',
      'no-unused-vars': 'error',
      // eslint-plugin-node
      'node/no-missing-import': 'error',
      'node/no-extraneous-import': 'error',
      'node/file-extension-in-import': 'error',
      'node/no-sync': 'off',
      // eslint-plugin-import
      'import/no-unresolved': 'error',
      'import/no-useless-path-segments': 'error',
      'import/no-extraneous-dependencies': 'error',
      'import/no-commonjs': 'error',
      // eslint-plugin-unicorn
      'unicorn/prefer-module': 'error',
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/prefer-top-level-await': 'error',
    },
  },
  {
    files: ['eslint.config.js'],
    rules: {
      // Disables the eslint/config not found message
      'node/no-missing-import': 'off',
      'import/no-unresolved': 'off',
    },
  },
  {
    files: ['**/*.json'],
    plugins: { json },
    language: 'json/json',
    extends: ['json/recommended']
  },
  {
    files: ['package-lock.json'],
    rules: {
      'json/no-empty-keys': 'off',
    },
  },
  {
    files: ['**/*.md'],
    plugins: { markdown },
    language: 'markdown/gfm',
    extends: ['markdown/recommended'],
    // Allow special labels: alerts
    // https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#alerts
    rules: {
      'markdown/no-missing-label-refs': [
        'error',
        {
          allowLabels: [
            '!NOTE',
            '!TIP',
            '!IMPORTANT',
            '!WARNING',
            '!CAUTION',
          ],
        },
      ],
    },
  },
  {
    files: ['tests/*.js'],
    plugins: {
      js,
      jest
    },
    extends: [
      'js/recommended',
      'jest/recommended',
    ],
  },
]);
