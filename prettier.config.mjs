// Prettier decides formatting; the linters are left to decide correctness.
// It is run on its own — `pnpm lint:prettier` checks, `pnpm lint:prettier:fix`
// writes — rather than through eslint-plugin-prettier and stylelint-prettier,
// which would report the same problems a second time inside ESLint and
// stylelint. eslint-config-prettier stays, to switch off any ESLint rule that
// ever does disagree.
//
// Only printWidth departs from the defaults, and it is set to what this code
// already does rather than to 80: of app.js's lines, 86 run past 80 characters
// but only 19 past 100, so this leaves the great majority of them as written
// while still refusing the 306-character outliers.
//
// quoteProps departs too. Left at "as-needed", Prettier strips the quotes from
// every key that does not need them, which turns the country tables into a
// ragged mix — "Canary Islands" quoted, Antarctica bare, "North Korea" quoted,
// Singapore bare — when every key in them is the same kind of thing. Quoting
// all of a table's keys when any one of them needs it keeps it a table.
export default {
  printWidth: 100,
  quoteProps: "consistent",
};
