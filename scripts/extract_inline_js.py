#!/usr/bin/env python3
"""Print index.html's inline <script> JavaScript to stdout for syntax checking."""
import re, sys

html = open("index.html", encoding="utf-8").read()
blocks = re.findall(r"<script>(.*?)</script>", html, re.S)
if not blocks:
    sys.exit("no inline <script> block found in index.html")
sys.stdout.write(blocks[-1])
