import { COUNTRIES } from './countries.js';
import { CONTROL_RESETS } from './pgsharp-controls.js';

async function loadManifest() {
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

const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

// zoomSnap: 0 lets fitBounds land on a fractional zoom. Snapping to whole levels rounds down, which can leave the
// fitted layers filling as little as half the map — a lot of dead space on a narrow phone viewport.
const map = L.map('map', { worldCopyJump: true, zoomSnap: 0 }).setView([20, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const listEl = document.getElementById('list');
const countEl = document.getElementById('count');
const filterEl = document.getElementById('filter');
const bannerEl = document.getElementById('banner');
const toastEl = document.getElementById('toast');

const store = []; // { name, country, variant, file, gpx, latlngs, line, el, markers, distance }
const cityStore = []; // { name, country, coords:[lat,lon], coordStr, marker, el }
let active = null;
let activeCity = null;
let toastTimer = null;

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
}

// Copy text to the clipboard, falling back to `execCommand` for insecure contexts (e.g. served over plain HTTP, where
// the async Clipboard API is unavailable). Returns a promise that resolves to true on success.
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// Flash a copy button through its outcome — "Copied" or "Failed" — then restore its label a moment later. The button is
// optional, so a caller with none to flash still shares this path.
function flashButton(btn, ok) {
  if (!btn) {
    return;
  }

  const original = btn.textContent;
  btn.textContent = ok ? 'Copied' : 'Failed';
  btn.classList.add('done');
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove('done');
  }, 1400);
}

async function copyRoute(entry, btn) {
  const ok = await copyText(entry.gpx);
  flashButton(btn, ok);
  toast(ok ? `Copied “${entry.name}” GPX to clipboard` : 'Copy failed');
}

function haversine(a, b) {
  const R = 6371000,
    toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]),
    dLon = toRad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function routeDistance(latlngs) {
  let d = 0;

  for (let i = 1; i < latlngs.length; i++) {
    d += haversine(latlngs[i - 1], latlngs[i]);
  }

  return d;
}

function fmtDist(m) {
  return m >= 1000 ? (m / 1000).toFixed(2) + ' km' : Math.round(m) + ' m';
}

// The text of a direct child <tag>, or null. Read from the element itself, not its descendants, so a gpx.studio file's
// <metadata><author><name> is never mistaken for an entry's name.
function childText(el, tag) {
  for (const child of el.children) {
    if (child.localName === tag && child.textContent && child.textContent.trim()) {
      return child.textContent.trim();
    }
  }

  return null;
}

// The text of a <pgr:*> field in this element's own <extensions>, or null. GPX 1.1 has no element for a locality, a
// country or a short/long variant, so each is its own extension field rather than parts packed into one <name>.
// Matching on local name leaves the prefix a file's own business.
//
// Worth knowing when editing: an editor that does not model foreign extensions drops the whole block on export —
// gpx.studio is one — so a round trip through such a tool loses these fields, and the viewer will say so rather than
// fall back to the path.
function extText(el, tag) {
  const ext = [...el.children].find((child) => child.localName === 'extensions');
  return ext ? childText(ext, tag) : null;
}

// An entry's name with the locality it sits in — "Kings Park, Perth, Western Australia". The country is left out: it is
// the sidebar's own grouping, and entryName adds it where a favourite needs the whole thing.
//
// These readers say what is wrong with the element without naming the file; each caller already knows which file it is
// reading, and says so once.
function placeName(el) {
  const name = childText(el, 'name');

  if (!name) {
    throw new Error(`<${el.localName}> has no <name>`);
  }

  const city = extText(el, 'city');
  return city ? `${name}, ${city}` : name;
}

// The country a <trk> or <wpt> is in. Required: a countryless entry cannot be grouped, flagged or named, and guessing
// one from the path is the papering over this file format exists to avoid.
function entryCountry(el) {
  const country = extText(el, 'country');

  if (!country) {
    throw new Error(`<${el.localName}> has no <pgr:country>`);
  }

  return country;
}

// Read one file, splitting it into routes and waypoints by element rather than by where it sits: a <trk> is a path to
// walk, a <wpt> is one place to stand, and a file may hold either or both. This is how the backup writer has always
// read these files (see parseGpxFavourites), so the two now agree about what a file contains instead of the viewer
// being told separately.
//
// Name, locality, country and variant all come from the file's own metadata; an entry missing what it needs is rejected
// rather than guessed at, so the gap shows up in the banner instead of quietly reading back the path. The variant stays
// optional — it is empty for a route with no short/long counterpart. The whole file text is returned once, for the copy
// button to hand over.
async function loadGpxFile(file) {
  const res = await fetch(encodeURI(file));

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  const doc = new DOMParser().parseFromString(text, 'application/xml');

  if (doc.querySelector('parsererror')) {
    throw new Error('not valid XML');
  }

  const routes = [];

  for (const trk of doc.getElementsByTagName('trk')) {
    const trkpts = trk.getElementsByTagName('trkpt');

    // An emptied <trk> is what gpx.studio writes for a cleared track; skip it rather than report it, matching
    // parseGpxFavourites. A <trk> that kept a single point is a different thing — a track that cannot be drawn — and is
    // still an error.
    if (trkpts.length === 0) {
      continue;
    }

    const latlngs = [];

    for (const p of trkpts) {
      const lat = parseFloat(p.getAttribute('lat'));
      const lon = parseFloat(p.getAttribute('lon'));

      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        latlngs.push([lat, lon]);
      }
    }

    if (latlngs.length < 2) {
      throw new Error('<trk> has fewer than two usable <trkpt>');
    }

    routes.push({
      latlngs,
      name: placeName(trk),
      country: entryCountry(trk),
      variant: extText(trk, 'variant') || '',
    });
  }

  // coordStr preserves the file's exact lat/lon text for copying.
  const waypoints = [];

  for (const w of doc.getElementsByTagName('wpt')) {
    const latStr = w.getAttribute('lat'),
      lonStr = w.getAttribute('lon');
    const lat = parseFloat(latStr),
      lon = parseFloat(lonStr);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error(`<wpt> at ${latStr},${lonStr} has an unparseable coordinate`);
    }

    waypoints.push({
      country: entryCountry(w),
      name: placeName(w),
      coords: [lat, lon],
      coordStr: `${latStr},${lonStr}`,
    });
  }

  // A listed file holding neither is a defect too: something is in gpx.json that has nothing to show.
  if (routes.length === 0 && waypoints.length === 0) {
    throw new Error('has no <trk> or <wpt>');
  }

  return { text, routes, waypoints };
}

function clearMarkers(entry) {
  if (entry.markers) {
    entry.markers.forEach((m) => map.removeLayer(m));
    entry.markers = null;
  }
}

// Build a map popup: a bold title, a detail line, and a copy button. The copy handler is handed the button so it can
// flash it (see flashButton). Returns the element to bind to a layer.
function buildPopup(name, detail, copyLabel, onCopy) {
  const popup = document.createElement('div');
  const title = document.createElement('b');
  title.textContent = name;
  const info = document.createElement('div');
  info.textContent = detail;
  const btn = document.createElement('button');
  btn.className = 'popup-copy';
  btn.type = 'button';
  btn.textContent = copyLabel;
  btn.addEventListener('click', () => onCopy(btn));
  popup.append(title, info, btn);
  return popup;
}

// Return the active route to its resting style, drop its start/end markers and un-highlight its row. Mirrors
// deselectCity, so selecting either kind can clear the other with a single call.
function deselectRoute() {
  if (!active) {
    return;
  }

  active.line.setStyle({ color: cssVar('--track'), weight: 2, opacity: 0.55 });
  active.line.bringToBack();
  clearMarkers(active);
  active.el.classList.remove('active');
  active = null;
}

function selectRoute(entry, { pan = true } = {}) {
  deselectCity();
  deselectRoute();
  active = entry;
  entry.el.classList.add('active');
  entry.line.setStyle({ color: cssVar('--accent'), weight: 4, opacity: 1 });
  entry.line.bringToFront();

  clearMarkers(entry);
  const a = entry.latlngs[0],
    b = entry.latlngs[entry.latlngs.length - 1];
  const dot = (at, color, label) =>
    L.circleMarker(at, {
      radius: 6,
      color: '#fff',
      weight: 2,
      fillColor: color,
      fillOpacity: 1,
    }).bindTooltip(label);
  entry.markers = [dot(a, cssVar('--start'), 'Start').addTo(map), dot(b, cssVar('--end'), 'End').addTo(map)];

  const detail = `${entry.country} · ${entry.latlngs.length} points · ${fmtDist(entry.distance)}`;
  entry.line.bindPopup(buildPopup(entry.name, detail, 'Copy GPX', (btn) => copyRoute(entry, btn)));

  if (pan) {
    map.fitBounds(entry.line.getBounds(), { padding: [24, 24], maxZoom: 17 });
    entry.line.openPopup();
  }

  entry.el.closest('.country-group')?.classList.remove('collapsed');
  entry.el.closest('.continent-group')?.classList.remove('collapsed');
  entry.el.scrollIntoView({ block: 'nearest' });
}

function deselectCity() {
  if (!activeCity) {
    return;
  }

  activeCity.marker.setStyle({ radius: 5, fillColor: cssVar('--city') });
  activeCity.el.classList.remove('active');
  activeCity = null;
}

function selectCity(c, { pan = true } = {}) {
  // Clear any active route selection so only one thing is highlighted.
  deselectRoute();
  deselectCity();
  activeCity = c;
  c.el.classList.add('active');
  c.marker.setStyle({ radius: 8, fillColor: cssVar('--accent') });
  c.marker.bringToFront();

  c.marker.bindPopup(
    buildPopup(c.name, `${c.country} · ${c.coordStr}`, 'Copy coordinates', (btn) => copyCoords(c, btn)),
  );

  if (pan) {
    map.setView(c.coords, Math.max(map.getZoom(), 12));
    c.marker.openPopup();
  }

  c.el.closest('.country-group')?.classList.remove('collapsed');
  c.el.closest('.continent-group')?.classList.remove('collapsed');
  c.el.scrollIntoView({ block: 'nearest' });
}

async function copyCoords(c, btn) {
  const ok = await copyText(c.coordStr);
  flashButton(btn, ok);
  toast(ok ? `Copied ${c.name} coordinates to clipboard` : 'Copy failed');
}

function buildRouteRow(entry) {
  const el = document.createElement('div');
  el.className = 'route';
  el.dataset.country = entry.country;
  el.dataset.name = entry.name.toLowerCase();
  const label = document.createElement('span');
  label.textContent = entry.name;
  const end = document.createElement('span');
  end.className = 'end';
  const meta = document.createElement('span');
  meta.className = 'meta';
  meta.textContent = fmtDist(entry.distance);
  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy';
  copyBtn.type = 'button';
  copyBtn.textContent = 'Copy';
  copyBtn.title = 'Copy GPX file contents to clipboard';
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    copyRoute(entry, copyBtn);
  });
  end.append(meta, copyBtn);
  el.append(label, end);
  el.addEventListener('click', () => selectRoute(entry));
  entry.el = el;
  return el;
}

function buildCityRow(c, country) {
  const el = document.createElement('div');
  el.className = 'route city';
  el.dataset.country = country;
  el.dataset.name = c.name.toLowerCase();
  const label = document.createElement('span');
  label.textContent = c.name;
  const end = document.createElement('span');
  end.className = 'end';
  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy';
  copyBtn.type = 'button';
  copyBtn.textContent = 'Copy';
  copyBtn.title = 'Copy coordinates to clipboard';
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    copyCoords(c, copyBtn);
  });
  end.append(copyBtn);
  el.append(label, end);
  el.addEventListener('click', () => selectCity(c));
  c.el = el;
  return el;
}

// Render one list grouped by country. Within each country, tracks and waypoints are interleaved and sorted
// alphabetically by name.
function buildSidebar() {
  countEl.textContent = cityStore.length
    ? `${store.length} tracks \u00b7 ${cityStore.length} waypoints`
    : `${store.length} tracks across ${new Set(store.map((s) => s.country)).size} countries`;

  const byCountry = {};

  for (const s of store) {
    (byCountry[s.country] ||= []).push({
      name: s.name,
      dist: s.distance,
      build: () => buildRouteRow(s),
    });
  }

  for (const c of cityStore) {
    (byCountry[c.country] ||= []).push({
      name: c.name,
      dist: 0,
      build: () => buildCityRow(c, c.country),
    });
  }

  const byContinent = {};

  for (const country of Object.keys(byCountry)) {
    (byContinent[COUNTRIES[country]?.continent || 'Other'] ||= []).push(country);
  }

  for (const continent of Object.keys(byContinent).sort()) {
    const cg = document.createElement('div');
    cg.className = 'continent-group collapsed';
    const chead = document.createElement('div');
    chead.className = 'continent';
    const cchev = document.createElement('span');
    cchev.className = 'chev';
    cchev.textContent = '▾';
    const clabel = document.createElement('span');
    clabel.textContent = continent;
    chead.append(cchev, clabel);
    chead.addEventListener('click', () => cg.classList.toggle('collapsed'));
    cg.appendChild(chead);
    const citems = document.createElement('div');
    citems.className = 'continent-items';

    for (const country of byContinent[continent].sort()) {
      const group = document.createElement('div');
      group.className = 'country-group collapsed';
      const head = document.createElement('div');
      head.className = 'country';
      head.dataset.country = country;
      const chev = document.createElement('span');
      chev.className = 'chev';
      chev.textContent = '▾';
      const label = document.createElement('span');
      label.textContent = country;
      head.append(chev, label);
      head.addEventListener('click', () => group.classList.toggle('collapsed'));
      group.appendChild(head);
      const items = document.createElement('div');
      items.className = 'country-items';

      for (const item of byCountry[country].sort((a, b) => a.name.localeCompare(b.name) || a.dist - b.dist)) {
        items.appendChild(item.build());
      }

      group.appendChild(items);
      citems.appendChild(group);
    }

    cg.appendChild(citems);
    listEl.appendChild(cg);
  }
}

filterEl.addEventListener('input', () => {
  const q = filterEl.value.trim().toLowerCase();
  document.querySelectorAll('.route').forEach((el) => {
    const hit = !q || el.dataset.name.includes(q) || el.dataset.country.toLowerCase().includes(q);
    el.classList.toggle('hidden', !hit);
  });

  // Hide groups with no matches; while searching, auto-expand those that have matches so the results are visible. With
  // no query, collapse everything.
  document.querySelectorAll('.country-group').forEach((group) => {
    const anyVisible = [...group.querySelectorAll('.route')].some((r) => !r.classList.contains('hidden'));
    group.classList.toggle('hidden', !anyVisible);
    group.classList.toggle('collapsed', q ? !anyVisible : true);
  });

  document.querySelectorAll('.continent-group').forEach((cg) => {
    const anyVisible = [...cg.querySelectorAll('.country-group')].some((g) => !g.classList.contains('hidden'));
    cg.classList.toggle('hidden', !anyVisible);
    cg.classList.toggle('collapsed', q ? !anyVisible : true);
  });
});

function showBanner(html) {
  bannerEl.innerHTML = html;
  bannerEl.style.display = 'block';
}

// Name every file that could not be read, and why. The banner stays up: a file whose metadata is missing is a defect to
// fix, not a transient hiccup to time out, and the map now has no way to show a placeholder for it.
function appendRejected(rejected) {
  const head = document.createElement('b');
  head.textContent = `${rejected.length} file(s) rejected — fix the GPX metadata:`;
  const list = document.createElement('ul');

  for (const { file, reason } of rejected) {
    console.error(`${file}: ${reason}`);
    const item = document.createElement('li');
    const path = document.createElement('code');
    path.textContent = file;
    item.append(path, document.createTextNode(` — ${reason}`));
    list.appendChild(item);
  }

  bannerEl.append(head, list);
  bannerEl.style.display = 'block';
}

async function init() {
  const rejected = [];
  const note = (file, e) => rejected.push({ file, reason: e.message });

  // Nothing can be drawn without the list, and reading it is the page's first fetch — so this is also where opening the
  // page from disk lands.
  let files;

  try {
    files = await loadManifest();
  } catch (e) {
    showBanner(
      `<b>Could not read <code>gpx.json</code> — ${e.message}.</b><br>` +
        'This page reads the route list and the <code>.gpx</code> files over HTTP, ' +
        'so it needs to be served rather than opened directly from disk. Try:<br>' +
        '<code>python3 -m http.server</code> then open ' +
        '<code>http://localhost:8000/</code> — or view it via GitHub Pages.',
    );
    return;
  }

  // One bad file does not hide the others, but it is still reported.
  const results = await Promise.allSettled(files.map((file) => loadGpxFile(file)));
  results.forEach((res, i) => {
    const file = files[i];

    if (res.status === 'rejected') {
      note(file, res.reason);
      return;
    }

    const { text, routes, waypoints } = res.value;

    for (const route of routes) {
      const line = L.polyline(route.latlngs, {
        color: cssVar('--track'),
        weight: 2,
        opacity: 0.55,
      }).addTo(map);
      const entry = {
        ...route,
        file,
        gpx: text,
        line,
        markers: null,
        distance: routeDistance(route.latlngs),
      };
      line.on('click', () => selectRoute(entry, { pan: false }));
      store.push(entry);
    }

    for (const place of waypoints) {
      const marker = L.circleMarker(place.coords, {
        radius: 5,
        color: '#fff',
        weight: 2,
        fillColor: cssVar('--city'),
        fillOpacity: 1,
      }).addTo(map);
      marker.bindTooltip(place.name);
      const entry = { ...place, marker };
      marker.on('click', () => selectCity(entry, { pan: false }));
      cityStore.push(entry);
    }
  });

  buildSidebar();

  if (rejected.length) {
    appendRejected(rejected);
  }

  // Every file listed was rejected; the banner already names each one, and there is no layer to fit the map to.
  if (store.length === 0 && cityStore.length === 0) {
    return;
  }

  const all = L.featureGroup([...store.map((s) => s.line), ...cityStore.map((c) => c.marker)]);
  map.fitBounds(all.getBounds(), { padding: [16, 16] });
}

init();

// ---------------------------------------------------------------------------------------------------------------------
// PGSharp backup editing, ported from the pgsedit tool.
//
// PGSData.dat is a serialized java.util.HashMap<String,Object> whose two favourite keys hold JSON: "hlfavor" is Points
// (one coordinate each, from <wpt>) and "hlfavorRoute" is Routes (a whole path, from <trk>). To write those keys back
// we have to read and faithfully re-emit the whole Java serialization stream — handles are positional, so the tool
// re-emits the stream from scratch rather than patching bytes. See the pgsedit README for the format details this
// mirrors.
// ---------------------------------------------------------------------------------------------------------------------
const JavaSer = (() => {
  // ObjectStreamConstants.
  const STREAM_MAGIC = 0xaced,
    STREAM_VERSION = 5;
  const TC_NULL = 0x70,
    TC_REFERENCE = 0x71,
    TC_CLASSDESC = 0x72,
    TC_OBJECT = 0x73,
    TC_STRING = 0x74,
    TC_ENDBLOCKDATA = 0x78,
    TC_BLOCKDATA = 0x77,
    TC_BLOCKDATALONG = 0x7a,
    TC_LONGSTRING = 0x7c;
  const BASE_HANDLE = 0x7e0000;
  const SC_WRITE_METHOD = 0x01,
    SC_SERIALIZABLE = 0x02;

  // Boxed primitives, keyed by JVM field-type code. The value carried is a Number for I/F, a BigInt for J (a 64-bit
  // long won't fit a JS number and must round-trip exactly — PGSharp hides doubles inside longs), and a boolean for Z.
  const BOX = {
    I: { cls: 'java.lang.Integer', uid: 0x12e2a0a4f7818738n },
    J: { cls: 'java.lang.Long', uid: 0x3b8be490cc8f23dfn },
    F: { cls: 'java.lang.Float', uid: 0xdaedc9a2db3cf0ecn },
    Z: { cls: 'java.lang.Boolean', uid: 0xcd207280d59cfaeen },
  };
  const BOX_BY_CLASS = {
    'java.lang.Integer': 'I',
    'java.lang.Long': 'J',
    'java.lang.Float': 'F',
    'java.lang.Boolean': 'Z',
  };
  const NUMBER = { name: 'java.lang.Number', uid: 0x86ac951d0b94e08bn };
  const HASHMAP_UID = 0x0507dac1c31660d1n;

  const err = (m) => new Error(m);

  // Java's "modified UTF-8": U+0000 is C0 80 and non-BMP characters are written as their two UTF-16 surrogates (3 bytes
  // each), so we iterate UTF-16 code units rather than code points.
  function encodeMutf8(s) {
    const out = [];

    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);

      if (c === 0) {
        out.push(0xc0, 0x80);
      } else if (c < 0x80) {
        out.push(c);
      } else if (c < 0x800) {
        out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      } else {
        out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      }
    }

    return out;
  }

  function decodeMutf8(bytes) {
    let s = '',
      i = 0;
    const n = bytes.length;

    while (i < n) {
      const c = bytes[i];

      if (c < 0x80) {
        s += String.fromCharCode(c);
        i += 1;
      } else if ((c & 0xe0) === 0xc0) {
        if (i + 1 >= n) {
          throw err('truncated modified UTF-8 sequence');
        }

        s += String.fromCharCode(((c & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
        i += 2;
      } else if ((c & 0xf0) === 0xe0) {
        if (i + 2 >= n) {
          throw err('truncated modified UTF-8 sequence');
        }

        s += String.fromCharCode(((c & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f));
        i += 3;
      } else {
        throw err(`invalid modified UTF-8 byte 0x${c.toString(16)}`);
      }
    }

    return s;
  }

  class Reader {
    constructor(bytes) {
      this.b = bytes;
      this.dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      this.p = 0;
      this.handles = [];
    }
    u1() {
      if (this.p >= this.b.length) {
        throw err('truncated stream');
      }

      return this.b[this.p++];
    }
    u2() {
      const v = this.dv.getUint16(this.p);
      this.p += 2;
      return v;
    }
    i4() {
      const v = this.dv.getInt32(this.p);
      this.p += 4;
      return v;
    }
    i8() {
      const v = this.dv.getBigInt64(this.p);
      this.p += 8;
      return v;
    }
    f4() {
      const v = this.dv.getFloat32(this.p);
      this.p += 4;
      return v;
    }
    f8() {
      const v = this.dv.getFloat64(this.p);
      this.p += 8;
      return v;
    }
    raw(n) {
      const v = this.b.subarray(this.p, this.p + n);

      if (v.length !== n) {
        throw err('truncated stream');
      }

      this.p += n;
      return v;
    }
    peek() {
      return this.b[this.p];
    }
    newHandle(obj) {
      this.handles.push(obj);
      return obj;
    }
    // The JVM assigns an object's handle before its fields are read, so a self-referential object can cite itself;
    // reserve the slot, back-patch it.
    claimHandle() {
      this.handles.push(null);
      return this.handles.length - 1;
    }
    resolveHandle(slot, obj) {
      this.handles[slot] = obj;
      return obj;
    }
    ref() {
      const h = this.i4() - BASE_HANDLE;

      if (h < 0 || h >= this.handles.length) {
        throw err(`bad handle reference ${h}`);
      }

      return this.handles[h];
    }
    utf() {
      return decodeMutf8(this.raw(this.u2()));
    }
    longUtf() {
      return decodeMutf8(this.raw(Number(this.i8())));
    }

    classDesc() {
      const tag = this.u1();

      if (tag === TC_NULL) {
        return null;
      }

      if (tag === TC_REFERENCE) {
        return this.ref();
      }

      if (tag !== TC_CLASSDESC) {
        throw err(`expected classdesc, got 0x${tag.toString(16)} at ${this.p - 1}`);
      }

      const name = this.utf();
      const uid = this.i8();
      const flags = this.u1();
      const desc = this.newHandle({ name, uid, flags, fields: [] });
      const nfields = this.u2();

      for (let i = 0; i < nfields; i++) {
        const tcode = String.fromCharCode(this.u1());
        const fname = this.utf();

        if (tcode === 'L' || tcode === '[') {
          this.content();
        } // field type string; unused

        desc.fields.push([tcode, fname]);
      }

      this.skipAnnotation();
      desc.super = this.classDesc();
      return desc;
    }
    skipAnnotation() {
      for (;;) {
        if (this.peek() === TC_ENDBLOCKDATA) {
          this.p += 1;
          return;
        }

        this.content();
      }
    }
    readPrimitive(tcode) {
      switch (tcode) {
        case 'I':
          return this.i4();
        case 'J':
          return this.i8();
        case 'F':
          return this.f4();
        case 'D':
          return this.f8();
        case 'Z':
          return this.u1() !== 0;
        case 'B':
          return this.u1();

        case 'S': {
          const v = this.dv.getInt16(this.p);
          this.p += 2;
          return v;
        }

        case 'C': {
          const v = this.dv.getUint16(this.p);
          this.p += 2;
          return String.fromCharCode(v);
        }

        default:
          throw err(`unsupported field type '${tcode}'`);
      }
    }
    content() {
      const tag = this.u1();

      if (tag === TC_NULL) {
        return null;
      }

      if (tag === TC_REFERENCE) {
        return this.ref();
      }

      if (tag === TC_STRING) {
        return this.newHandle(this.utf());
      }

      if (tag === TC_LONGSTRING) {
        return this.newHandle(this.longUtf());
      }

      if (tag === TC_BLOCKDATA) {
        return { blockdata: this.raw(this.u1()) };
      }

      if (tag === TC_BLOCKDATALONG) {
        return { blockdata: this.raw(this.i4()) };
      }

      if (tag === TC_OBJECT) {
        return this.object();
      }

      throw err(`unsupported tag 0x${tag.toString(16)} at offset ${this.p - 1}`);
    }
    object() {
      const desc = this.classDesc();
      const slot = this.claimHandle();
      const chain = [];

      for (let d = desc; d; d = d.super) {
        chain.push(d);
      }

      chain.reverse(); // superclass fields come first

      for (const d of chain) {
        for (const [tcode, fname] of d.fields) {
          d.values ||= {};
          // We only need HashMap's writeObject payload; a field's value is read to advance the stream but not otherwise
          // used here.
          d.values[fname] = tcode === 'L' || tcode === '[' ? this.content() : this.readPrimitive(tcode);
        }

        if (d.flags & SC_WRITE_METHOD) {
          d.custom = this.customData(d.name);
        }
      }

      const name = desc.name;

      if (name in BOX_BY_CLASS) {
        const t = BOX_BY_CLASS[name];
        return this.resolveHandle(slot, { box: t, value: chain[chain.length - 1].values.value });
      }

      if (name === 'java.util.HashMap') {
        let entries = null;

        for (const d of chain) {
          if (d.custom !== undefined) {
            entries = d.custom;
          }
        }

        return this.resolveHandle(slot, entries);
      }

      throw err(`unsupported class ${name}`);
    }
    customData(className) {
      if (className !== 'java.util.HashMap') {
        throw err(`no custom-data handler for ${className}`);
      }

      if (this.u1() !== TC_BLOCKDATA) {
        throw err('expected HashMap block data');
      }

      const payload = this.raw(this.u1());
      const pdv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
      const size = pdv.getInt32(4); // [capacity, size]; capacity is recomputed on write
      const m = new Map();

      for (let i = 0; i < size; i++) {
        const k = this.content();
        m.set(k, this.content());
      }

      if (this.u1() !== TC_ENDBLOCKDATA) {
        throw err('expected TC_ENDBLOCKDATA after HashMap');
      }

      return m;
    }
  }

  function loads(bytes) {
    const r = new Reader(bytes);

    if (r.u2() !== STREAM_MAGIC || r.u2() !== STREAM_VERSION) {
      throw err('not a Java serialization stream (bad magic/version)');
    }

    const root = r.content();

    if (r.p !== bytes.length) {
      throw err(`${bytes.length - r.p} trailing bytes after root object`);
    }

    return root;
  }

  class Writer {
    constructor() {
      this.out = [];
      this.strHandles = new Map(); // value-keyed; a repeat becomes a back-reference
      this.boxHandles = new Map(); // identity-keyed
      this.classHandles = new Map(); // name-keyed
      this.next = 0;
    }
    claim() {
      return this.next++;
    }
    push(arr) {
      for (let i = 0; i < arr.length; i++) {
        this.out.push(arr[i]);
      }
    }
    u1(v) {
      this.out.push(v & 0xff);
    }
    u2(v) {
      this.out.push((v >> 8) & 0xff, v & 0xff);
    }
    i4(v) {
      this.out.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
    }
    i8(v) {
      let x = BigInt.asUintN(64, BigInt(v));
      const bytes = new Array(8);

      for (let i = 7; i >= 0; i--) {
        bytes[i] = Number(x & 0xffn);
        x >>= 8n;
      }

      this.push(bytes);
    }
    f4(v) {
      const b = new Uint8Array(4);
      new DataView(b.buffer).setFloat32(0, v, false);
      this.push(b);
    }
    utf(s) {
      const b = encodeMutf8(s);

      if (b.length > 0xffff) {
        throw err('string too long for TC_STRING');
      }

      this.u2(b.length);
      this.push(b);
    }
    ref(h) {
      this.u1(TC_REFERENCE);
      this.i4(BASE_HANDLE + h);
    }
    string(s) {
      const h = this.strHandles.get(s);

      if (h !== undefined) {
        this.ref(h);
        return;
      }

      const b = encodeMutf8(s);

      if (b.length <= 0xffff) {
        this.u1(TC_STRING);
        this.u2(b.length);
      } else {
        this.u1(TC_LONGSTRING);
        this.i8(BigInt(b.length));
      }

      this.push(b);
      this.strHandles.set(s, this.claim());
    }
    classDesc(name, uid, flags, fields, superName, superUid) {
      const h = this.classHandles.get(name);

      if (h !== undefined) {
        this.ref(h);
        return;
      }

      this.u1(TC_CLASSDESC);
      this.utf(name);
      this.i8(uid);
      this.u1(flags);
      this.u2(fields.length);

      for (const [tc, fn] of fields) {
        this.u1(tc.charCodeAt(0));
        this.utf(fn);
      }

      this.u1(TC_ENDBLOCKDATA); // empty classAnnotation
      this.classHandles.set(name, this.claim());

      if (superName == null) {
        this.u1(TC_NULL);
      } else {
        this.classDesc(superName, superUid, SC_SERIALIZABLE, []);
      }
    }
    box(b) {
      const info = BOX[b.box];
      this.u1(TC_OBJECT);

      if (b.box === 'Z') {
        this.classDesc(info.cls, info.uid, SC_SERIALIZABLE, [['Z', 'value']]);
      } else {
        this.classDesc(info.cls, info.uid, SC_SERIALIZABLE, [[b.box, 'value']], NUMBER.name, NUMBER.uid);
      }

      this.boxHandles.set(b, this.claim());

      if (b.box === 'Z') {
        this.u1(b.value ? 1 : 0);
      } else if (b.box === 'I') {
        this.i4(b.value);
      } else if (b.box === 'J') {
        this.i8(b.value);
      } else if (b.box === 'F') {
        this.f4(b.value);
      }
    }
    value(v) {
      if (v === null || v === undefined) {
        this.u1(TC_NULL);
      } else if (typeof v === 'string') {
        this.string(v);
      } else if (v.box) {
        const h = this.boxHandles.get(v);

        if (h !== undefined) {
          this.ref(h);
        } else {
          this.box(v);
        }
      } else if (v instanceof Map) {
        this.hashmap(v);
      } else {
        throw err(`cannot serialize ${typeof v}`);
      }
    }
    hashmap(m) {
      this.u1(TC_OBJECT);
      this.classDesc('java.util.HashMap', HASHMAP_UID, SC_WRITE_METHOD | SC_SERIALIZABLE, [
        ['F', 'loadFactor'],
        ['I', 'threshold'],
      ]);
      this.claim(); // the map's own handle
      const loadFactor = 0.75;
      const capacity = tableSizeFor(m.size, loadFactor);
      this.f4(loadFactor);
      this.i4(Math.trunc(capacity * loadFactor));
      this.u1(TC_BLOCKDATA);
      this.u1(8);
      this.i4(capacity);
      this.i4(m.size);

      for (const [k, val] of m) {
        this.value(k);
        this.value(val);
      }

      this.u1(TC_ENDBLOCKDATA);
    }
  }

  // Mirror HashMap's power-of-two capacity growth for a given entry count.
  function tableSizeFor(size, loadFactor) {
    let capacity = 16;

    while (size > capacity * loadFactor) {
      capacity <<= 1;
    }

    return capacity;
  }

  function dumps(root) {
    const w = new Writer();
    w.u2(STREAM_MAGIC);
    w.u2(STREAM_VERSION);
    w.value(root);
    return Uint8Array.from(w.out);
  }

  return { loads, dumps, box: (t, v) => ({ box: t, value: v }) };
})();

// ---------------------------------------------------------------------------------------------------------------------
// GPX -> favourites, mirroring pgsedit's parse_gpx / entry_name.
// ---------------------------------------------------------------------------------------------------------------------
const POINTS_KEY = 'hlfavor';
const ROUTES_KEY = 'hlfavorRoute';
// Third element of every stored route point, and the neutral playback state of a route that has not been walked — both
// copied from PGSharp's own output.
const ROUTE_POINT_FLAG = 65536;
const ROUTE_MODE = 2;
const newRouteState = () => ({
  direction: 1,
  nextNodePos: 0,
  preNodePos: -1,
  loopcount: 0,
  lat: 0,
  lng: 0,
});

// Gson's JSON spelling: no spaces, forward slashes escaped. Points escape non-ASCII as \uXXXX (what "hlfavor"
// contains); Routes write it literally ("São Paulo") — the two keys differ, so they don't share an encoder. A flag is
// escaped per UTF-16 code unit either way, matching hot places for Points and leaving the Route stream to write the
// surrogates as Java's modified UTF-8 does.
const escSlashes = (s) => s.replace(/\//g, '\\/');
const asciiEscape = (s) => s.replace(/[\u0080-\uFFFF]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

function encodePoints(entries) {
  const arr = entries.map((e) => {
    const o = { name: e.name, lat: e.lat, lng: e.lng };

    if (e.tz) {
      o.tz = e.tz;
    }

    return o;
  });
  return escSlashes(asciiEscape(JSON.stringify(arr)));
}

function encodeRoutes(entries) {
  const arr = entries.map((e) => ({
    points: e.points,
    mode: e.mode ?? ROUTE_MODE,
    state: e.state || newRouteState(),
    name: e.name,
  }));
  return escSlashes(JSON.stringify(arr));
}

// A favourite's whole name — the sidebar's "<name>, <locality>" plus the country and, for one of a short/long pair, the
// variant: "Kings Park, Perth, Western Australia, Australia (long)". PGSharp lists and deletes favourites by name, so
// this is the only identity a favourite has, which is why every part of it comes from the file rather than the path —
// this mirrors pgsedit's entry_name.
function entryName(el) {
  const label = `${placeName(el)}, ${entryCountry(el)}`;
  const variant = extText(el, 'variant');
  return variant ? `${label} (${variant})` : label;
}

// A subdivision flag is a black flag, the region and subdivision letters as tag characters (ASCII shifted into the tag
// block), then the cancel tag.
const REGIONAL_INDICATOR_A = 0x1f1e6,
  TAG_BLOCK = 0xe0000,
  CANCEL_TAG = 0xe007f;
const BLACK_FLAG = '\u{1F3F4}';

// The emoji flag for a country, derived from its alpha-2 code in COUNTRIES.
//
// PGSharp's own hot places carry a country flag at the front of the name — "🇺🇸 Pier 39, California, USA" — in the
// same {name,lat,lng,tz} schema our waypoints use. The format has no icon field, so the flag is simply the first
// characters of the name, and both favourite kinds here follow that convention.
//
// The country comes from a <pgr:country>, so it must have an entry in COUNTRIES; one that does not errors rather than
// importing without a flag.
function countryFlag(country) {
  const code = COUNTRIES[country]?.code;

  if (!code) {
    throw new Error(`no flag for "${country}" — add it to COUNTRIES`);
  }

  if (code.includes('-')) {
    const tags = [...code.replace('-', '').toLowerCase()].map((c) => String.fromCodePoint(TAG_BLOCK + c.charCodeAt(0)));
    return BLACK_FLAG + tags.join('') + String.fromCodePoint(CANCEL_TAG);
  }

  return [...code].map((c) => String.fromCodePoint(REGIONAL_INDICATOR_A + c.charCodeAt(0) - 65)).join('');
}

// A favourite's name with its country's flag in front.
function flaggedName(el) {
  return `${countryFlag(entryCountry(el))} ${entryName(el)}`;
}

function coord(el) {
  const lat = parseFloat(el.getAttribute('lat'));
  const lng = parseFloat(el.getAttribute('lon'));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`<${el.localName}> has an unparseable coordinate`);
  }

  return [lat, lng];
}

// Split one GPX file into Points and Routes by element, not by filename: a <wpt> is one coordinate (a Point), a <trk>
// is a path (a Route keeping all of its <trkpt>). A file may hold either or both. Mirrors pgsedit's parse_gpx — an
// empty <trk> is skipped (gpx.studio writes one for a cleared track) rather than treated as a route. Both kinds are
// flagged, so the two lists read alike in the app even though PGSharp shows them on separate tabs.
function parseGpxFavourites(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');

  if (doc.querySelector('parsererror')) {
    throw new Error('not valid XML');
  }

  const points = [],
    routes = [];

  for (const wpt of doc.getElementsByTagName('wpt')) {
    const [lat, lng] = coord(wpt);
    points.push({ name: flaggedName(wpt), lat, lng });
  }

  for (const trk of doc.getElementsByTagName('trk')) {
    const trkpts = trk.getElementsByTagName('trkpt');

    if (trkpts.length === 0) {
      continue;
    }

    const pts = [];

    for (const p of trkpts) {
      const [lat, lng] = coord(p);
      pts.push([lat, lng, ROUTE_POINT_FLAG]);
    }

    routes.push({ name: flaggedName(trk), points: pts, mode: ROUTE_MODE, state: newRouteState() });
  }

  return { points, routes };
}

// Build the favourite lists by re-parsing every GPX file, so the result is decided by each file's own elements and
// metadata rather than by how the map viewer happened to load them. Every file is fetched and parsed before the backup
// is touched, so a bad or nameless file aborts with a clear message instead of writing a half-built backup. The readers
// name the element at fault; the file is added here, where it is known, so a failure reads as "England/West End,
// London.gpx: <trk> has no <pgr:country>".
async function buildRepoFavourites() {
  // Read the list again rather than reuse what the map loaded, so a backup is built from every file the repository has,
  // not only the ones that drew.
  let files;

  try {
    files = await loadManifest();
  } catch (e) {
    throw new Error(`gpx.json: ${e.message}`, { cause: e });
  }

  const texts = await Promise.all(
    files.map(async (file) => {
      const res = await fetch(encodeURI(file));

      if (!res.ok) {
        throw new Error(`${file}: ${res.status} ${res.statusText}`);
      }

      return [file, await res.text()];
    }),
  );
  const points = [],
    routes = [];

  for (const [file, text] of texts) {
    let parsed;

    try {
      parsed = parseGpxFavourites(text);
    } catch (e) {
      throw new Error(`${file}: ${e.message}`, { cause: e });
    }

    points.push(...parsed.points);
    routes.push(...parsed.routes);
  }

  return { points, routes };
}

// Fill in each Point's IANA timezone from its coordinates, mirroring pgsedit's apply_timezones. The name is a property
// of a boundary polygon rather than anything a formula can derive from a coordinate — Melbourne and Sydney share a UTC
// offset but not a zone name, and Missouri is America/Chicago, not America/New_York — so it comes from the boundary
// data tz-lookup carries. Routes have no tz field, so nothing is looked up for them. A point whose zone cannot be found
// is left without one, which is how a missing script or an unlocatable coordinate looks; the count is returned so the
// caller can say so once rather than per point. PGSharp accepts entries with no tz.
function applyTimezones(points) {
  let unknown = 0;

  for (const p of points) {
    let tz = null;

    if (typeof tzlookup === 'function') {
      try {
        tz = tzlookup(p.lat, p.lng);
      } catch {
        tz = null;
      }
    }

    if (tz) {
      p.tz = tz;
    } else {
      unknown++;
    }
  }

  return unknown;
}

// Names must be unique within a kind (PGSharp lists and deletes by name), so drop any repeated name, keeping the first.
function dedupeByName(entries) {
  const seen = new Set();
  const out = [];
  let dropped = 0;

  for (const e of entries) {
    if (seen.has(e.name)) {
      dropped++;
      continue;
    }

    seen.add(e.name);
    out.push(e);
  }

  return { out, dropped };
}

// Order favourites the way pgsedit's `reorder` does: fold accents (decompose with NFKD, then drop the combining marks)
// and case, so "São Paulo" files under S rather than after every ASCII name. A tie on the folded key falls back to the
// exact spelling, so names differing only by accent still order deterministically. Each kind is sorted within itself,
// as PGSharp lists them separately. A favourite's leading flag is decoration rather than part of how the list reads, so
// it is folded out too — otherwise every place would sort by its country's regional-indicator code instead of by name.
const sortKey = (name) =>
  (name || '')
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();

function byName(a, b) {
  const ka = sortKey(a.name),
    kb = sortKey(b.name);

  if (ka !== kb) {
    return ka < kb ? -1 : 1;
  }

  if (a.name !== b.name) {
    return a.name < b.name ? -1 : 1;
  }

  return 0;
}

const backupRunEl = document.getElementById('backupRun');
const backupStatusEl = document.getElementById('backupStatus');

function backupStatus(msg, kind) {
  backupStatusEl.textContent = msg;
  backupStatusEl.className = 'status' + (kind ? ' ' + kind : '');
}

function downloadBytes(bytes, name) {
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Synthesize a partial PGSData.dat from scratch — a HashMap holding only the keys we set (the favourites, plus
// whichever control positions are ticked). Nothing is read from an existing backup; every other preference is omitted,
// so importing this leaves the rest of the profile as PGSharp had it.
backupRunEl.addEventListener('click', async () => {
  backupRunEl.disabled = true;
  backupStatus('Building backup…');

  try {
    const repo = await buildRepoFavourites();
    const notes = [];

    // Names must be unique within a kind (PGSharp lists and deletes by name), so drop any repeat, then alphabetise
    // within each kind like `reorder`.
    const p = dedupeByName(repo.points);
    const r = dedupeByName(repo.routes);
    const points = p.out,
      routes = r.out;

    if (p.dropped) {
      notes.push(`${p.dropped} duplicate waypoint name(s) skipped`);
    }

    if (r.dropped) {
      notes.push(`${r.dropped} duplicate route name(s) skipped`);
    }

    points.sort(byName);
    routes.sort(byName);

    const noTz = applyTimezones(points);

    if (noTz) {
      notes.push(`${noTz} waypoint(s) without a timezone`);
    }

    const root = new Map();
    root.set(POINTS_KEY, encodePoints(points));
    root.set(ROUTES_KEY, encodeRoutes(routes));

    // Include whichever controls are ticked, set to fixed values. A number is written as a Java Float; a string (the
    // radar's filter) as-is.
    let positions = 0;

    for (const { id, keys } of CONTROL_RESETS) {
      if (!document.getElementById(id).checked) {
        continue;
      }

      for (const [k, v] of Object.entries(keys)) {
        root.set(k, typeof v === 'string' ? v : JavaSer.box('F', v));
      }

      positions++;
    }

    if (positions) {
      notes.push(`${positions} control(s)`);
    }

    const outBytes = JavaSer.dumps(root);
    JavaSer.loads(outBytes); // re-parse our own output before offering it

    downloadBytes(outBytes, 'PGSData.dat');
    const detail = notes.length ? ` (${notes.join('; ')})` : '';
    backupStatus(
      `Built a partial backup — ${points.length} waypoint(s) and ${routes.length} route(s)${detail}. ` +
        'Import it into PGSharp.',
      'ok',
    );
  } catch (e) {
    backupStatus(`Failed to build backup: ${e.message}`, 'err');
  } finally {
    backupRunEl.disabled = false;
  }
});
