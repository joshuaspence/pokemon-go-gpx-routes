// Route files, relative to this page. Static hosting cannot list a directory,
// so the paths live here, but nothing else is inferred from them: a route's
// name, country and variant are read from the GPX metadata (<trk><name>,
// <trk><desc> and <trk><type>), which is the source of truth. A file missing
// its <name> or <desc> is reported rather than named after its path, so the
// defect surfaces instead of being papered over. Variant is "short"/"long"
// for routes that come as a pair, and empty otherwise. When you add or remove
// a route, update this list.
const ROUTE_FILES = [
  "Australia/Kings Park, Perth, Western Australia.gpx",
  "Australia/Melbourne Zoo, Melbourne, Victoria.gpx",
  "Australia/Royal Botanic Gardens, Sydney, New South Wales (long).gpx",
  "Australia/Royal Botanic Gardens, Sydney, New South Wales (short).gpx",
  "Austria/Stadtpark, Vienna.gpx",
  "Brazil/Ibirapuera Park, São Paulo (long).gpx",
  "Brazil/Ibirapuera Park, São Paulo (short).gpx",
  "Canada/Assiniboine Park Zoo, Winnipeg, Manitoba.gpx",
  "Canada/Jardin Botanique, Montreal, Quebec.gpx",
  "Denmark/Fisketorvet, Copenhagen.gpx",
  "England/Chester Zoo, Chester, Cheshire.gpx",
  "England/City of London, London.gpx",
  "England/West End, London.gpx",
  "France/Pere Lachaise Cemetery, Paris.gpx",
  "Germany/City Centre, Dortmund, North Rhine-Westphalia.gpx",
  "Germany/Friedrichsau, Ulm, Baden-Württemberg.gpx",
  "Germany/Schlossgarten, Schwetzingen, Baden-Württemberg.gpx",
  "Germany/Westfalenpark, Dortmund, North Rhine-Westphalia (long).gpx",
  "Germany/Westfalenpark, Dortmund, North Rhine-Westphalia (short).gpx",
  "Germany/Westpark, Munich, Bavaria.gpx",
  "Hungary/Margaret Island, Budapest.gpx",
  "Japan/Hibiya Park, Tokyo.gpx",
  "Japan/Igashira Park, Moka, Tochigi.gpx",
  "Japan/Morioka Castle Ruins Park, Morioka, Iwate.gpx",
  "Japan/Nagai Park, Osaka.gpx",
  "Japan/Ueno Park, Tokyo.gpx",
  "New Zealand/Ashburton Domain, Ashburton, Canterbury.gpx",
  "New Zealand/Botanic Garden, Wellington.gpx",
  "Singapore/Fort Canning Park, Singapore.gpx",
  "South Korea/Starfield COEX Mall, Seoul.gpx",
  "Spain/Parque San Pablo, Zaragoza, Aragon.gpx",
  "Spain/Parque de María Luisa, Seville, Andalusia.gpx",
  "United Arab Emirates/The Walk, Dubai.gpx",
  "United States/Centennial Park, Ellicott City, Maryland.gpx",
  "United States/Central Park, New York City, New York.gpx",
  "United States/Golden Gate Bridge, San Francisco, California.gpx",
  "United States/Honolulu Downtown, Honolulu, Hawaii.gpx",
  "United States/LA Zoo, Los Angeles, California.gpx",
  "United States/Lebanon Hills, Eagan, Minnesota.gpx",
  "United States/Memorial Park, Houston, Texas.gpx",
  "United States/Navy Pier, Chicago, Illinois.gpx",
  "United States/Pier 39, San Francisco, California.gpx",
  "United States/River Park, New York City, New York.gpx",
  "United States/Slater Memorial Park, Pawtucket, Rhode Island.gpx",
];

const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

const map = L.map("map", { worldCopyJump: true }).setView([20, 0], 2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const listEl = document.getElementById("list");
const countEl = document.getElementById("count");
const filterEl = document.getElementById("filter");
const bannerEl = document.getElementById("banner");
const toastEl = document.getElementById("toast");

const store = []; // { name, country, variant, file, gpx, latlngs, line, el, markers, distance }
const cityStore = []; // { city, country, coords:[lat,lon], coordStr, marker, el }
let active = null;
let activeCity = null;
let toastTimer = null;

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

// Copy text to the clipboard, falling back to execCommand for insecure
// contexts (e.g. served over plain http, where the async Clipboard API is
// unavailable). Returns a promise that resolves to true on success.
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* fall through to legacy path */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}

async function copyRoute(entry, btn) {
  const ok = await copyText(entry.gpx);
  if (btn) {
    const original = btn.textContent;
    btn.textContent = ok ? "Copied" : "Failed";
    btn.classList.add("done");
    setTimeout(() => { btn.textContent = original; btn.classList.remove("done"); }, 1400);
  }
  toast(ok ? `Copied “${entry.name}” GPX to clipboard` : "Copy failed");
}

function haversine(a, b) {
  const R = 6371000, toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(b[0] - a[0]), dLon = toRad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function routeDistance(latlngs) {
  let d = 0;
  for (let i = 1; i < latlngs.length; i++) d += haversine(latlngs[i - 1], latlngs[i]);
  return d;
}
function fmtDist(m) {
  return m >= 1000 ? (m / 1000).toFixed(2) + " km" : Math.round(m) + " m";
}

// The trimmed text of the first element matching `selector`, or "".
const metaText = (root, selector) => {
  const el = root.querySelector(selector);
  return el ? el.textContent.trim() : "";
};

// Read one route. The name and country must come from the file's own
// <trk><name>/<desc>; a file missing either is rejected rather than guessed
// at, so the gap shows up in the banner instead of quietly reading back the
// path. <type> stays optional — it is empty for a route with no short/long
// counterpart.
async function loadGpx(file) {
  const res = await fetch(encodeURI(file));
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const text = await res.text();
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("not valid XML");
  const latlngs = [];
  for (const p of doc.getElementsByTagName("trkpt")) {
    const lat = parseFloat(p.getAttribute("lat"));
    const lon = parseFloat(p.getAttribute("lon"));
    if (Number.isFinite(lat) && Number.isFinite(lon)) latlngs.push([lat, lon]);
  }
  if (latlngs.length < 2) throw new Error("has fewer than two usable <trkpt>");
  const name = metaText(doc, "trk > name");
  if (!name) throw new Error("<trk> has no <name>");
  const country = metaText(doc, "trk > desc");
  if (!country) throw new Error("<trk> has no <desc> (the country)");
  return { latlngs, text, name, country, variant: metaText(doc, "trk > type") };
}

// Waypoint files: each holds points of interest as named GPX waypoints
// (<wpt> with <name> = place and <desc> = country).
const WAYPOINT_FILES = [
  "Large Cities.gpx",
  "Pokestop Clusters.gpx",
  "Popular Spoofing Spots.gpx",
  "Remote Locations.gpx",
];

// Continent for each country, used to group the sidebar. Unlisted countries
// fall back to "Other".
const CONTINENTS = {
  "Canary Islands": "Africa",
  "Antarctica": "Antarctica",
  "India": "Asia", "Japan": "Asia", "North Korea": "Asia", "Singapore": "Asia",
  "South Korea": "Asia", "Taiwan": "Asia", "United Arab Emirates": "Asia",
  "Austria": "Europe", "Belgium": "Europe", "Czechia": "Europe", "Denmark": "Europe",
  "England": "Europe", "France": "Europe", "Germany": "Europe", "Hungary": "Europe",
  "Ireland": "Europe", "Italy": "Europe", "Netherlands": "Europe", "Norway": "Europe",
  "Portugal": "Europe", "Romania": "Europe", "Russia": "Europe", "Spain": "Europe",
  "Canada": "North America", "Mexico": "North America", "United States": "North America",
  "Australia": "Oceania", "New Zealand": "Oceania",
  "Argentina": "South America", "Brazil": "South America", "Ecuador": "South America",
  "Peru": "South America",
};

// Read one waypoint file. Returns [{country, city, coords, coordStr}];
// coordStr preserves the file's exact lat/lon text for copying. As with
// routes, every <wpt> must carry its own <name> and <desc> — a nameless or
// countryless point is an error, not something to label with its
// coordinates or file under "Other".
async function loadWaypoints(file) {
  const res = await fetch(encodeURI(file));
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const doc = new DOMParser().parseFromString(await res.text(), "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("not valid XML");
  const cities = [];
  for (const w of doc.getElementsByTagName("wpt")) {
    const latStr = w.getAttribute("lat"), lonStr = w.getAttribute("lon");
    const lat = parseFloat(latStr), lon = parseFloat(lonStr);
    // Direct children only, so a <link><text> or similar can never stand in
    // for the point's own name.
    const city = metaText(w, ":scope > name");
    if (!Number.isFinite(lat) || !Number.isFinite(lon))
      throw new Error(`<wpt> "${city || "(unnamed)"}" has an unparseable coordinate`);
    if (!city) throw new Error(`<wpt> at ${latStr},${lonStr} has no <name>`);
    const country = metaText(w, ":scope > desc");
    if (!country) throw new Error(`<wpt> "${city}" has no <desc> (the country)`);
    cities.push({ country, city, coords: [lat, lon], coordStr: `${latStr},${lonStr}` });
  }
  return cities;
}

function clearMarkers(entry) {
  if (entry.markers) { entry.markers.forEach((m) => map.removeLayer(m)); entry.markers = null; }
}

function selectRoute(entry, { pan = true } = {}) {
  deselectCity();
  if (active && active !== entry) {
    active.line.setStyle({ color: cssVar("--track"), weight: 2, opacity: 0.55 });
    active.line.bringToBack();
    clearMarkers(active);
    active.el.classList.remove("active");
  }
  active = entry;
  entry.el.classList.add("active");
  entry.line.setStyle({ color: cssVar("--accent"), weight: 4, opacity: 1 });
  entry.line.bringToFront();

  clearMarkers(entry);
  const a = entry.latlngs[0], b = entry.latlngs[entry.latlngs.length - 1];
  const dot = (color) => L.circleMarker(a, {
    radius: 6, color: "#fff", weight: 2, fillColor: color, fillOpacity: 1,
  });
  const start = L.circleMarker(a, { radius: 6, color: "#fff", weight: 2, fillColor: cssVar("--start"), fillOpacity: 1 }).bindTooltip("Start");
  const end = L.circleMarker(b, { radius: 6, color: "#fff", weight: 2, fillColor: cssVar("--end"), fillOpacity: 1 }).bindTooltip("End");
  entry.markers = [start.addTo(map), end.addTo(map)];

  const popup = document.createElement("div");
  const title = document.createElement("b");
  title.textContent = entry.name;
  const info = document.createElement("div");
  info.textContent = `${entry.country} · ${entry.latlngs.length} points · ${fmtDist(entry.distance)}`;
  const pCopy = document.createElement("button");
  pCopy.className = "popup-copy";
  pCopy.type = "button";
  pCopy.textContent = "Copy GPX";
  pCopy.addEventListener("click", () => copyRoute(entry, pCopy));
  popup.append(title, info, pCopy);
  entry.line.bindPopup(popup);
  if (pan) {
    map.fitBounds(entry.line.getBounds(), { padding: [40, 40], maxZoom: 17 });
    entry.line.openPopup();
  }
  entry.el.closest(".country-group")?.classList.remove("collapsed");
  entry.el.closest(".continent-group")?.classList.remove("collapsed");
  entry.el.scrollIntoView({ block: "nearest" });
}

function deselectCity() {
  if (!activeCity) return;
  activeCity.marker.setStyle({ radius: 5, fillColor: cssVar("--city") });
  activeCity.el.classList.remove("active");
  activeCity = null;
}

function selectCity(c, { pan = true } = {}) {
  // Clear any active route selection so only one thing is highlighted.
  if (active) {
    active.line.setStyle({ color: cssVar("--track"), weight: 2, opacity: 0.55 });
    active.line.bringToBack();
    clearMarkers(active);
    active.el.classList.remove("active");
    active = null;
  }
  deselectCity();
  activeCity = c;
  c.el.classList.add("active");
  c.marker.setStyle({ radius: 8, fillColor: cssVar("--accent") });
  c.marker.bringToFront();

  const popup = document.createElement("div");
  const title = document.createElement("b");
  title.textContent = c.city;
  const info = document.createElement("div");
  info.textContent = `${c.country} · ${c.coordStr}`;
  const btn = document.createElement("button");
  btn.className = "popup-copy";
  btn.type = "button";
  btn.textContent = "Copy coordinates";
  btn.addEventListener("click", () => copyCoords(c, btn));
  popup.append(title, info, btn);
  c.marker.bindPopup(popup);

  if (pan) {
    map.setView(c.coords, Math.max(map.getZoom(), 12));
    c.marker.openPopup();
  }
  c.el.closest(".country-group")?.classList.remove("collapsed");
  c.el.closest(".continent-group")?.classList.remove("collapsed");
  c.el.scrollIntoView({ block: "nearest" });
}

async function copyCoords(c, btn) {
  const ok = await copyText(c.coordStr);
  if (btn) {
    const original = btn.textContent;
    btn.textContent = ok ? "Copied" : "Failed";
    btn.classList.add("done");
    setTimeout(() => { btn.textContent = original; btn.classList.remove("done"); }, 1400);
  }
  toast(ok ? `Copied ${c.city} coordinates to clipboard` : "Copy failed");
}

function buildRouteRow(entry) {
  const el = document.createElement("div");
  el.className = "route";
  el.dataset.country = entry.country;
  el.dataset.name = entry.name.toLowerCase();
  const label = document.createElement("span");
  label.textContent = entry.name;
  const end = document.createElement("span");
  end.className = "end";
  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = fmtDist(entry.distance);
  const copyBtn = document.createElement("button");
  copyBtn.className = "copy";
  copyBtn.type = "button";
  copyBtn.textContent = "Copy";
  copyBtn.title = "Copy GPX file contents to clipboard";
  copyBtn.addEventListener("click", (e) => { e.stopPropagation(); copyRoute(entry, copyBtn); });
  end.append(meta, copyBtn);
  el.append(label, end);
  el.addEventListener("click", () => selectRoute(entry));
  entry.el = el;
  return el;
}

function buildCityRow(c, country) {
  const el = document.createElement("div");
  el.className = "route city";
  el.dataset.country = country;
  el.dataset.name = c.city.toLowerCase();
  const label = document.createElement("span");
  label.textContent = c.city;
  const end = document.createElement("span");
  end.className = "end";
  const copyBtn = document.createElement("button");
  copyBtn.className = "copy";
  copyBtn.type = "button";
  copyBtn.textContent = "Copy";
  copyBtn.title = "Copy coordinates to clipboard";
  copyBtn.addEventListener("click", (e) => { e.stopPropagation(); copyCoords(c, copyBtn); });
  end.append(copyBtn);
  el.append(label, end);
  el.addEventListener("click", () => selectCity(c));
  c.el = el;
  return el;
}

// Render one list grouped by country. Within each country, tracks and
// waypoints are interleaved and sorted alphabetically by name.
function buildSidebar() {
  countEl.textContent = cityStore.length
    ? `${store.length} tracks \u00b7 ${cityStore.length} waypoints`
    : `${store.length} tracks across ${new Set(store.map((s) => s.country)).size} countries`;

  const byCountry = {};
  for (const s of store) {
    (byCountry[s.country] ||= []).push({ name: s.name, dist: s.distance, build: () => buildRouteRow(s) });
  }
  for (const c of cityStore) {
    (byCountry[c.country] ||= []).push({ name: c.city, dist: 0, build: () => buildCityRow(c, c.country) });
  }

  const byContinent = {};
  for (const country of Object.keys(byCountry)) {
    (byContinent[CONTINENTS[country] || "Other"] ||= []).push(country);
  }

  for (const continent of Object.keys(byContinent).sort()) {
    const cg = document.createElement("div");
    cg.className = "continent-group collapsed";
    const chead = document.createElement("div");
    chead.className = "continent";
    const cchev = document.createElement("span");
    cchev.className = "chev";
    cchev.textContent = "▾";
    const clabel = document.createElement("span");
    clabel.textContent = continent;
    chead.append(cchev, clabel);
    chead.addEventListener("click", () => cg.classList.toggle("collapsed"));
    cg.appendChild(chead);
    const citems = document.createElement("div");
    citems.className = "continent-items";

    for (const country of byContinent[continent].sort()) {
      const group = document.createElement("div");
      group.className = "country-group collapsed";
      const head = document.createElement("div");
      head.className = "country";
      head.dataset.country = country;
      const chev = document.createElement("span");
      chev.className = "chev";
      chev.textContent = "▾";
      const label = document.createElement("span");
      label.textContent = country;
      head.append(chev, label);
      head.addEventListener("click", () => group.classList.toggle("collapsed"));
      group.appendChild(head);
      const items = document.createElement("div");
      items.className = "country-items";
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

filterEl.addEventListener("input", () => {
  const q = filterEl.value.trim().toLowerCase();
  document.querySelectorAll(".route").forEach((el) => {
    const hit = !q || el.dataset.name.includes(q) || el.dataset.country.toLowerCase().includes(q);
    el.classList.toggle("hidden", !hit);
  });
  // Hide groups with no matches; while searching, auto-expand those that have
  // matches so the results are visible. With no query, collapse everything.
  document.querySelectorAll(".country-group").forEach((group) => {
    const anyVisible = [...group.querySelectorAll(".route")].some((r) => !r.classList.contains("hidden"));
    group.classList.toggle("hidden", !anyVisible);
    group.classList.toggle("collapsed", q ? !anyVisible : true);
  });
  document.querySelectorAll(".continent-group").forEach((cg) => {
    const anyVisible = [...cg.querySelectorAll(".country-group")].some((g) => !g.classList.contains("hidden"));
    cg.classList.toggle("hidden", !anyVisible);
    cg.classList.toggle("collapsed", q ? !anyVisible : true);
  });
});

function showBanner(html) { bannerEl.innerHTML = html; bannerEl.style.display = "block"; }

// Name every file that could not be read, and why. The banner stays up: a
// file whose metadata is missing is a defect to fix, not a transient hiccup
// to time out, and the map now has no way to show a placeholder for it.
function appendRejected(rejected) {
  const head = document.createElement("b");
  head.textContent = `${rejected.length} file(s) rejected — fix the GPX metadata:`;
  const list = document.createElement("ul");
  for (const { file, reason } of rejected) {
    console.error(`${file}: ${reason}`);
    const item = document.createElement("li");
    const path = document.createElement("code");
    path.textContent = file;
    item.append(path, document.createTextNode(` — ${reason}`));
    list.appendChild(item);
  }
  bannerEl.append(head, list);
  bannerEl.style.display = "block";
}

async function init() {
  const rejected = [];
  const note = (file, e) => rejected.push({ file, reason: e.message });

  const results = await Promise.allSettled(ROUTE_FILES.map((file) => loadGpx(file)));
  results.forEach((res, i) => {
    const file = ROUTE_FILES[i];
    if (res.status === "rejected") { note(file, res.reason); return; }
    const { latlngs, text, name, country, variant } = res.value;
    const line = L.polyline(latlngs, {
      color: cssVar("--track"), weight: 2, opacity: 0.55,
    }).addTo(map);
    const entry = {
      name, country, variant, file, gpx: text,
      latlngs, line, markers: null, distance: routeDistance(latlngs),
    };
    line.on("click", () => selectRoute(entry, { pan: false }));
    store.push(entry);
  });

  // One bad waypoint file does not hide the others, but it is still reported.
  const wpts = await Promise.allSettled(WAYPOINT_FILES.map((file) => loadWaypoints(file)));
  wpts.forEach((res, i) => {
    if (res.status === "rejected") { note(WAYPOINT_FILES[i], res.reason); return; }
    for (const c of res.value) {
      const marker = L.circleMarker(c.coords, {
        radius: 5, color: "#fff", weight: 2,
        fillColor: cssVar("--city"), fillOpacity: 1,
      }).addTo(map);
      marker.bindTooltip(c.city);
      const entry = { ...c, marker };
      marker.on("click", () => selectCity(entry, { pan: false }));
      cityStore.push(entry);
    }
  });

  buildSidebar();

  if (store.length === 0) {
    showBanner(
      "<b>No tracks could be loaded.</b><br>" +
      "This page reads the <code>.gpx</code> files over HTTP, so it needs to be " +
      "served rather than opened directly from disk. Try:<br>" +
      "<code>python3 -m http.server</code> then open " +
      "<code>http://localhost:8000/</code> — or view it via GitHub Pages."
    );
    if (rejected.length) appendRejected(rejected);
    return;
  }
  if (rejected.length) appendRejected(rejected);

  const all = L.featureGroup([
    ...store.map((s) => s.line),
    ...cityStore.map((c) => c.marker),
  ]);
  map.fitBounds(all.getBounds(), { padding: [30, 30] });
}

init();

// ------------------------------------------------------------------
// PGSharp backup editing, ported from the pgsedit tool.
//
// PGSData.dat is a serialized java.util.HashMap<String,Object> whose two
// favourite keys hold JSON: "hlfavor" is Points (one coordinate each, from
// <wpt>) and "hlfavorRoute" is Routes (a whole path, from <trk>). To write
// those keys back we have to read and faithfully re-emit the whole Java
// serialization stream — handles are positional, so the tool re-emits the
// stream from scratch rather than patching bytes. See the pgsedit README
// for the format details this mirrors.
// ------------------------------------------------------------------
const JavaSer = (() => {
  // ObjectStreamConstants.
  const STREAM_MAGIC = 0xACED, STREAM_VERSION = 5;
  const TC_NULL = 0x70, TC_REFERENCE = 0x71, TC_CLASSDESC = 0x72,
        TC_OBJECT = 0x73, TC_STRING = 0x74, TC_ENDBLOCKDATA = 0x78,
        TC_BLOCKDATA = 0x77, TC_BLOCKDATALONG = 0x7A, TC_LONGSTRING = 0x7C;
  const BASE_HANDLE = 0x7E0000;
  const SC_WRITE_METHOD = 0x01, SC_SERIALIZABLE = 0x02;

  // Boxed primitives, keyed by JVM field-type code. The value carried is a
  // Number for I/F, a BigInt for J (a 64-bit long won't fit a JS number and
  // must round-trip exactly — PGSharp hides doubles inside longs), and a
  // boolean for Z.
  const BOX = {
    I: { cls: "java.lang.Integer", uid: 0x12E2A0A4F7818738n },
    J: { cls: "java.lang.Long",    uid: 0x3B8BE490CC8F23DFn },
    F: { cls: "java.lang.Float",   uid: 0xDAEDC9A2DB3CF0ECn },
    Z: { cls: "java.lang.Boolean", uid: 0xCD207280D59CFAEEn },
  };
  const BOX_BY_CLASS = {
    "java.lang.Integer": "I", "java.lang.Long": "J",
    "java.lang.Float": "F", "java.lang.Boolean": "Z",
  };
  const NUMBER = { name: "java.lang.Number", uid: 0x86AC951D0B94E08Bn };
  const HASHMAP_UID = 0x0507DAC1C31660D1n;

  const err = (m) => new Error(m);

  // Java's "modified UTF-8": U+0000 is C0 80 and non-BMP characters are
  // written as their two UTF-16 surrogates (3 bytes each), so we iterate
  // UTF-16 code units rather than code points.
  function encodeMutf8(s) {
    const out = [];
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (c === 0) out.push(0xC0, 0x80);
      else if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
      else out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
    }
    return out;
  }
  function decodeMutf8(bytes) {
    let s = "", i = 0;
    const n = bytes.length;
    while (i < n) {
      const c = bytes[i];
      if (c < 0x80) { s += String.fromCharCode(c); i += 1; }
      else if ((c & 0xE0) === 0xC0) {
        if (i + 1 >= n) throw err("truncated modified UTF-8 sequence");
        s += String.fromCharCode(((c & 0x1F) << 6) | (bytes[i + 1] & 0x3F));
        i += 2;
      } else if ((c & 0xF0) === 0xE0) {
        if (i + 2 >= n) throw err("truncated modified UTF-8 sequence");
        s += String.fromCharCode(
          ((c & 0x0F) << 12) | ((bytes[i + 1] & 0x3F) << 6) | (bytes[i + 2] & 0x3F));
        i += 3;
      } else throw err(`invalid modified UTF-8 byte 0x${c.toString(16)}`);
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
    u1() { if (this.p >= this.b.length) throw err("truncated stream"); return this.b[this.p++]; }
    u2() { const v = this.dv.getUint16(this.p); this.p += 2; return v; }
    i4() { const v = this.dv.getInt32(this.p); this.p += 4; return v; }
    i8() { const v = this.dv.getBigInt64(this.p); this.p += 8; return v; }
    f4() { const v = this.dv.getFloat32(this.p); this.p += 4; return v; }
    f8() { const v = this.dv.getFloat64(this.p); this.p += 8; return v; }
    raw(n) {
      const v = this.b.subarray(this.p, this.p + n);
      if (v.length !== n) throw err("truncated stream");
      this.p += n; return v;
    }
    peek() { return this.b[this.p]; }
    newHandle(obj) { this.handles.push(obj); return obj; }
    // The JVM assigns an object's handle before its fields are read, so a
    // self-referential object can cite itself; reserve the slot, back-patch it.
    claimHandle() { this.handles.push(null); return this.handles.length - 1; }
    resolveHandle(slot, obj) { this.handles[slot] = obj; return obj; }
    ref() {
      const h = this.i4() - BASE_HANDLE;
      if (h < 0 || h >= this.handles.length) throw err(`bad handle reference ${h}`);
      return this.handles[h];
    }
    utf() { return decodeMutf8(this.raw(this.u2())); }
    longUtf() { return decodeMutf8(this.raw(Number(this.i8()))); }

    classDesc() {
      const tag = this.u1();
      if (tag === TC_NULL) return null;
      if (tag === TC_REFERENCE) return this.ref();
      if (tag !== TC_CLASSDESC) throw err(`expected classdesc, got 0x${tag.toString(16)} at ${this.p - 1}`);
      const name = this.utf();
      const uid = this.i8();
      const flags = this.u1();
      const desc = this.newHandle({ name, uid, flags, fields: [] });
      const nfields = this.u2();
      for (let i = 0; i < nfields; i++) {
        const tcode = String.fromCharCode(this.u1());
        const fname = this.utf();
        if (tcode === "L" || tcode === "[") this.content(); // field type string; unused
        desc.fields.push([tcode, fname]);
      }
      this.skipAnnotation();
      desc.super = this.classDesc();
      return desc;
    }
    skipAnnotation() {
      for (;;) {
        if (this.peek() === TC_ENDBLOCKDATA) { this.p += 1; return; }
        this.content();
      }
    }
    readPrimitive(tcode) {
      switch (tcode) {
        case "I": return this.i4();
        case "J": return this.i8();
        case "F": return this.f4();
        case "D": return this.f8();
        case "Z": return this.u1() !== 0;
        case "B": return this.u1();
        case "S": { const v = this.dv.getInt16(this.p); this.p += 2; return v; }
        case "C": { const v = this.dv.getUint16(this.p); this.p += 2; return String.fromCharCode(v); }
        default: throw err(`unsupported field type '${tcode}'`);
      }
    }
    content() {
      const tag = this.u1();
      if (tag === TC_NULL) return null;
      if (tag === TC_REFERENCE) return this.ref();
      if (tag === TC_STRING) return this.newHandle(this.utf());
      if (tag === TC_LONGSTRING) return this.newHandle(this.longUtf());
      if (tag === TC_BLOCKDATA) return { blockdata: this.raw(this.u1()) };
      if (tag === TC_BLOCKDATALONG) return { blockdata: this.raw(this.i4()) };
      if (tag === TC_OBJECT) return this.object();
      throw err(`unsupported tag 0x${tag.toString(16)} at offset ${this.p - 1}`);
    }
    object() {
      const desc = this.classDesc();
      const slot = this.claimHandle();
      const chain = [];
      for (let d = desc; d; d = d.super) chain.push(d);
      chain.reverse(); // superclass fields come first
      for (const d of chain) {
        for (const [tcode, fname] of d.fields) {
          d.values ||= {};
          // We only need HashMap's writeObject payload; a field's value is
          // read to advance the stream but not otherwise used here.
          d.values[fname] = (tcode === "L" || tcode === "[") ? this.content() : this.readPrimitive(tcode);
        }
        if (d.flags & SC_WRITE_METHOD) d.custom = this.customData(d.name);
      }
      const name = desc.name;
      if (name in BOX_BY_CLASS) {
        const t = BOX_BY_CLASS[name];
        return this.resolveHandle(slot, { box: t, value: chain[chain.length - 1].values.value });
      }
      if (name === "java.util.HashMap") {
        let entries = null;
        for (const d of chain) if (d.custom !== undefined) entries = d.custom;
        return this.resolveHandle(slot, entries);
      }
      throw err(`unsupported class ${name}`);
    }
    customData(className) {
      if (className !== "java.util.HashMap") throw err(`no custom-data handler for ${className}`);
      if (this.u1() !== TC_BLOCKDATA) throw err("expected HashMap block data");
      const payload = this.raw(this.u1());
      const pdv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
      const size = pdv.getInt32(4); // [capacity, size]; capacity is recomputed on write
      const m = new Map();
      for (let i = 0; i < size; i++) {
        const k = this.content();
        m.set(k, this.content());
      }
      if (this.u1() !== TC_ENDBLOCKDATA) throw err("expected TC_ENDBLOCKDATA after HashMap");
      return m;
    }
  }

  function loads(bytes) {
    const r = new Reader(bytes);
    if (r.u2() !== STREAM_MAGIC || r.u2() !== STREAM_VERSION)
      throw err("not a Java serialization stream (bad magic/version)");
    const root = r.content();
    if (r.p !== bytes.length) throw err(`${bytes.length - r.p} trailing bytes after root object`);
    return root;
  }

  class Writer {
    constructor() {
      this.out = [];
      this.strHandles = new Map();   // value-keyed; a repeat becomes a back-reference
      this.boxHandles = new Map();   // identity-keyed
      this.classHandles = new Map(); // name-keyed
      this.next = 0;
    }
    claim() { return this.next++; }
    push(arr) { for (let i = 0; i < arr.length; i++) this.out.push(arr[i]); }
    u1(v) { this.out.push(v & 0xFF); }
    u2(v) { this.out.push((v >> 8) & 0xFF, v & 0xFF); }
    i4(v) { this.out.push((v >>> 24) & 0xFF, (v >>> 16) & 0xFF, (v >>> 8) & 0xFF, v & 0xFF); }
    i8(v) {
      let x = BigInt.asUintN(64, BigInt(v));
      const bytes = new Array(8);
      for (let i = 7; i >= 0; i--) { bytes[i] = Number(x & 0xFFn); x >>= 8n; }
      this.push(bytes);
    }
    f4(v) { const b = new Uint8Array(4); new DataView(b.buffer).setFloat32(0, v, false); this.push(b); }
    utf(s) {
      const b = encodeMutf8(s);
      if (b.length > 0xFFFF) throw err("string too long for TC_STRING");
      this.u2(b.length); this.push(b);
    }
    ref(h) { this.u1(TC_REFERENCE); this.i4(BASE_HANDLE + h); }
    string(s) {
      const h = this.strHandles.get(s);
      if (h !== undefined) return this.ref(h);
      const b = encodeMutf8(s);
      if (b.length <= 0xFFFF) { this.u1(TC_STRING); this.u2(b.length); }
      else { this.u1(TC_LONGSTRING); this.i8(BigInt(b.length)); }
      this.push(b);
      this.strHandles.set(s, this.claim());
    }
    classDesc(name, uid, flags, fields, superName, superUid) {
      const h = this.classHandles.get(name);
      if (h !== undefined) return this.ref(h);
      this.u1(TC_CLASSDESC);
      this.utf(name);
      this.i8(uid);
      this.u1(flags);
      this.u2(fields.length);
      for (const [tc, fn] of fields) { this.u1(tc.charCodeAt(0)); this.utf(fn); }
      this.u1(TC_ENDBLOCKDATA); // empty classAnnotation
      this.classHandles.set(name, this.claim());
      if (superName == null) this.u1(TC_NULL);
      else this.classDesc(superName, superUid, SC_SERIALIZABLE, []);
    }
    box(b) {
      const info = BOX[b.box];
      this.u1(TC_OBJECT);
      if (b.box === "Z")
        this.classDesc(info.cls, info.uid, SC_SERIALIZABLE, [["Z", "value"]]);
      else
        this.classDesc(info.cls, info.uid, SC_SERIALIZABLE, [[b.box, "value"]], NUMBER.name, NUMBER.uid);
      this.boxHandles.set(b, this.claim());
      if (b.box === "Z") this.u1(b.value ? 1 : 0);
      else if (b.box === "I") this.i4(b.value);
      else if (b.box === "J") this.i8(b.value);
      else if (b.box === "F") this.f4(b.value);
    }
    value(v) {
      if (v === null || v === undefined) this.u1(TC_NULL);
      else if (typeof v === "string") this.string(v);
      else if (v.box) { const h = this.boxHandles.get(v); h !== undefined ? this.ref(h) : this.box(v); }
      else if (v instanceof Map) this.hashmap(v);
      else throw err(`cannot serialize ${typeof v}`);
    }
    hashmap(m) {
      this.u1(TC_OBJECT);
      this.classDesc("java.util.HashMap", HASHMAP_UID, SC_WRITE_METHOD | SC_SERIALIZABLE,
        [["F", "loadFactor"], ["I", "threshold"]]);
      this.claim(); // the map's own handle
      const loadFactor = 0.75;
      const capacity = tableSizeFor(m.size, loadFactor);
      this.f4(loadFactor);
      this.i4(Math.trunc(capacity * loadFactor));
      this.u1(TC_BLOCKDATA); this.u1(8);
      this.i4(capacity); this.i4(m.size);
      for (const [k, val] of m) { this.value(k); this.value(val); }
      this.u1(TC_ENDBLOCKDATA);
    }
  }

  // Mirror HashMap's power-of-two capacity growth for a given entry count.
  function tableSizeFor(size, loadFactor) {
    let capacity = 16;
    while (size > capacity * loadFactor) capacity <<= 1;
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

// ------------------------------------------------------------------
// GPX -> favourites, mirroring pgsedit's parse_gpx / entry_name.
// ------------------------------------------------------------------
const POINTS_KEY = "hlfavor";
const ROUTES_KEY = "hlfavorRoute";
// Third element of every stored route point, and the neutral playback state
// of a route that has not been walked — both copied from PGSharp's own output.
const ROUTE_POINT_FLAG = 65536;
const ROUTE_MODE = 2;
const newRouteState = () => ({
  direction: 1, nextNodePos: 0, preNodePos: -1, loopcount: 0, lat: 0, lng: 0,
});

// Gson's JSON spelling: no spaces, forward slashes escaped. Points escape
// non-ASCII as \uXXXX (what "hlfavor" contains); Routes write it literally
// ("São Paulo") — the two keys differ, so they don't share an encoder. A flag
// is escaped per UTF-16 code unit either way, matching hot places for Points
// and leaving the Route stream to write the surrogates as Java's modified
// UTF-8 does.
const escSlashes = (s) => s.replace(/\//g, "\\/");
const asciiEscape = (s) =>
  s.replace(/[\u0080-\uFFFF]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));

function encodePoints(entries) {
  const arr = entries.map((e) => {
    const o = { name: e.name, lat: e.lat, lng: e.lng };
    if (e.tz) o.tz = e.tz;
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

// On-screen controls, taken verbatim from a known-good backup. Each checkbox
// includes one control's keys in the synthesized backup: x/y are fixed Java
// Floats, and the radar also carries its filter config (a plain string). The
// values are not user-editable.
// The floating control and both fast-snipe buttons sit in one row along the
// bottom of the screen, so they share a Y. Dragging each into place by hand
// left them a pixel or so apart (the floating control was higher still, at
// 535.75); naming the row's Y once keeps them level.
const CONTROL_ROW_Y = 785.09375;
const SNIPE2 = { x: 916.2529296875, y: CONTROL_ROW_Y }; // fast-snipe button 2
const SCAN_CONFIG = '{"shiny":true,"minlv":1,"maxlv":36,"miniv":0,"maxiv":100,"checkAll":true,"onlyShiny":true,"name":"Nearby Radar","birds":true,"attrMode":0,"minatk":0,"maxatk":15,"mindef":0,"maxdef":15,"minsta":0,"maxsta":15,"showShinyOnly":false,"loadShiny":true,"notify":true,"stop":true,"pgp":true}';
const CONTROL_RESETS = [
  { id: "resetIcon",   keys: { iconX: 0.0, iconY: CONTROL_ROW_Y } },
  { id: "resetSnipe1", keys: { hlfastsnipex: 816.33203125, hlfastsnipey: CONTROL_ROW_Y } },
  { id: "resetSnipe2", keys: { hlfastsnipe2x: SNIPE2.x, hlfastsnipe2y: SNIPE2.y } },
  { id: "resetCdpos",  keys: { hlcdposx: 0.0, hlcdposy: 306.25 } },
  // The radar button shares fast-snipe button 2's position; hlscan is its filter.
  { id: "resetScan",   keys: { hlscanx: SNIPE2.x, hlscany: SNIPE2.y, hlscan: SCAN_CONFIG } },
];

// The text of a direct child <tag>, or null. Read from the element itself,
// not its descendants, so a gpx.studio file's <metadata><author><name> is
// never mistaken for a favourite's name.
function childText(el, tag) {
  for (const child of el.children) {
    if (child.localName === tag && child.textContent && child.textContent.trim())
      return child.textContent.trim();
  }
  return null;
}

// A favourite's name, built from an element's own <name>/<desc>/<type> as
// "<name>, <desc> (<type>)", dropping either trailing part when absent. A
// <name> is required: a nameless element is a defect in the file worth
// reporting, not something to guess a name for from the path — this mirrors
// pgsedit's entry_name.
function entryName(el, path) {
  const name = childText(el, "name");
  if (!name) throw new Error(`${path}: <${el.localName}> has no <name>`);
  const desc = childText(el, "desc");
  const type = childText(el, "type");
  const label = desc ? `${name}, ${desc}` : name;
  return type ? `${label} (${type})` : label;
}

// PGSharp's own hot places carry a country flag at the front of the name —
// "🇺🇸 Pier 39, California, USA" — in the same {name,lat,lng,tz} schema our
// waypoints use. The format has no icon field, so the flag is simply the first
// characters of the name, and both favourite kinds here follow that convention.
//
// The key is a <desc>, which is always the country, so this list has to name
// every country the GPX files use; a new one errors rather than importing
// without a flag. Codes are ISO 3166-1 alpha-2, which the emoji is derived
// from rather than pasted in, since "AU" is legible in a diff and two similar
// flags are not. England is a subdivision rather than a country, and carries
// the "GB-ENG" tag sequence Unicode gives it instead of a pair of indicators.
const COUNTRY_CODES = {
  "Antarctica": "AQ", "Argentina": "AR", "Australia": "AU", "Austria": "AT",
  "Belgium": "BE", "Brazil": "BR", "Canada": "CA", "Canary Islands": "IC",
  "Czechia": "CZ", "Denmark": "DK", "Ecuador": "EC", "England": "GB-ENG",
  "France": "FR", "Germany": "DE", "Hungary": "HU", "India": "IN",
  "Ireland": "IE", "Italy": "IT", "Japan": "JP", "Mexico": "MX",
  "Netherlands": "NL", "New Zealand": "NZ", "North Korea": "KP",
  "Norway": "NO", "Peru": "PE", "Portugal": "PT", "Romania": "RO",
  "Russia": "RU", "Singapore": "SG", "South Korea": "KR", "Spain": "ES",
  "Taiwan": "TW", "United Arab Emirates": "AE", "United States": "US",
};
// A subdivision flag is a black flag, the region and subdivision letters as
// tag characters (ASCII shifted into the tag block), then the cancel tag.
const REGIONAL_INDICATOR_A = 0x1F1E6, TAG_BLOCK = 0xE0000, CANCEL_TAG = 0xE007F;
const BLACK_FLAG = "\u{1F3F4}";

function countryFlag(country, path) {
  const code = COUNTRY_CODES[country];
  if (!code) throw new Error(`${path}: no flag for "${country}" — add it to COUNTRY_CODES`);
  if (code.includes("-")) {
    const tags = [...code.replace("-", "").toLowerCase()]
      .map((c) => String.fromCodePoint(TAG_BLOCK + c.charCodeAt(0)));
    return BLACK_FLAG + tags.join("") + String.fromCodePoint(CANCEL_TAG);
  }
  return [...code]
    .map((c) => String.fromCodePoint(REGIONAL_INDICATOR_A + c.charCodeAt(0) - 65))
    .join("");
}

// A favourite's name with its country's flag in front. The country is the
// <desc>, which entryName has already put in the label, so an element without
// one keeps a bare name rather than being flagged from somewhere else.
function flaggedName(el, path) {
  const name = entryName(el, path);
  const country = childText(el, "desc");
  return country ? `${countryFlag(country, path)} ${name}` : name;
}

function coord(el, path) {
  const lat = parseFloat(el.getAttribute("lat"));
  const lng = parseFloat(el.getAttribute("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    throw new Error(`${path}: <${el.localName}> has an unparseable coordinate`);
  return [lat, lng];
}

// Split one GPX file into Points and Routes by element, not by filename: a
// <wpt> is one coordinate (a Point), a <trk> is a path (a Route keeping all
// of its <trkpt>). A file may hold either or both. Mirrors pgsedit's
// parse_gpx — an empty <trk> is skipped (gpx.studio writes one for a cleared
// track) rather than treated as a route. Both kinds are flagged, so the two
// lists read alike in the app even though PGSharp shows them on separate tabs.
function parseGpxFavourites(text, path) {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error(`${path}: not valid XML`);
  const points = [], routes = [];
  for (const wpt of doc.getElementsByTagName("wpt")) {
    const [lat, lng] = coord(wpt, path);
    points.push({ name: flaggedName(wpt, path), lat, lng });
  }
  for (const trk of doc.getElementsByTagName("trk")) {
    const trkpts = trk.getElementsByTagName("trkpt");
    if (trkpts.length === 0) continue;
    const pts = [];
    for (const p of trkpts) { const [lat, lng] = coord(p, path); pts.push([lat, lng, ROUTE_POINT_FLAG]); }
    routes.push({ name: flaggedName(trk, path), points: pts, mode: ROUTE_MODE, state: newRouteState() });
  }
  return { points, routes };
}

// Build the favourite lists by re-parsing every GPX file, so the result is
// decided by each file's own elements and metadata rather than by how the
// map viewer happened to load them. Every file is fetched and parsed before
// the backup is touched, so a bad or nameless file aborts with a clear
// message instead of writing a half-built backup.
async function buildRepoFavourites() {
  const files = [...ROUTE_FILES, ...WAYPOINT_FILES];
  const texts = await Promise.all(files.map(async (file) => {
    const res = await fetch(encodeURI(file));
    if (!res.ok) throw new Error(`${file}: ${res.status} ${res.statusText}`);
    return [file, await res.text()];
  }));
  const points = [], routes = [];
  for (const [file, text] of texts) {
    const parsed = parseGpxFavourites(text, file);
    points.push(...parsed.points);
    routes.push(...parsed.routes);
  }
  return { points, routes };
}

// Fill in each Point's IANA timezone from its coordinates, mirroring pgsedit's
// apply_timezones. The name is a property of a boundary polygon rather than
// anything a formula can derive from a coordinate — Melbourne and Sydney share
// a UTC offset but not a zone name, and Missouri is America/Chicago, not
// America/New_York — so it comes from the boundary data tz-lookup carries.
// Routes have no tz field, so nothing is looked up for them. A point whose zone
// cannot be found is left without one, which is how a missing script or an
// unlocatable coordinate looks; the count is returned so the caller can say so
// once rather than per point. PGSharp accepts entries with no tz.
function applyTimezones(points) {
  let unknown = 0;
  for (const p of points) {
    let tz = null;
    if (typeof tzlookup === "function") {
      try { tz = tzlookup(p.lat, p.lng); } catch (e) { tz = null; }
    }
    if (tz) p.tz = tz;
    else unknown++;
  }
  return unknown;
}

// Names must be unique within a kind (PGSharp lists and deletes by name), so
// drop any repeated name, keeping the first.
function dedupeByName(entries) {
  const seen = new Set();
  const out = [];
  let dropped = 0;
  for (const e of entries) {
    if (seen.has(e.name)) { dropped++; continue; }
    seen.add(e.name);
    out.push(e);
  }
  return { out, dropped };
}

// Order favourites the way pgsedit's `reorder` does: fold accents (decompose
// with NFKD, then drop the combining marks) and case, so "São Paulo" files
// under S rather than after every ASCII name. A tie on the folded key falls
// back to the exact spelling, so names differing only by accent still order
// deterministically. Each kind is sorted within itself, as PGSharp lists them
// separately. A favourite's leading flag is decoration rather than part of how
// the list reads, so it is folded out too — otherwise every place would sort by
// its country's regional-indicator code instead of by name.
const sortKey = (name) =>
  (name || "").replace(/^[^\p{L}\p{N}]+/u, "").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
function byName(a, b) {
  const ka = sortKey(a.name), kb = sortKey(b.name);
  if (ka !== kb) return ka < kb ? -1 : 1;
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  return 0;
}

const backupRunEl = document.getElementById("backupRun");
const backupStatusEl = document.getElementById("backupStatus");

function backupStatus(msg, kind) {
  backupStatusEl.textContent = msg;
  backupStatusEl.className = "status" + (kind ? " " + kind : "");
}

function downloadBytes(bytes, name) {
  const blob = new Blob([bytes], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Synthesize a partial PGSData.dat from scratch — a HashMap holding only the
// keys we set (the favourites, plus whichever control positions are ticked).
// Nothing is read from an existing backup; every other preference is omitted,
// so importing this leaves the rest of the profile as PGSharp had it.
backupRunEl.addEventListener("click", async () => {
  backupRunEl.disabled = true;
  backupStatus("Building backup…");
  try {
    const repo = await buildRepoFavourites();
    const notes = [];

    // Names must be unique within a kind (PGSharp lists and deletes by name),
    // so drop any repeat, then alphabetise within each kind like `reorder`.
    const p = dedupeByName(repo.points);
    const r = dedupeByName(repo.routes);
    const points = p.out, routes = r.out;
    if (p.dropped) notes.push(`${p.dropped} duplicate waypoint name(s) skipped`);
    if (r.dropped) notes.push(`${r.dropped} duplicate route name(s) skipped`);
    points.sort(byName);
    routes.sort(byName);

    const noTz = applyTimezones(points);
    if (noTz) notes.push(`${noTz} waypoint(s) without a timezone`);

    const root = new Map();
    root.set(POINTS_KEY, encodePoints(points));
    root.set(ROUTES_KEY, encodeRoutes(routes));

    // Include whichever controls are ticked, set to fixed values. A number
    // is written as a Java Float; a string (the radar's filter) as-is.
    let positions = 0;
    for (const { id, keys } of CONTROL_RESETS) {
      if (!document.getElementById(id).checked) continue;
      for (const [k, v] of Object.entries(keys))
        root.set(k, typeof v === "string" ? v : JavaSer.box("F", v));
      positions++;
    }
    if (positions) notes.push(`${positions} control(s)`);

    const outBytes = JavaSer.dumps(root);
    JavaSer.loads(outBytes); // re-parse our own output before offering it

    downloadBytes(outBytes, "PGSData.dat");
    const detail = notes.length ? ` (${notes.join("; ")})` : "";
    backupStatus(
      `Built a partial backup — ${points.length} waypoint(s) and ${routes.length} route(s)${detail}. ` +
      "Import it into PGSharp.", "ok");
  } catch (e) {
    backupStatus(`Failed to build backup: ${e.message}`, "err");
  } finally {
    backupRunEl.disabled = false;
  }
});
