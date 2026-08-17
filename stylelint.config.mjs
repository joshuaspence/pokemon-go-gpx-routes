// As with the ESLint config, the rules are written out rather than extended
// from a shared preset, so the set only changes when someone changes it and a
// rule that fails can be argued with where it is written. This is stylelint's
// recommended set — the rules that catch a stylesheet saying something it does
// not mean — with one left out, below.
export default {
  // Formatting is Prettier's here too, reported as an ordinary stylelint
  // error so that `pnpm lint:css:fix` reformats. Nothing needs switching off
  // alongside it: stylelint dropped its stylistic rules in v15, and the set
  // below is all correctness.
  extends: ["stylelint-prettier/recommended"],
  rules: {
    "annotation-no-unknown": true,
    "at-rule-no-unknown": true,
    "block-no-empty": true,
    "color-no-invalid-hex": true,
    "comment-no-empty": true,
    "custom-property-no-missing-var-function": true,
    "declaration-block-no-duplicate-custom-properties": true,
    "declaration-block-no-duplicate-properties": true,
    "declaration-block-no-shorthand-property-overrides": true,
    "font-family-no-duplicate-names": true,
    "font-family-no-missing-generic-family-keyword": true,
    "function-calc-no-unspaced-operator": true,
    "function-linear-gradient-no-nonstandard-direction": true,
    "function-no-unknown": true,
    "keyframe-block-no-duplicate-selectors": true,
    "keyframe-declaration-no-important": true,
    "media-feature-name-no-unknown": true,
    "media-query-no-invalid": true,
    "named-grid-areas-no-invalid": true,
    "no-duplicate-at-import-rules": true,
    "no-duplicate-selectors": true,
    "no-empty-source": true,
    "no-invalid-double-slash-comments": true,
    "no-invalid-position-at-import-rule": true,
    "no-irregular-whitespace": true,
    "property-no-unknown": true,
    "selector-anb-no-unmatchable": true,
    "selector-pseudo-class-no-unknown": true,
    "selector-pseudo-element-no-unknown": true,
    "selector-type-no-unknown": true,
    "string-no-newline": true,
    "unit-no-unknown": true,

    // Left out on purpose. It asks that a selector never appear after a more
    // specific one that targets the same element, which here would mean
    // splitting up blocks that belong together — the .chev rules away from the
    // .continent ones, .route away from the sidebar indent that precedes it,
    // and :disabled before :hover on the backup button. Four complaints, none
    // of them a bug: this stylesheet is ordered by what a rule is for, and
    // that reads better than ordering it by specificity.
    "no-descending-specificity": null,
  },
};
