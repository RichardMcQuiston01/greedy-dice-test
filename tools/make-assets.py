#!/usr/bin/env python3
"""Regenerates the PNG icons and the social preview image.

The icons are drawn rather than committed by hand so the set stays consistent
if the palette changes. Run from the repository root:

    python3 tools/make-assets.py

Requires Pillow (pip install pillow).
"""
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICON_DIR = os.path.join(ROOT, "icons")

TOP = (30, 60, 114)      # #1e3c72
BOTTOM = (42, 82, 152)   # #2a5298
FACE = (255, 255, 255)
PIP = (51, 51, 51)
ACCENT = (0, 184, 148)   # #00b894

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

# Pip layouts as (col, row) on a 3x3 grid.
PIP_LAYOUTS = {
    1: [(1, 1)],
    2: [(0, 0), (2, 2)],
    3: [(0, 0), (1, 1), (2, 2)],
    4: [(0, 0), (2, 0), (0, 2), (2, 2)],
    5: [(0, 0), (2, 0), (1, 1), (0, 2), (2, 2)],
    6: [(0, 0), (2, 0), (0, 1), (2, 1), (0, 2), (2, 2)],
}


def gradient(size):
    """Vertical brand gradient at `size` = (width, height)."""
    width, height = size
    image = Image.new("RGB", size)
    draw = ImageDraw.Draw(image)
    for y in range(height):
        t = y / max(1, height - 1)
        draw.line(
            [(0, y), (width, y)],
            fill=tuple(round(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3)),
        )
    return image


def draw_die(image, box, value, radius_ratio=0.18, supersample=4):
    """Draws a white die showing `value` inside `box` = (x, y, side)."""
    x, y, side = box
    s = side * supersample
    tile = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(tile)
    draw.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * radius_ratio), fill=FACE)

    pip_r = s * 0.088
    for col, row in PIP_LAYOUTS[value]:
        cx = s * (0.26 + 0.24 * col)
        cy = s * (0.26 + 0.24 * row)
        draw.ellipse([cx - pip_r, cy - pip_r, cx + pip_r, cy + pip_r], fill=PIP)

    tile = tile.resize((side, side), Image.LANCZOS)
    image.paste(tile, (x, y), tile)


def make_icon(size, padding_ratio=0.14):
    image = gradient((size, size)).convert("RGBA")
    side = int(size * (1 - padding_ratio * 2))
    offset = (size - side) // 2
    draw_die(image, (offset, offset, side), 5)
    return image.convert("RGB")


def make_maskable(size):
    """Maskable icons need their art inside the safe zone (inner 80%)."""
    return make_icon(size, padding_ratio=0.26)


def make_og_image():
    width, height = 1200, 630
    image = gradient((width, height)).convert("RGBA")
    draw = ImageDraw.Draw(image)

    title = ImageFont.truetype(FONT_BOLD, 92)
    subtitle = ImageFont.truetype(FONT_REGULAR, 38)

    draw.text((80, 196), "Greedy Dice", font=title, fill=FACE)
    draw.text((80, 312), "A push-your-luck dice game for 1-6 players",
              font=subtitle, fill=(214, 226, 245))
    draw.rounded_rectangle([80, 400, 86, 470], radius=3, fill=ACCENT)
    draw.text((110, 408), "First to 10,000 points wins", font=subtitle, fill=ACCENT)

    for index, value in enumerate([5, 1, 3]):
        draw_die(image, (760 + index * 148, 372, 124), value)

    return image.convert("RGB")


def main():
    os.makedirs(ICON_DIR, exist_ok=True)

    for size in (72, 96, 128, 144, 152, 192, 384, 512):
        make_icon(size).save(os.path.join(ICON_DIR, f"icon-{size}.png"), optimize=True)

    make_icon(180).save(os.path.join(ICON_DIR, "apple-touch-icon.png"), optimize=True)
    make_maskable(512).save(os.path.join(ICON_DIR, "icon-maskable-512.png"), optimize=True)
    make_og_image().save(os.path.join(ROOT, "og-image.png"), optimize=True)

    print(f"Wrote icons to {ICON_DIR} and og-image.png to {ROOT}")


if __name__ == "__main__":
    main()
