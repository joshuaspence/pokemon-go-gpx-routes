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

Each waypoint also carries the IANA timezone its coordinates fall in
(`Europe/Madrid`), read from the boundary data in
[`tz-lookup`](https://github.com/darkskyapp/tz-lookup) — a zone name belongs to
a polygon, so no offset calculation can stand in for it. Routes have no timezone
field, matching PGSharp. If that script does not load, the backup is written
without timezones and the panel says how many were left out; PGSharp accepts
entries either way.
