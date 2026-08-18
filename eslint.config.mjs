import globals from 'globals';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';

export default [
  js.configs.recommended,
  prettier,
  {
    rules: {
      'curly': ['error', 'all'],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'multiline-block-like' },
        { blankLine: 'always', prev: 'multiline-block-like', next: '*' },
      ],
    },
  },

  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.browser,
        L: 'readonly',
        tzlookup: 'readonly',
      },
    },
  },

  {
    files: ['**/*.mjs'],
    languageOptions: {
      globals: globals.nodeBuiltin,
    },
  },
];
