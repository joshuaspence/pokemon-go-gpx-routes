// The rules are written out rather than pulled from a shared preset. Nothing
// stops us extending one now that the linters are installed, but a preset that
// changes upstream would change what this repository considers an error
// without anyone deciding to; written out, the set only moves when someone
// moves it, and the config is the answer to "why did CI fail".
//
// Formatting is Prettier's, not ESLint's: the plugin's recommended config
// goes last so that eslint-config-prettier can switch off anything here that
// would argue with it, and so `eslint --fix` reformats as it fixes.
import prettierRecommended from "eslint-plugin-prettier/recommended";

// One set of rules, applied to two kinds of file: app.js, the classic browser
// script the page loads, and the .mjs files that are this repository's own
// tooling — these configs and validate-gpx.mjs. They differ only in what is
// already defined around them.
const rules = {
  // Things that are simply wrong.
  "no-const-assign": "error",
  "no-dupe-args": "error",
  "no-dupe-else-if": "error",
  "no-dupe-keys": "error",
  "no-duplicate-case": "error",
  "no-func-assign": "error",
  "no-import-assign": "error",
  "no-obj-calls": "error",
  "no-self-assign": "error",
  "no-self-compare": "error",
  "no-sparse-arrays": "error",
  "no-unreachable": "error",
  "no-unsafe-negation": "error",
  "use-isnan": "error",
  "valid-typeof": "error",

  // A name that is not defined anywhere is either a typo or a global that
  // needs declaring below; either way it is worth stopping for.
  "no-undef": "error",

  // An unused binding is dead code. Caught errors are exempt: several handlers
  // here deliberately swallow the error and fall back.
  "no-unused-vars": ["error", { caughtErrors: "none" }],

  // Easy to write by accident, and each one hides a real bug.
  "no-cond-assign": ["error", "always"],
  "no-constant-condition": "error",
  "no-fallthrough": "error",
  "no-redeclare": "error",
  "no-shadow-restricted-names": "error",
  "require-atomic-updates": "error",

  // An empty block is usually an unfinished edit. A bare catch is not — it is
  // how app.js says "this path is allowed to fail".
  "no-empty": ["error", { allowEmptyCatch: true }],

  // House style, and both catch real mistakes: var hoists out of the block it
  // is written in, and == coerces.
  "no-var": "error",
  "prefer-const": "error",
  "eqeqeq": ["error", "smart"],
};

export default [
  // The viewer. Everything it does not declare itself has to be named here: L
  // is Leaflet and tzlookup is tz-lookup, both arriving as globals from the
  // <script> tags in index.html. tzlookup is optional at runtime, which is why
  // the code tests for it before calling it.
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        Blob: "readonly",
        DOMParser: "readonly",
        URL: "readonly",
        clearTimeout: "readonly",
        console: "readonly",
        document: "readonly",
        fetch: "readonly",
        getComputedStyle: "readonly",
        navigator: "readonly",
        setTimeout: "readonly",
        window: "readonly",
        L: "readonly",
        tzlookup: "readonly",
      },
    },
    rules,
  },

  // This repository's own tooling, which runs under Node rather than in a page.
  {
    files: ["**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
    rules,
  },

  prettierRecommended,
];
