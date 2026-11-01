"""Make each app's own icons: letters in a ring on the competition's colour.

Every app folder gets icons/favicon-32.png, apple-touch-icon.png (180), icon-192.png and icon-512.png,
so each tracker is easy to tell apart in browser tabs, sidebars, the window switcher and on a phone home screen.
The hub keeps the shared star icon in /icons.

Add a line to APPS for each new competition (2 or 3 letters), then run:
    python3 tools/make_icons.py
    python3 tools/build_pages.py
Check tools/icon-preview.png (git-ignored) before committing.
No official logos here: the repo and site are public, logos stay in Drive.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent

# folder, letters, background, ring, letters colour
APPS = [
    ("a-league", "AL", "#2121b8", "#ff4f4f", "#ffffff"),
    ("world-cup", "WC", "#061633", "#00e1e6", "#ffffff"),
    ("formula-e", "FE", "#13171e", "#5b2ee6", "#c6f432"),
]
# Not built yet; drawn in the preview only, to check how three letters look.
PREVIEW_ONLY = [
    ("NRL", "#0b2a1c", "#33d17a", "#ffffff"),
    ("AFL", "#0d1f3c", "#e8463a", "#ffffff"),
    ("BBL", "#13221a", "#f2c230", "#ffffff"),
    ("F1", "#1a0f12", "#ff3b3b", "#ffffff"),
]
FONTS = ["/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf", "/usr/share/fonts/opentype/inter/Inter-Bold.otf",
         "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]


def font(size):
    for f in FONTS:
        if Path(f).exists():
            return ImageFont.truetype(f, size)
    return ImageFont.load_default(size)


def draw_icon(letters, bg, ring, ink, size):
    s = size * 4  # draw large, then shrink for smooth edges
    im = Image.new("RGB", (s, s), bg)  # full bleed, so phones can round or mask the corners
    d = ImageDraw.Draw(im)
    c, r, w = s / 2, s * 0.37, max(4, round(s * 0.05))  # ring sits inside the 80% maskable safe zone
    d.ellipse([c - r, c - r, c + r, c + r], outline=ring, width=w)
    inner = r - w  # letters fit inside the ring: up to 72% of its inner width, 50% of its height
    fs = round(inner * 1.0)
    while fs > 8:
        f = font(fs)
        x0, y0, x1, y1 = d.textbbox((0, 0), letters, font=f)
        if x1 - x0 <= inner * 1.44 and y1 - y0 <= inner * 0.78:
            break
        fs -= 4
    d.text((c - (x0 + x1) / 2, c - (y0 + y1) / 2), letters, font=f, fill=ink)
    return im.resize((size, size), Image.LANCZOS)


SIZES = {"favicon-32.png": 32, "apple-touch-icon.png": 180, "icon-192.png": 192, "icon-512.png": 512}

if __name__ == "__main__":
    tiles = []
    for folder, letters, bg, ring, ink in APPS:
        out = root / folder / "icons"
        out.mkdir(parents=True, exist_ok=True)
        for name, px in SIZES.items():
            draw_icon(letters, bg, ring, ink, px).save(out / name, optimize=True)
        print("wrote", out.relative_to(root))
        tiles.append((letters, bg, ring, ink))
    tiles += PREVIEW_ONLY
    # preview: each icon at 128px and at the 32px a browser tab uses
    sheet = Image.new("RGB", (len(tiles) * 150 + 10, 200), "#0b0b10")
    for i, t in enumerate(tiles):
        sheet.paste(draw_icon(*t, 128), (10 + i * 150, 10))
        sheet.paste(draw_icon(*t, 32), (58 + i * 150, 156))
    sheet.save(root / "tools" / "icon-preview.png")
    print("preview tools/icon-preview.png")
