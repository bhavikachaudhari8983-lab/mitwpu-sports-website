"""
Draws the 1200x630 link-preview image (WhatsApp, Instagram, LinkedIn, Google) → assets/img/og-image.png

    python3 tools/make_share_image.py

Needs Pillow and the Lato font files (Lato is the MIT-WPU Brand Book digital font). Colours are the logo's.
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(ROOT), "sports sphere platform", "assets", "fonts")
W, H = 1200, 630
NAVY_DEEP, NAVY, PLUM = (12, 17, 54), (21, 28, 79), (58, 31, 79)
RING = [(246, 195, 67), (240, 138, 46), (216, 59, 59), (47, 128, 201), (109, 179, 63)]

img = Image.new("RGB", (W, H), NAVY)
px = img.load()
for x in range(W):  # diagonal navy → plum gradient, like --grad-night
    for y in range(0, H, 1):
        t = (x / W) * 0.75 + (y / H) * 0.25
        a, b = (NAVY_DEEP, NAVY) if t < 0.55 else (NAVY, PLUM)
        u = t / 0.55 if t < 0.55 else (t - 0.55) / 0.45
        px[x, y] = tuple(int(a[i] + (b[i] - a[i]) * u) for i in range(3))
glow = Image.new("RGB", (W, H), (0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse((760, -220, 1360, 380), fill=(150, 70, 20))
gd.ellipse((-200, 380, 300, 880), fill=(90, 70, 20))
img = Image.blend(img, Image.composite(glow, img, glow.convert("L").point(lambda v: 255 if v else 0)).filter(ImageFilter.GaussianBlur(120)), 0.55)
d = ImageDraw.Draw(img)
for x in range(0, W, 22):  # halftone dots
    for y in range(0, H, 22):
        d.ellipse((x, y, x + 2, y + 2), fill=(52, 60, 108))
# motion streaks (logo ring colours)
for i, (c, x0, y) in enumerate(zip(RING, (880, 820, 760, 850, 920), (70, 98, 126, 154, 182))):
    d.rounded_rectangle((x0, y, W + 20, y + 12), radius=6, fill=c)
# ring stripe along the bottom
for i, c in enumerate(RING):
    d.rectangle((i * W // 5, H - 12, (i + 1) * W // 5, H), fill=c)

f = lambda name, size: ImageFont.truetype(os.path.join(FONTS, name), size)
# headline size: the biggest that keeps both lines clear of the logo (left 640px)
hs = 90
while hs > 40 and max(d.textlength(t, font=f("Lato-BlackItalic.ttf", hs)) for t in ("FUELING PASSION.", "BUILDING CHAMPIONS.")) > 640:
    hs -= 2
d.text((72, 170), "MIT-WPU · OFFICIAL SPORTS", font=f("Lato-Black.ttf", 26), fill=(246, 195, 67), spacing=4)
d.text((70, 218), "FUELING PASSION.", font=f("Lato-BlackItalic.ttf", hs), fill=(255, 255, 255))
# orange → red gradient text for the second line
line2, font2 = "BUILDING CHAMPIONS.", f("Lato-BlackItalic.ttf", hs)
mask = Image.new("L", (W, 120), 0)
ImageDraw.Draw(mask).text((0, 0), line2, font=font2, fill=255)
grad = Image.new("RGB", (W, 120))
gp = ImageDraw.Draw(grad)
bbox = mask.getbbox() or (0, 0, W, 120)
for x in range(W):
    t = min(1, max(0, (x - bbox[0]) / max(1, bbox[2] - bbox[0])))
    gp.line([(x, 0), (x, 120)], fill=(int(239 + (217 - 239) * t), int(106 + (56 - 106) * t), int(31 + (31 - 31) * t)))
img.paste(grad, (70, 218 + int(hs * 1.08)), mask)
d.text((72, 218 + int(hs * 2.3) + 10), "Events · Sports · Teams · Achievements", font=f("Lato-Bold.ttf", 32), fill=(214, 218, 235))
d.text((72, 218 + int(hs * 2.3) + 70), "sports-sphere-website.vercel.app", font=f("Lato-Regular.ttf", 26), fill=(160, 168, 200))

logo = Image.open(os.path.join(ROOT, "assets", "img", "logo", "sports-sphere-logo.png")).convert("RGBA")
size = 300
logo = logo.resize((size, size), Image.LANCZOS)
shadow = Image.new("RGBA", (size + 80, size + 80), (0, 0, 0, 0))
ImageDraw.Draw(shadow).ellipse((40, 52, size + 40, size + 64), fill=(0, 0, 0, 150))
shadow = shadow.filter(ImageFilter.GaussianBlur(18))
img = img.convert("RGBA")
img.alpha_composite(shadow, (W - size - 110, 230))
img.alpha_composite(logo, (W - size - 70, 234))
out = os.path.join(ROOT, "assets", "img", "og-image.png")
img.convert("RGB").save(out, optimize=True)
print("Wrote", out, os.path.getsize(out) // 1024, "KB")
