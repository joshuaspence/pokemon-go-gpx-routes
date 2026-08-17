# Pokémon GO GPX Routes

A collection of GPX walking tracks and teleport waypoints for Pokémon GO,
browsable on an interactive map.

**➡️ [Open the map](https://joshuaspence.github.io/pokemon-go-gpx-routes/)**

Tracks (`<trk>`) and waypoints (`<wpt>`) are stored as `.gpx` files grouped by
country — the files themselves are the source of truth. The viewer
([`index.html`](index.html)) reads them directly, so to run it locally serve the
repository over HTTP (the files are loaded via `fetch`):

```sh
python3 -m http.server
# then open http://localhost:8000/
```

## File format

Each entry keeps its place name in `<name>` and everything else in separate
fields, so nothing has to be split back out of a label:

```xml
<trk>
  <name>Westfalenpark</name>
  <extensions>
    <pgr:city>Dortmund, North Rhine-Westphalia</pgr:city>
    <pgr:country>Germany</pgr:country>
    <pgr:variant>long</pgr:variant>
  </extensions>
</trk>
```

GPX 1.1 has no element for a locality, a country or a short/long variant, so
those three live in the `pgr` namespace declared on `<gpx>`. `<pgr:city>` is the
locality the place sits in, including its region — it is absent when the name is
itself the place (`Melbourne`, `Boston, MA`). `<pgr:variant>` is `short`/`long`,
and only for routes that come as a pair. `<name>` and `<pgr:country>` are
required; the viewer names any file missing either instead of guessing from the
path.

One caveat: an editor that does not model foreign extensions drops the whole
`<extensions>` block when it exports. gpx.studio is one, so a route re-exported
from there comes back without its city, country and variant, and needs them
added again.

## Import into PGSharp

The map's **PGSharp backup** panel (in the sidebar) builds a *partial*
`PGSData.dat` containing only every route and waypoint here — plus, if ticked, a
fixed control layout (floating control, fast-snipe buttons, cooldown indicator,
nearby radar).
No existing backup is needed: click **Generate & download**, then import the file
into PGSharp to add them as favourites. Because the file holds only those keys,
importing it leaves the rest of your PGSharp profile as it was. Everything runs
in the browser. The favourite encoding is a client-side port of
[`pgsedit`](https://github.com/joshuaspence/pgsedit).

Every favourite is named with its country's flag in front — `🇳🇱 Amsterdam,
Netherlands`, `🇯🇵 Ueno Park, Tokyo, Japan` — matching PGSharp's own hot places
(`🇺🇸 Pier 39, California, USA`). The favourite format has no icon field, so the
flag is simply part of the name; it is derived from the `<desc>` country, and a
country the viewer has no code for stops the build rather than importing
unflagged. Both lists still sort by the name itself, so a flag never moves an
entry.

Each waypoint also carries the IANA timezone its coordinates fall in
(`Europe/Madrid`), read from the boundary data in
[`tz-lookup`](https://github.com/darkskyapp/tz-lookup) — a zone name belongs to
a polygon, so no offset calculation can stand in for it. Routes have no timezone
field, matching PGSharp. If that script does not load, the backup is written
without timezones and the panel says how many were left out; PGSharp accepts
entries either way.
