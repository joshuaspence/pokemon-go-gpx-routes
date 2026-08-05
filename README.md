# Hotspots

Coordinates for teleporting to popular locations & hotspots for raiding, community days, and farming.

## Route Viewer

[`index.html`](index.html) renders every GPX route on an interactive map, along
with the large-city teleport points from [`Large Cities.gpx`](Large%20Cities.gpx).
It reads the `.gpx` files directly, so it needs to be served over HTTP rather than
opened from disk — either publish the repository with GitHub Pages, or run a local
server:

```sh
python3 -m http.server
# then open http://localhost:8000/
```

## Pokestop/Gym Clusters

| Country              | City         | Coordinates             |
|----------------------|--------------|-------------------------|
| Brazil               | São Paulo    | `-23.550572,-46.657470` |
| Canary Islands       | Gran Canaria | `28.12976,-15.45106`    |
| Ecuador              | Guayas       | `-2.102919,-79.907980`  |
| Hungary              | Budapest     | `47.529972,19.051153`   |
| Peru                 | Lima         | `-11.562937,-77.270209` |
| Portugal             | Oeiras       | `38.699629,-9.300969`   |
| Spain                | Zaragoza     | `41.661130,-0.893750`   |
| United Arab Emirates | Dubai        | `25.076303,55.132383`   |

## Popular Spoofing Spots

| Country       | City              | Landmark          | Coordinates             |
|---------------|-------------------|-------------------|-------------------------|
| Japan         | Tottori           | Tottori Dunes     | `35.542978,134.223962`  |
| Mexico        | Mexico City       |                   | `19.427393,-99.193284`  |
| Romania       | Bucharest         |                   | `44.456930,26.082360`   |
| South Korea   | Busan             |                   | `35.153662,129.060283`  |
| South Korea   | Seoul             | Olympic Park      | `37.518103,127.124086`  |
| United States | San Diego, CA     | San Diego Zoo     | `32.735302,-117.155184` |
| United States | San Francisco, CA | Pier 39           | `37.808864,-122.409786` |
| United States | Santa Monica, CA  | Santa Monica Pier | `34.008976,-118.497452` |
