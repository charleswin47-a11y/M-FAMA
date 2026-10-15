import os
from PIL import Image, ImageDraw

UPLOAD_DIR = "C:/Users/USER/.gemini/antigravity-ide/brain/f1a99a08-badd-480a-9f0f-a81916f7bd09/.user_uploaded"
OUT_FACES = "assets/art/cards/faces"
os.makedirs(OUT_FACES, exist_ok=True)

mapping = [
    ("media_1792089609358.jpg", "k_diamonds.png"),
    ("media_1792089723855.jpg", "k_clubs.png"),
    ("media_1792089833693.jpg", "j_spades.png"),
    ("media_1792090352975.jpg", "j_hearts.png"),
    ("media_1792090558799.jpg", "j_clubs.png"),
    ("media_1792093024753.jpg", "a_spades.png"),
    ("media_1792093048453.jpg", "a_hearts.png"),
]

def is_dark(p):
    return p[0] < 35 and p[1] < 35 and p[2] < 35

def process_card(src_path, dest_path):
    im = Image.open(src_path).convert("RGBA")
    w, h = im.size

    # Auto-detect black border
    top = 0
    for y in range(h):
        dark_count = sum(1 for x in range(w // 4, 3 * w // 4) if is_dark(im.getpixel((x, y))))
        if dark_count < (w // 2) * 0.45:
            top = y
            break

    bottom = h - 1
    for y in range(h - 1, -1, -1):
        dark_count = sum(1 for x in range(w // 4, 3 * w // 4) if is_dark(im.getpixel((x, y))))
        if dark_count < (w // 2) * 0.45:
            bottom = y
            break

    left = 0
    for x in range(w):
        dark_count = sum(1 for y in range(h // 4, 3 * h // 4) if is_dark(im.getpixel((x, y))))
        if dark_count < (h // 2) * 0.45:
            left = x
            break

    right = w - 1
    for x in range(w - 1, -1, -1):
        dark_count = sum(1 for y in range(h // 4, 3 * h // 4) if is_dark(im.getpixel((x, y))))
        if dark_count < (h // 2) * 0.45:
            right = x
            break

    # Security margin
    if right - left < w * 0.6 or bottom - top < h * 0.6:
        print(f"Warning: strange bounds for {src_path}: {left},{top},{right},{bottom}")
        left, top, right, bottom = int(w * 0.05), int(h * 0.05), int(w * 0.95), int(h * 0.95)

    cropped = im.crop((left, top, right + 1, bottom + 1))
    cw, ch = cropped.size

    # Create smooth rounded corner alpha mask
    radius = int(cw * 0.055)
    mask = Image.new("L", (cw, ch), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), (cw, ch)], radius=radius, fill=255)

    cropped.putalpha(mask)
    cropped.save(dest_path, "PNG", optimize=True)
    print(f"[OK] Saved {dest_path} ({cw}x{ch}) from {os.path.basename(src_path)}")

for src_file, dest_file in mapping:
    p = os.path.join(UPLOAD_DIR, src_file)
    out_p = os.path.join(OUT_FACES, dest_file)
    if os.path.exists(p):
        process_card(p, out_p)
    else:
        print(f"[ERROR] Not found: {p}")
