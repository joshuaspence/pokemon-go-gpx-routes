/**
 * Checks the GPX files in the repository are in order: that each one is well-formed and really is GPX 1.1, against
 * the schema (resources/gpx.xsd), and that gpx.json still lists exactly the files the viewer should fetch.
 *
 * The schema is vendored rather than fetched. GPX 1.1 has not moved since 2004 and the file is 26 KB, so there is
 * nothing to gain by making this check depend on a twenty-year-old site staying up.
 *
 * What this does not reach: GPX declares `<extensions>` as any element from another namespace, processed leniently,
 * so with nothing defining the pgr namespace those fields are skipped. A `<pgr:contry>` typo validates here and is
 * caught only when the viewer refuses the file.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { validateXML } from 'xmllint-wasm';

const files = execFileSync('git', ['ls-files', '-z', '*.gpx'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const problems = [];

if (files.length === 0) {
  console.error('No GPX files found. Run this from the repository root.');
  process.exit(1);
}

const { valid, errors } = await validateXML({
  xml: files.map((fileName) => ({ fileName, contents: readFileSync(fileName, 'utf8') })),
  schema: [readFileSync('resources/gpx.xsd', 'utf8')],
});

if (valid) {
  console.log(`${files.length} files validate against GPX 1.1.`);
} else {
  // A malformed file reports the offending source line with no position to hang it on, so the location is printed
  // only when there is one.
  for (const { loc, message } of errors) {
    problems.push(loc ? `${loc.fileName}:${loc.lineNumber}: ${message}` : message);
  }
}

// Static hosting cannot list a directory, so the viewer is handed its paths in `gpx.json`. Nothing else notices
// when that file falls out of step with the repository, and the failure is silent in the worst way: a route that
// is perfectly good GPX, and that this script has just validated, simply never appears on the map.
const listed = JSON.parse(readFileSync('gpx.json', 'utf8'));
const unlisted = files.filter((file) => !listed.includes(file));
const phantom = listed.filter((file) => !files.includes(file));

for (const file of unlisted) {
  problems.push(`${file}: tracked but missing from gpx.json — the map will not show it`);
}

for (const file of phantom) {
  problems.push(`${file}: listed in gpx.json but not tracked — the map will fail to fetch it`);
}

if (unlisted.length || phantom.length) {
  problems.push('Regenerate it with the command in the README.');
} else {
  console.log(`gpx.json lists all ${listed.length} files.`);
}

if (problems.length === 0) {
  process.exit(0);
}

for (const problem of problems) {
  console.error(problem);
}

process.exit(1);
