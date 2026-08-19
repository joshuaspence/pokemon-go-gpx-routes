import COUNTRIES from './countries.js';
import { entryCountry, extText, loadManifest, placeName } from './gpx.js';

const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/**
 * zoomSnap: 0 lets fitBounds land on a fractional zoom. Snapping to whole levels rounds down, which can leave the
 * fitted layers filling as little as half the map — a lot of dead space on a narrow phone viewport.
 */
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

/**
 * Copy text to the clipboard, falling back to `execCommand` for insecure contexts (e.g. served over plain HTTP, where
 * the async Clipboard API is unavailable). Returns a promise that resolves to true on success.
 */
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

/**
 * Flash a copy button through its outcome — "Copied" or "Failed" — then restore its label a moment later. The button is
 * optional, so a caller with none to flash still shares this path.
 */
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

/**
 * Read one file, splitting it into routes and waypoints by element rather than by where it sits: a <trk> is a path to
 * walk, a <wpt> is one place to stand, and a file may hold either or both. This is how the backup writer has always
 * read these files (see parseGpxFavourites), so the two now agree about what a file contains instead of the viewer
 * being told separately.
 *
 * Name, locality, country and variant all come from the file's own metadata; an entry missing what it needs is rejected
 * rather than guessed at, so the gap shows up in the banner instead of quietly reading back the path. The variant stays
 * optional — it is empty for a route with no short/long counterpart. The whole file text is returned once, for the copy
 * button to hand over.
 */
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

    /**
     * An emptied <trk> is what gpx.studio writes for a cleared track; skip it rather than report it, matching
     * parseGpxFavourites. A <trk> that kept a single point is a different thing — a track that cannot be drawn — and is
     * still an error.
     */
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

/**
 * Build a map popup: a bold title, a detail line, and a copy button. The copy handler is handed the button so it can
 * flash it (see flashButton). Returns the element to bind to a layer.
 */
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

/**
 * Return the active route to its resting style, drop its start/end markers and un-highlight its row. Mirrors
 * deselectCity, so selecting either kind can clear the other with a single call.
 */
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

/**
 * Render one list grouped by country. Within each country, tracks and waypoints are interleaved and sorted
 * alphabetically by name.
 */
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

  /**
   * Hide groups with no matches; while searching, auto-expand those that have matches so the results are visible. With
   * no query, collapse everything.
   */
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

/**
 * Name every file that could not be read, and why. The banner stays up: a file whose metadata is missing is a defect to
 * fix, not a transient hiccup to time out, and the map now has no way to show a placeholder for it.
 */
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

  /**
   * Nothing can be drawn without the list, and reading it is the page's first fetch — so this is also where opening the
   * page from disk lands.
   */
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
