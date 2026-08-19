/**
 * Reading the GPX files the viewer and the backup builder both consume. `loadManifest` fetches the file list; the rest
 * pull an entry's name, locality and country out of a parsed <trk> or <wpt>. Kept in one place so the map and the
 * PGSharp backup agree on what a file says rather than each parsing it their own way.
 */

export async function loadManifest() {
  const res = await fetch('gpx.json');

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }

  const files = await res.json();

  if (!Array.isArray(files) || files.some((f) => typeof f !== 'string')) {
    throw new Error('is not a list of paths');
  }

  return files;
}

/**
 * The text of a direct child <tag>, or null. Read from the element itself, not its descendants, so a gpx.studio file's
 * <metadata><author><name> is never mistaken for an entry's name.
 */
function childText(el, tag) {
  for (const child of el.children) {
    if (child.localName === tag && child.textContent && child.textContent.trim()) {
      return child.textContent.trim();
    }
  }

  return null;
}

/**
 * The text of a <pgr:*> field in this element's own <extensions>, or null. GPX 1.1 has no element for a locality, a
 * country or a short/long variant, so each is its own extension field rather than parts packed into one <name>.
 * Matching on local name leaves the prefix a file's own business.
 *
 * Worth knowing when editing: an editor that does not model foreign extensions drops the whole block on export —
 * gpx.studio is one — so a round trip through such a tool loses these fields, and the viewer will say so rather than
 * fall back to the path.
 */
export function extText(el, tag) {
  const ext = [...el.children].find((child) => child.localName === 'extensions');
  return ext ? childText(ext, tag) : null;
}

/**
 * An entry's name with the locality it sits in — "Kings Park, Perth, Western Australia". The country is left out: it is
 * the sidebar's own grouping, and entryName adds it where a favourite needs the whole thing.
 *
 * These readers say what is wrong with the element without naming the file; each caller already knows which file it is
 * reading, and says so once.
 */
export function placeName(el) {
  const name = childText(el, 'name');

  if (!name) {
    throw new Error(`<${el.localName}> has no <name>`);
  }

  const city = extText(el, 'city');
  return city ? `${name}, ${city}` : name;
}

/**
 * The country a <trk> or <wpt> is in. Required: a countryless entry cannot be grouped, flagged or named, and guessing
 * one from the path is the papering over this file format exists to avoid.
 */
export function entryCountry(el) {
  const country = extText(el, 'country');

  if (!country) {
    throw new Error(`<${el.localName}> has no <pgr:country>`);
  }

  return country;
}
