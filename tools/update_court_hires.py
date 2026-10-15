import os
from PIL import Image

UPLOAD_DIR = "C:/Users/USER/.gemini/antigravity-ide/brain/f1a99a08-badd-480a-9f0f-a81916f7bd09/.user_uploaded"
OUT_COURT = "assets/art/characters/court"
os.makedirs(OUT_COURT, exist_ok=True)

mapping = [
    ("media_1792049456349.jpg", "dona_trambique_ouros.png"),
    ("media_1792049587633.jpg", "madruga_espadas.png"),
    ("media_1792049712986.jpg", "migue_copas.png"),
    ("media_1792049812963.jpg", "pombo_de_guerra_paus.png")
]

for src_file, dest_name in mapping:
    src_path = os.path.join(UPLOAD_DIR, src_file)
    if os.path.exists(src_path):
        im = Image.open(src_path)
        dest_path = os.path.join(OUT_COURT, dest_name)
        im.save(dest_path, "PNG")
        # Also keep jpg fallback
        jpg_name = dest_name.replace(".png", ".jpg")
        im.convert("RGB").save(os.path.join(OUT_COURT, jpg_name), quality=95)
        print(f"Updated court figure: {dest_name}")
    else:
        print(f"File not found: {src_path}")
