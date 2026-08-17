// The rules are written out rather than pulled from a shared preset. There is
// no package.json here and no node_modules — the workflow fetches the linter
// for the run and throws it away — so a config that extended a preset would
// have nothing to resolve it from. Written out, the config is also the answer
// to "why did CI fail": the rule is right here.
//
// app.js is a classic browser script, not a module, so everything it does not
// declare itself has to be named below. L is Leaflet and tzlookup is tz-lookup;
// both arrive as globals from the <script> tags in index.html, and tzlookup is
// optional at runtime, which is why the code tests for it before calling it.
export default [
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
    rules: {
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
      // needs declaring above; either way it is worth stopping for.
      "no-undef": "error",

      // An unused binding is dead code. Caught errors are exempt: several
      // handlers here deliberately swallow the error and fall back.
      "no-unused-vars": ["error", { caughtErrors: "none" }],

      // Easy to write by accident, and each one hides a real bug.
      "no-cond-assign": ["error", "always"],
      "no-constant-condition": "error",
      "no-fallthrough": "error",
      "no-redeclare": "error",
      "no-shadow-restricted-names": "error",
      "require-atomic-updates": "error",

      // An empty block is usually an unfinished edit. A bare catch is not — it
      // is how this file says "this path is allowed to fail".
      "no-empty": ["error", { allowEmptyCatch: true }],

      // House style, and both catch real mistakes: var hoists out of the block
      // it is written in, and == coerces.
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "smart"],
    },
  },
];
