#!/usr/bin/env python3
"""Builds the site icons from the Oswald "S": favicon.svg, apple-touch-icon.png
(180 px) and icon-512.png.

The glyph is Oswald Bold (the variable font in fonts/, pinned at weight 700),
scaled to 44 of 64 units tall and centred, in Capitol gold #d8b86a on House
navy #0d1b33: the same gold as "a Speaker" in the header. favicon.svg keeps
rounded corners for browser tabs. The PNGs are rendered from a full-bleed
square, because iOS rounds home-screen icons itself and a pre-rounded tile
would show navy corners inside its mask.

Run from the repo root:  python3 tools/icons.py
Requires fontTools and Pillow (pip install fonttools brotli pillow) and
Google Chrome, which rasterizes the SVG.
"""
import os, re, subprocess, tempfile
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from PIL import Image

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
NAVY, GOLD = "#0d1b33", "#d8b86a"

font = instantiateVariableFont(TTFont("fonts/oswald-latin.woff2"), {"wght": 700})
glyphs = font.getGlyphSet()
glyph = glyphs[font.getBestCmap()[ord("S")]]

# Scale the glyph to 44 of 64 units tall, centre it, and flip y (font units
# point up, SVG units point down).
bounds = BoundsPen(glyphs)
glyph.draw(bounds)
x0, y0, x1, y1 = bounds.bounds
scale = 44 / (y1 - y0)
tx = 32 - (x0 + (x1 - x0) / 2) * scale
ty = 32 + (y0 + (y1 - y0) / 2) * scale
pen = SVGPathPen(glyphs)
glyph.draw(TransformPen(pen, (scale, 0, 0, -scale, tx, ty)))
path = re.sub(r"-?\d+\.\d+", lambda m: ("%.2f" % float(m.group())).rstrip("0").rstrip("."), pen.getCommands())


def svg(corner):
    rx = f' rx="{corner}"' if corner else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
            f'<rect width="64" height="64"{rx} fill="{NAVY}"/><path d="{path}" fill="{GOLD}"/></svg>')


open("favicon.svg", "w").write(svg(10))

with tempfile.TemporaryDirectory() as tmp:
    square = os.path.join(tmp, "square.svg")
    open(square, "w").write(svg(0))
    for size, out in ((180, "apple-touch-icon.png"), (512, "icon-512.png")):
        page = os.path.join(tmp, "icon.html")
        shot = os.path.join(tmp, "icon.png")
        open(page, "w").write(f'<body style="margin:0"><img src="file://{square}" width="{size}" height="{size}">')
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                        f"--window-size={size},{size}", f"--screenshot={shot}", f"file://{page}"],
                       check=True, capture_output=True)
        Image.open(shot).convert("RGB").save(out, optimize=True)
        print(f"wrote {out}")
print("wrote favicon.svg. Open the PNGs and look at them at 16 px before committing.")
