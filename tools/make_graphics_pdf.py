from pathlib import Path
import math
import random

from PIL import Image, ImageDraw, ImageFilter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf"
CAPTURES = OUT / "captures"
PAGES = OUT / "pages"
BACKGROUNDS = OUT / "backgrounds"
PDF = OUT / "baseball5_panel_graphics.pdf"

W, H = 1920, 1080
PDF_W, PDF_H = 960, 540

GRAPHICS = [
    ("scorebug", "scorebug.png", 0),
    ("scoreboard", "scoreboard.png", 1),
    ("matchup", "matchup.png", 2),
    ("roster_away", "roster-away.png", 0),
    ("roster_home", "roster-home.png", 1),
    ("umpires", "umpires.png", 2),
    ("player", "player.png", 0),
    ("commentators", "commentators.png", 1),
    ("upcoming", "upcoming.png", 2),
]


def lerp(a, b, t):
    return int(a + (b - a) * t)


def make_background(index):
    palettes = [
        ((8, 14, 20), (24, 44, 50), (0, 178, 150), (255, 201, 54)),
        ((11, 16, 24), (34, 38, 43), (255, 77, 92), (255, 203, 58)),
        ((6, 19, 24), (22, 31, 38), (108, 196, 230), (255, 204, 62)),
    ]
    top, bottom, accent, gold = palettes[index % len(palettes)]
    img = Image.new("RGB", (W, H), top)
    px = img.load()

    for y in range(H):
        t = y / (H - 1)
        for x in range(W):
            side = (x / (W - 1)) * 0.12
            px[x, y] = (
                lerp(top[0], bottom[0], min(1, t + side)),
                lerp(top[1], bottom[1], min(1, t + side)),
                lerp(top[2], bottom[2], min(1, t + side)),
            )

    draw = ImageDraw.Draw(img, "RGBA")
    random.seed(45 + index)
    for _ in range(4200):
        x = random.randrange(W)
        y = random.randrange(H)
        a = random.randrange(9, 24)
        draw.point((x, y), fill=(255, 255, 255, a))

    # Broadcast diagonal energy bands.
    for i in range(-240, 2140, 155):
        draw.polygon(
            [(i, -40), (i + 42, -40), (i - 620, H + 70), (i - 690, H + 70)],
            fill=(*accent, 18),
        )

    # Stylized Baseball5 court.
    court = [(1180, 165), (1748, 320), (1592, 895), (995, 748)]
    draw.polygon(court, outline=(*gold, 120), width=8)
    draw.line([(1180, 165), (1592, 895)], fill=(*gold, 75), width=4)
    draw.line([(1748, 320), (995, 748)], fill=(*gold, 75), width=4)
    draw.line([(1285, 454), (1590, 535), (1510, 806), (1203, 721), (1285, 454)], fill=(*accent, 64), width=5)

    # Large soft ball mark.
    cx, cy, r = 1500, 760, 295
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(*gold, 42), width=38)
    for off in (-92, 92):
        pts = []
        for a in range(-80, 82, 8):
            rad = math.radians(a)
            pts.append((cx + off + math.sin(rad) * 96, cy + math.cos(rad) * 245))
        draw.line(pts, fill=(*gold, 36), width=12)

    # Subtle vignette.
    vignette = Image.new("L", (W, H), 0)
    vd = ImageDraw.Draw(vignette)
    max_inset = min(W, H) // 2 - 20
    for i in range(0, max_inset, 20):
        alpha = int(190 * (i / max_inset) ** 2)
        vd.rectangle((i, i, W - i, H - i), outline=alpha, width=20)
    vignette = vignette.filter(ImageFilter.GaussianBlur(30))
    dark = Image.new("RGB", (W, H), (0, 0, 0))
    img = Image.composite(img, dark, vignette.point(lambda p: 150 - min(p, 150)))

    return img.convert("RGBA")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    PAGES.mkdir(parents=True, exist_ok=True)
    BACKGROUNDS.mkdir(parents=True, exist_ok=True)

    background_files = []
    for i in range(3):
        bg = make_background(i)
        path = BACKGROUNDS / f"baseball5_background_{i + 1}.png"
        bg.save(path)
        background_files.append(path)

    page_files = []
    for name, capture_name, bg_index in GRAPHICS:
        bg = Image.open(background_files[bg_index]).convert("RGBA")
        overlay = Image.open(CAPTURES / capture_name).convert("RGBA")
        page = Image.alpha_composite(bg, overlay)
        out = PAGES / f"{name}.png"
        page.convert("RGB").save(out, quality=95)
        page_files.append(out)

    c = canvas.Canvas(str(PDF), pagesize=(PDF_W, PDF_H))
    for page in page_files:
        c.drawImage(ImageReader(str(page)), 0, 0, width=PDF_W, height=PDF_H)
        c.showPage()
    c.save()
    print(PDF)


if __name__ == "__main__":
    main()
