import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier/flat";

// js.configs.recommended is the baseline — ESLint's own set of "this is a mistake" rules, kept
// current by the people who write the language tooling. Everything below it is deliberate: rules
// that catch a class of bug the recommended set lets through, each one checked against this code
// rather than adopted on faith.
//
// js.configs.all was the alternative and is not used. It reports 896 problems here, almost all of
// them taste — id-length wants `e` renamed, no-magic-numbers objects to 0xffff in a serializer,
// no-bitwise objects to a bitwise format, sort-keys wants the country tables alphabetised by
// continent. It also moves between minor releases, which would let an upgrade decide what this
// repository considers an error.
const rules = {
  // Correctness the recommended set does not cover.
  "array-callback-return": "error", // a filter/map callback that falls off the end returns undefined
  "consistent-return": "error", // returning a void call's value says the opposite of what is meant
  "no-constructor-return": "error",
  "no-promise-executor-return": "error",
  "no-self-compare": "error",
  "no-template-curly-in-string": "error", // "${x}" in a plain string is a missing backtick
  "no-unmodified-loop-condition": "error",
  "no-unreachable-loop": "error",
  "no-useless-assignment": "error",
  "require-atomic-updates": "error",

  // Ways to be wrong that read as though they work.
  "no-caller": "error",
  "no-extend-native": "error",
  "no-implied-eval": "error",
  "no-loop-func": "error",
  "no-new-func": "error",
  "no-new-wrappers": "error",
  "no-param-reassign": "error",
  "no-proto": "error",
  "no-return-assign": "error",
  "no-script-url": "error",
  "no-sequences": "error",
  "no-shadow": "error", // an inner name silently standing in for an outer one
  "no-throw-literal": "error",
  "no-unused-expressions": "error", // a statement computing something and discarding it
  "prefer-promise-reject-errors": "error",
  "radix": "error",

  // An error thrown while handling another should say what it was handling; without a cause the
  // original stack is gone, and these files are read by whoever is debugging a bad GPX file.
  "preserve-caught-error": "error",

  // Function declarations hoist, so calling one above its definition is fine and this file does it
  // deliberately. A let, const or class used before its line is a temporal-dead-zone error.
  "no-use-before-define": ["error", { functions: false, variables: true, classes: true }],

  // Every catch binding here is used; the ones that were not now use an optional catch binding
  // instead of being exempted. A block holding only a comment is not empty, so a catch that
  // deliberately swallows can still say so.
  "no-unused-vars": ["error", { caughtErrors: "all" }],

  // Stricter than the default: this catches `if (a = b)` even where the assignment is parenthesised.
  "no-cond-assign": ["error", "always"],

  "eqeqeq": ["error", "smart"], // smart, so `== null` still covers both null and undefined
  "no-var": "error",
  "prefer-const": "error",
};

export default [
  js.configs.recommended,

  // The viewer. Everything it does not declare itself has to be named here: L is Leaflet and
  // tzlookup is tz-lookup, both arriving as globals from the <script> tags in index.html. tzlookup
  // is optional at runtime, which is why the code tests for it before calling it.
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

  // Last, so that anything above which would argue with Prettier is switched back off.
  prettierConfig,
];
