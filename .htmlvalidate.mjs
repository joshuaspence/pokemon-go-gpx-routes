// html-validate's own preset, with three rules pointed at the style the file
// is written in rather than turned off. All three are about how to spell a
// thing, not whether it is right.
//
// void-style and attribute-empty-style follow index.html: it closes its void
// elements (<meta ... />) and writes crossorigin="" with an explicit empty
// value, the latter copied verbatim from the unpkg snippets for Leaflet and
// tz-lookup. Prettier agrees with both, so they are unchanged.
//
// doctype-style follows Prettier, which is the one place the two disagree:
// html-validate wants <!DOCTYPE html> and Prettier writes <!doctype html>,
// with no option either way. Prettier owns formatting here, so the rule is
// pointed at what it produces rather than switched off.
export default {
  extends: ["html-validate:recommended"],
  rules: {
    "void-style": ["error", { style: "selfclose" }],
    "attribute-empty-style": ["error", { style: "empty" }],
    "doctype-style": ["error", { style: "lowercase" }],
  },
};
