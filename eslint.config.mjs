import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier/flat";
import globals from "globals";

// Rules the recommended set does not cover, kept because each catches a class of bug rather than a
// matter of taste. Everything here was checked against this code; nothing is on faith.

export default [
  js.configs.recommended,

  // A config with no `files` applies to everything ESLint is given, which is what these want: the
  // page's script and this repository's tooling are held to the same rules and differ only in what
  // is already defined around them.
  {
    rules: {
      "array-callback-return": "error",
      "consistent-return": "error",
      "no-cond-assign": ["error", "always"], // stricter than the default: catches `if ((a = b))` too
      "no-constructor-return": "error",
      "no-loop-func": "error",
      "no-param-reassign": "error",
      "no-return-assign": "error",
      "no-shadow": "error",
      "no-template-curly-in-string": "error",
      "no-throw-literal": "error",
      "no-unmodified-loop-condition": "error",
      "no-unreachable-loop": "error",
      "no-unused-expressions": "error",
      "no-var": "error",
      "prefer-const": "error",
      "require-atomic-updates": "error",

      // Function declarations hoist, and app.js calls three of them above their definition on purpose. A
      // let, const or class used before its line is a temporal-dead-zone error either way.
      "no-use-before-define": ["error", { functions: false, variables: true, classes: true }],

      "eqeqeq": ["error", "smart"], // smart, so `== null` still covers both null and undefined
    },
  },

  // app.js is a classic script the page loads, not a module. L is Leaflet and tzlookup is tz-lookup,
  // both arriving as globals from the <script> tags in index.html.
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: { ...globals.browser, L: "readonly", tzlookup: "readonly" },
    },
  },

  // This repository's own tooling, which runs under Node rather than in a page.
  {
    files: ["**/*.mjs"],
    languageOptions: { globals: globals.nodeBuiltin },
  },

  // Last, so that anything above which would argue with Prettier is switched back off.
  prettierConfig,
];
