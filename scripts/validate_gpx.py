#!/usr/bin/env python3
"""Validate every .gpx file: well-formed XML in the GPX 1.1 namespace, with at
least one point, and all coordinates within range."""
import glob, sys, xml.etree.ElementTree as ET

NS = "{http://www.topografix.com/GPX/1/1}"
errors = []
files = sorted(glob.glob("**/*.gpx", recursive=True))
if not files:
    errors.append("no .gpx files found")

for f in files:
    try:
        root = ET.parse(f).getroot()
    except ET.ParseError as e:
        errors.append(f"{f}: not well-formed XML: {e}")
        continue
    if root.tag != NS + "gpx":
        errors.append(f"{f}: root element is {root.tag!r}, expected GPX 1.1 <gpx>")
    pts = root.findall(f".//{NS}trkpt") + root.findall(f".//{NS}wpt")
    if not pts:
        errors.append(f"{f}: contains no <trkpt> or <wpt> points")
    for p in pts:
        try:
            lat, lon = float(p.get("lat")), float(p.get("lon"))
        except (TypeError, ValueError):
            errors.append(f"{f}: point with missing/invalid lat/lon")
            continue
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            errors.append(f"{f}: coordinate out of range {lat},{lon}")

for e in errors:
    print(f"::error::{e}")
print(f"Checked {len(files)} GPX file(s); {len(errors)} problem(s).")
sys.exit(1 if errors else 0)
