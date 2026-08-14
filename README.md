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

The map's **PGSharp backup** panel (in the sidebar) writes every route and
waypoint here straight into a PGSharp backup, so they show up as favourites in
the app. Export `PGSDataExport.dat` from PGSharp, choose it in the panel, and it
downloads an updated backup to import back — either replacing your favourites or
adding to them. Optional checkboxes also reset the on-screen control positions
(floating control, fast-snipe buttons, cooldown indicator) to a known-good
layout, and strip the licence/auth info (including the account email) or the
cooldown history out of the backup. Everything runs in the browser; the backup
is never uploaded anywhere. This is a client-side port of
[`pgsedit`](https://github.com/joshuaspence/pgsedit).
