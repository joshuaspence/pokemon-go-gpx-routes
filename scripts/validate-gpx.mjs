/**
 * Checks every GPX file in the repository is well-formed and is really GPX 1.1, against the schema (resources/gpx.xsd).
 *
 * The schema is vendored rather than fetched. GPX 1.1 has not moved since 2004 and the file is 26 KB, so there is 
 * nothing to gain by making this check depend on a twenty-year-old site staying up.
 *
 * What this does not reach: GPX declares `<extensions>` as any element from another namespace, processed leniently, so
 * with nothing defining the pgr namespace those fields are skipped. A `<pgr:contry>` typo validates here and is caught
 * only when the viewer refuses the file.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { validateXML } from "xmllint-wasm";

const files = execFileSync("git", ["ls-files", "-z", "*.gpx"], { encoding: "utf8" }).split("\0").filter(Boolean);

if (files.length === 0) {
  console.error("No GPX files found. Run this from the repository root.");
  process.exit(1);
}

const { valid, errors } = await validateXML({
  xml: files.map((fileName) => ({ fileName, contents: readFileSync(fileName, "utf8") })),
  schema: [readFileSync("resources/gpx.xsd", "utf8")],
});

if (valid) {
  console.log(`${files.length} files validate against GPX 1.1.`);
  process.exit(0);
}

// A malformed file reports the offending source line with no position to hang it on, so the location is printed only
// when there is one.
for (const { loc, message } of errors) {
  console.error(loc ? `${loc.fileName}:${loc.lineNumber}: ${message}` : message);
}

console.error(`\n${errors.length} problem(s) in ${files.length} files.`);
  process.exit(1);
