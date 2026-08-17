// html-validate's own preset, with two rules pointed at the style this file
// already writes rather than turned off. Both are about how to spell a thing,
// not whether it is right:
// index.html closes its void elements (<meta ... />) and writes crossorigin=""
// with an explicit empty value, the latter copied verbatim from the unpkg
// snippets for Leaflet and tz-lookup. Left at their defaults these would ask
// for 13 edits and catch nothing; configured this way they still hold the file
// to one convention.
export default {
  extends: ["html-validate:recommended"],
  rules: {
    "void-style": ["error", { style: "selfclose" }],
    "attribute-empty-style": ["error", { style: "empty" }],
  },
};
