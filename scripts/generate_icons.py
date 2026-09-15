from PIL import Image, ImageDraw
import math
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
os.makedirs(OUT, exist_ok=True)

BG_TOP = (8, 145, 178)     # cyan-600
BG_BOTTOM = (14, 116, 144)  # cyan-700
DROP = (255, 255, 255)


def draw_icon(size, padding_ratio=0.16, rounded_ratio=0.22, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # vertical gradient background, rounded square (or full-bleed for maskable)
    radius = 0 if maskable else int(size * rounded_ratio)
    for y in range(size):
        t = y / size
        r = int(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * t)
        g = int(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * t)
        b = int(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * t)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, size, size], radius=radius, fill=255)
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bg.paste(img, (0, 0), mask)
    img = bg
    draw = ImageDraw.Draw(img)

    # water drop shape, centered, sized relative to icon (smaller if maskable so it survives cropping)
    drop_scale = 0.34 if maskable else 0.30
    cx, cy = size / 2, size / 2
    drop_h = size * drop_scale * 2.1
    drop_w = size * drop_scale * 1.7
    top_y = cy - drop_h * 0.52
    bottom_y = top_y + drop_h

    circle_r = drop_w / 2
    circle_cy = bottom_y - circle_r

    points = []
    steps = 60
    for i in range(steps + 1):
        angle = math.pi * (i / steps)
        x = cx - circle_r * math.cos(angle)
        y = circle_cy + circle_r * math.sin(angle)
        points.append((x, y))
    points.append((cx, top_y))

    draw.polygon(points, fill=DROP)
    draw.ellipse(
        [cx - circle_r, circle_cy - circle_r, cx + circle_r, circle_cy + circle_r],
        fill=DROP,
    )

    # subtle inner highlight
    hl_r = circle_r * 0.32
    hl_cx = cx - circle_r * 0.35
    hl_cy = circle_cy - circle_r * 0.15
    draw.ellipse(
        [hl_cx - hl_r, hl_cy - hl_r, hl_cx + hl_r, hl_cy + hl_r],
        fill=(255, 255, 255, 130),
    )

    return img


sizes = [192, 256, 384, 512]
for s in sizes:
    draw_icon(s).save(os.path.join(OUT, f"icon-{s}.png"))

draw_icon(512, maskable=True).save(os.path.join(OUT, "icon-maskable-512.png"))
draw_icon(180, rounded_ratio=0.22).save(os.path.join(OUT, "apple-touch-icon.png"))
draw_icon(32).save(os.path.join(OUT, "favicon-32.png"))

print("Icons generated in", OUT)
