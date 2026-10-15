import os
from PIL import Image

UPLOAD_DIR = "C:/Users/USER/.gemini/antigravity-ide/brain/f1a99a08-badd-480a-9f0f-a81916f7bd09/.user_uploaded"
OUT_PORTRAITS = "assets/art/characters/portraits"
OUT_AVATARS = "assets/art/characters/avatars"

os.makedirs(OUT_PORTRAITS, exist_ok=True)
os.makedirs(OUT_AVATARS, exist_ok=True)

chars = [
    {
        "id": "veneno",
        "file": "media_1792042976334.jpg",
        "face_box": (0.30, 0.08, 0.72, 0.52) # x1_pct, y1_pct, x2_pct, y2_pct
    },
    {
        "id": "calibre",
        "file": "media_1792043327173.jpg",
        "face_box": (0.30, 0.02, 0.72, 0.44)
    },
    {
        "id": "pixel",
        "file": "media_1792043454723.jpg",
        "face_box": (0.45, 0.03, 0.82, 0.45)
    },
    {
        "id": "trampa",
        "file": "media_1792043563558.jpg",
        "face_box": (0.35, 0.05, 0.78, 0.48)
    }
]

for c in chars:
    src_path = os.path.join(UPLOAD_DIR, c["file"])
    if os.path.exists(src_path):
        im = Image.open(src_path).convert("RGBA")
        # Save high quality PNG
        portrait_png = os.path.join(OUT_PORTRAITS, f"char_{c['id']}_portrait.png")
        im.save(portrait_png, "PNG")
        
        # Also keep jpg for fallback
        im.convert("RGB").save(os.path.join(OUT_PORTRAITS, f"char_{c['id']}_portrait.jpg"), quality=95)
        
        # Crop face for avatar
        w, h = im.size
        fx1, fy1, fx2, fy2 = c["face_box"]
        crop_box = (int(w * fx1), int(h * fy1), int(w * fx2), int(h * fy2))
        avatar = im.crop(crop_box).resize((320, 320), Image.Resampling.LANCZOS)
        
        avatar.save(os.path.join(OUT_AVATARS, f"avatar_{c['id']}.png"), "PNG")
        avatar.convert("RGB").save(os.path.join(OUT_AVATARS, f"avatar_{c['id']}.jpg"), quality=95)
        print(f"Processed official {c['id']}: portrait {w}x{h} & avatar 320x320 PNG saved!")
    else:
        print(f"File not found: {src_path}")

print("All official portraits and avatars successfully created!")
