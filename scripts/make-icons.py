"""Draws the app icons into public/icons/. Run: npm run icons (needs Pillow).

Night-sky square with the brass zodiac ring from the Today wheel and a gold
crescent moon. Maskable variant keeps everything inside the 80% safe zone.
"""
import math
from PIL import Image, ImageDraw

NIGHT = (26, 33, 64)
BRASS = (227, 188, 116)
RING = (227, 188, 116, 150)
SS = 4  # supersample factor


def draw(size, scale):
    S = size * SS
    img = Image.new('RGBA', (S, S), NIGHT + (255,))
    d = ImageDraw.Draw(img)
    c = S / 2
    R = S * 0.36 * scale
    w = max(2, int(S * 0.012))
    # outer + inner ring with 12 sign ticks
    for r in (R, R * 0.74):
        d.ellipse([c - r, c - r, c + r, c + r], outline=RING, width=w)
    for i in range(12):
        a = math.radians(i * 30 + 15)
        d.line([c + math.cos(a) * R * 0.74, c - math.sin(a) * R * 0.74, c + math.cos(a) * R, c - math.sin(a) * R], fill=RING, width=w)
    # crescent: gold disc minus offset night disc
    m = R * 0.5
    d.ellipse([c - m, c - m, c + m, c + m], fill=BRASS)
    o = m * 0.42
    d.ellipse([c - m + o, c - m - o * 0.35, c + m + o, c + m - o * 0.35], fill=NIGHT)
    # small star dot on the ring, like the moon marker in the wheel
    sa = math.radians(52)
    sr = R * 0.87
    s = R * 0.07
    sx, sy = c + math.cos(sa) * sr, c - math.sin(sa) * sr
    d.ellipse([sx - s, sy - s, sx + s, sy + s], fill=(238, 240, 248))
    return img.resize((size, size), Image.LANCZOS).convert('RGB')


out = 'public/icons/'
draw(192, 1).save(out + 'icon-192.png', optimize=True)
draw(512, 1).save(out + 'icon-512.png', optimize=True)
draw(512, 0.8).save(out + 'icon-maskable-512.png', optimize=True)
draw(180, 1).save(out + 'apple-touch-icon.png', optimize=True)
print('icons written')
