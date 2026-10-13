"""Builds the app icons in public/ from design/icon-source.png. Run: npm run icons (needs Pillow).

The source is a 2000×2000 white zodiac wheel on navy #1A2140.
- apple-touch-icon 180, icon-192, icon-512: the source, resized.
- icon-maskable-512: wheel scaled to 75% on navy padding, so Android's circle
  crop (safe zone = 80% circle) never reaches the glyphs.
- favicon-16/32 (+ favicon.ico): only the centre circle-and-drop, strokes
  thickened so they survive at 16–32 px.
"""
from PIL import Image, ImageFilter

NAVY = (0x1A, 0x21, 0x40)
SRC = 'design/icon-source.png'
OUT = 'public/icons/'

src = Image.open(SRC).convert('RGB')
W = src.width


def resized(size):
    return src.resize((size, size), Image.LANCZOS)


def maskable(size, scale=0.75):
    canvas = Image.new('RGB', (size, size), NAVY)
    inner = round(size * scale)
    canvas.paste(resized(inner), ((size - inner) // 2, (size - inner) // 2))
    return canvas


# Centre motif: circle with its drop, centred at about (1000, 983) in the source,
# 484 px across, strokes ~7 px wide.
CENTER = (W * 0.5, W * 0.4915)


def favicon(size, half, grow):
    """half: half-width of the source crop; grow: px to thicken strokes by on each side."""
    cx, cy = CENTER
    box = tuple(round(v) for v in (cx - half, cy - half, cx + half, cy + half))
    mask = src.crop(box).convert('L').point(lambda v: 255 if v > 128 else 0)
    mask = mask.filter(ImageFilter.MaxFilter(2 * grow + 1)).filter(ImageFilter.GaussianBlur(1.5))
    img = Image.new('RGB', mask.size, NAVY)
    img.paste((255, 255, 255), mask=mask)
    return img.resize((size, size), Image.LANCZOS)


resized(180).save(OUT + 'apple-touch-icon.png', optimize=True)
resized(192).save(OUT + 'icon-192.png', optimize=True)
resized(512).save(OUT + 'icon-512.png', optimize=True)
maskable(512).save(OUT + 'icon-maskable-512.png', optimize=True)
f32 = favicon(32, 290, 14)
f16 = favicon(16, 275, 22)
f32.save(OUT + 'favicon-32.png', optimize=True)
f16.save(OUT + 'favicon-16.png', optimize=True)
# /favicon.ico is what browsers fetch when nothing else is declared.
f32.save('public/favicon.ico', sizes=[(16, 16), (32, 32)], append_images=[f16])
print('icons written')
