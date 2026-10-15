import os
from PIL import Image

UPLOAD_DIR = "C:/Users/USER/.gemini/antigravity-ide/brain/f1a99a08-badd-480a-9f0f-a81916f7bd09/.user_uploaded"
OUT_FACES = "assets/art/cards/faces"

mapping = [
    ("media_1792044290074.jpg", "2_clubs.png"),
    ("media_1792044368846.jpg", "2_diamonds.png"),
    ("media_1792044458222.jpg", "2_hearts.png"),
    ("media_1792044514320.jpg", "2_spades.png"),
    ("media_1792044614271.jpg", "3_diamonds.png")
]

for src_file, dest_name in mapping:
    src_path = os.path.join(UPLOAD_DIR, src_file)
    if os.path.exists(src_path):
        im = Image.open(src_path)
        dest_path = os.path.join(OUT_FACES, dest_name)
        im.save(dest_path, "PNG")
        print(f"Replaced {dest_name} with high-res card face!")
    else:
        print(f"File not found: {src_path}")
