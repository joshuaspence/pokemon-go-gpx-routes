#!/usr/bin/env python3
"""Check that index.html's ROUTE_FILES / WAYPOINT_FILES stay in sync with the
.gpx files on disk: every listed file exists, and every .gpx file is listed."""
import glob, os, re, sys

html = open("index.html", encoding="utf-8").read()
errors = []

def extract(name):
    m = re.search(name + r"\s*=\s*\[(.*?)\]", html, re.S)
    if not m:
        errors.append(f"{name} not found in index.html")
        return []
    return re.findall(r'"([^"]+)"', m.group(1))

route_files = extract("ROUTE_FILES")
waypoint_files = extract("WAYPOINT_FILES")
listed = set(route_files) | set(waypoint_files)

for f in route_files + waypoint_files:
    if not os.path.exists(f):
        errors.append(f"listed in index.html but missing on disk: {f}")

for f in sorted(glob.glob("**/*.gpx", recursive=True)):
    if f not in listed:
        errors.append(f"{f} exists but is not referenced in index.html")

for e in errors:
    print(f"::error::{e}")
print(f"{len(route_files)} track file(s), {len(waypoint_files)} waypoint file(s) listed.")
sys.exit(1 if errors else 0)
