export default {
  extends: ["html-validate:recommended"],
  rules: {
    // Both of these are about how a thing is spelled rather than whether it is right, and both
    // follow what already writes the file rather than being switched off.
    //
    // void-style follows index.html, which closes its void elements (<meta ... />). Prettier agrees.
    //
    // doctype-style follows Prettier, which is the one place the two tools cannot both be satisfied:
    // html-validate wants <!DOCTYPE html>, Prettier writes <!doctype html>, and neither offers an
    // option. Left to disagree they deadlock — lint:html passes only while lint:prettier fails, and
    // running either one's fixer breaks the other. Prettier owns formatting here, so this follows it.
    "void-style": ["error", { style: "selfclose" }],
    "doctype-style": ["error", { style: "lowercase" }],
  },
};
