import os
import glob
from PIL import Image, ImageDraw

def clean_card(src_path, out_path=None):
    if out_path is None:
        out_path = src_path

    im = Image.open(src_path).convert('RGBA')
    w, h = im.size

    # Check if image already has transparent corners
    # Sample corner alpha
    if im.getpixel((0, 0))[3] == 0 and im.getpixel((w - 1, 0))[3] == 0:
        print(f"Skipping already transparent {src_path}")
        return

    def is_dark(p):
        return p[0] < 35 and p[1] < 35 and p[2] < 35

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

    # Security check: if detection was weird, fallback
    if right - left < w * 0.6 or bottom - top < h * 0.6:
        print(f"Warning: strange bounds for {src_path}: {left},{top},{right},{bottom}")
        left, top, right, bottom = int(w * 0.05), int(h * 0.05), int(w * 0.95), int(h * 0.95)

    cropped = im.crop((left, top, right + 1, bottom + 1))
    cw, ch = cropped.size

    # Corner rounded mask
    radius = int(cw * 0.055)
    mask = Image.new('L', (cw, ch), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), (cw - 1, ch - 1)], radius=radius, fill=255)

    cropped.putalpha(mask)
    cropped.save(out_path, 'PNG')
    print(f"Cleaned card {os.path.basename(src_path)} -> {cw}x{ch}")

if __name__ == '__main__':
    # 1. Back of card
    clean_card('assets/art/cards/card_back_main.png')
    
    # 2. All 40 face cards
    faces = glob.glob('assets/art/cards/faces/*.png')
    print(f"Processing {len(faces)} card faces...")
    for f in faces:
        clean_card(f)
    print("Done cleaning all cards!")
