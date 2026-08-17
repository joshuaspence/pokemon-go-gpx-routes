import globals from 'globals';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';

export default [
  js.configs.recommended,
  prettier,

  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'script',
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
