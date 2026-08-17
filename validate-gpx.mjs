// Checks every GPX file in the repository is well-formed and is really GPX 1.1, against the schema
// kept at resources/gpx.xsd.
//
// The schema is vendored rather than fetched. GPX 1.1 has not moved since 2004 and the file is 26
// KB, so there is nothing to gain by making this check depend on a twenty-year-old site staying up.
//
// This is a script rather than a command line because xmllint-wasm ships no executable — it is a
// library, and libxml2 built to WebAssembly. That is the point: the validator is pinned in the
// lockfile like the linters, where an apt-get install of libxml2-utils would have followed whatever
// the runner image happened to ship that week.
//
//   pnpm install && pnpm lint:xml
//
// The file list comes from git rather than a glob, the same way gpx.json is generated, so a waypoint
// file at the root is covered like a route in a country directory and a name with a space or an
// accent survives intact.
//
// What this does not reach: GPX declares <extensions> as any element from another namespace,
// processed leniently, so with nothing defining the pgr namespace those fields are skipped. A
// <pgr:contry> typo validates here and is caught only when the viewer refuses the file.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { validateXML } from "xmllint-wasm";

const files = execFileSync("git", ["ls-files", "-z", "*.gpx"], { encoding: "utf8" }).split("\0").filter(Boolean);

// An empty list would otherwise pass silently, which is the one result that means the check did not
// happen rather than that nothing is wrong.
if (files.length === 0) {
  console.error("No .gpx files found. Run this from the repository root.");
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

// A malformed file reports the offending source line with no position to hang it on, so the location
// is printed only when there is one.
for (const { loc, message } of errors) {
  console.error(loc ? `${loc.fileName}:${loc.lineNumber}: ${message}` : message);
}
console.error(`\n${errors.length} problem(s) in ${files.length} files.`);
process.exit(1);
