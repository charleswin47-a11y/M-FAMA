import os
from PIL import Image

UPLOAD_DIR = "C:/Users/USER/.gemini/antigravity-ide/brain/f1a99a08-badd-480a-9f0f-a81916f7bd09/.user_uploaded"
OUT_FACES = "assets/art/cards/faces"

mapping = [
    ("media_1792048400733.jpg", "q_diamonds.png"),
    ("media_1792048554825.jpg", "3_clubs.png"),
    ("media_1792048650675.jpg", "4_clubs.png"),
    ("media_1792048781278.jpg", "5_clubs.png")
]

for src_file, dest_name in mapping:
    src_path = os.path.join(UPLOAD_DIR, src_file)
    if os.path.exists(src_path):
        im = Image.open(src_path)
        dest_path = os.path.join(OUT_FACES, dest_name)
        im.save(dest_path, "PNG")
        print(f"Updated high-res card: {dest_name}")
    else:
        print(f"File not found: {src_path}")
