# Hotspots

Coordinates for teleporting to popular locations & hotspots for raiding, community days, and farming.

## Route Viewer

[`index.html`](index.html) renders every GPX track on an interactive map, along
with point-of-interest waypoints (large cities, Poké-stop clusters, and spoofing
spots) from the `*.gpx` waypoint files. It reads the `.gpx` files directly, so it
needs to be served over HTTP rather than opened from disk — either publish the
repository with GitHub Pages, or run a local server:

```sh
python3 -m http.server
# then open http://localhost:8000/
```
