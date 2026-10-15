import os
from PIL import Image

RAW_DIR = "assets/art/raw"
OUT_CHARS = "assets/art/characters/portraits"
OUT_AVATARS = "assets/art/characters/avatars"
OUT_BG = "assets/art/backgrounds"
OUT_TABLE = "assets/art/table"
OUT_CARDS = "assets/art/cards"

for d in [OUT_CHARS, OUT_AVATARS, OUT_BG, OUT_TABLE, OUT_CARDS]:
    os.makedirs(d, exist_ok=True)

# 1. Veneno official portrait
veneno_file = "C:/Users/USER/.gemini/antigravity-ide/brain/f1a99a08-badd-480a-9f0f-a81916f7bd09/.user_uploaded/media_1792042976334.jpg"
if os.path.exists(veneno_file):
    im_veneno = Image.open(veneno_file)
    im_veneno.save(os.path.join(OUT_CHARS, "char_veneno_portrait.jpg"), quality=95)
    # avatar crop focused on face
    w, h = im_veneno.size
    # Face is in upper-mid
    face_box = (int(w * 0.32), int(h * 0.08), int(w * 0.70), int(h * 0.52))
    avatar_veneno = im_veneno.crop(face_box).resize((256, 256), Image.Resampling.LANCZOS)
    avatar_veneno.save(os.path.join(OUT_AVATARS, "avatar_veneno.jpg"), quality=95)
    print("Extracted Veneno official portrait & avatar")

# 2. Extract Trampa, Calibre, Pixel from playable_characters_sheet (media_1792042553222.jpg)
sheet_chars = os.path.join(RAW_DIR, "media_1792042553222.jpg")
if os.path.exists(sheet_chars):
    im_sheet = Image.open(sheet_chars)
    sw, sh = im_sheet.size # 1024 x 682
    print(f"Playable characters sheet size: {sw}x{sh}")
    
    # 4 columns: Trampa (~0 to 0.25), Veneno (~0.25 to 0.5), Calibre (~0.5 to 0.75), Pixel (~0.75 to 1.0)
    # The upper half (around y: 80 to 370) has the main character illustration
    col_w = sw / 4
    
    # Trampa
    trampa_box = (int(0 * col_w + 10), 65, int(1 * col_w - 5), 375)
    im_trampa = im_sheet.crop(trampa_box)
    im_trampa.save(os.path.join(OUT_CHARS, "char_trampa_portrait.jpg"), quality=95)
    
    trampa_face = (int(0 * col_w + 50), 90, int(0 * col_w + 200), 240)
    im_trampa_av = im_sheet.crop(trampa_face).resize((256, 256), Image.Resampling.LANCZOS)
    im_trampa_av.save(os.path.join(OUT_AVATARS, "avatar_trampa.jpg"), quality=95)
    
    # Calibre
    calibre_box = (int(2 * col_w + 5), 65, int(3 * col_w - 5), 375)
    im_calibre = im_sheet.crop(calibre_box)
    im_calibre.save(os.path.join(OUT_CHARS, "char_calibre_portrait.jpg"), quality=95)
    
    calibre_face = (int(2 * col_w + 40), 90, int(2 * col_w + 200), 240)
    im_calibre_av = im_sheet.crop(calibre_face).resize((256, 256), Image.Resampling.LANCZOS)
    im_calibre_av.save(os.path.join(OUT_AVATARS, "avatar_calibre.jpg"), quality=95)
    
    # Pixel
    pixel_box = (int(3 * col_w + 5), 65, int(4 * col_w - 10), 375)
    im_pixel = im_sheet.crop(pixel_box)
    im_pixel.save(os.path.join(OUT_CHARS, "char_pixel_portrait.jpg"), quality=95)
    
    pixel_face = (int(3 * col_w + 35), 90, int(3 * col_w + 200), 240)
    im_pixel_av = im_sheet.crop(pixel_face).resize((256, 256), Image.Resampling.LANCZOS)
    im_pixel_av.save(os.path.join(OUT_AVATARS, "avatar_pixel.jpg"), quality=95)
    print("Extracted Trampa, Calibre, Pixel portraits and avatars")

# 3. Extract Background and Table
bg_menu = os.path.join(RAW_DIR, "media_1792042552941.jpg")
if os.path.exists(bg_menu):
    im_menu = Image.open(bg_menu)
    im_menu.save(os.path.join(OUT_BG, "bg_menu_full.jpg"), quality=95)

assets_board = os.path.join(RAW_DIR, "media_1792042553108.jpg")
if os.path.exists(assets_board):
    im_ab = Image.open(assets_board)
    bw, bh = im_ab.size
    print(f"Asset board size: {bw}x{bh}")
    # Crop bar scenario (top left: 01. CENARIOS)
    # The bar scenario is around x: 12..150, y: 88..205
    bar_scene = im_ab.crop((12, 88, 153, 205)).resize((1024, 600), Image.Resampling.LANCZOS)
    bar_scene.save(os.path.join(OUT_BG, "bg_last_chip_main.jpg"), quality=95)
    
    # Table (02. MESA): around x: 370..640, y: 95..205
    table_crop = im_ab.crop((370, 95, 640, 205)).resize((800, 340), Image.Resampling.LANCZOS)
    table_crop.save(os.path.join(OUT_TABLE, "table_top.png"), quality=95)

# 4. Extract Card Back from Deck sheet (media_1792042553177.jpg)
deck_sheet = os.path.join(RAW_DIR, "media_1792042553177.jpg")
if os.path.exists(deck_sheet):
    im_ds = Image.open(deck_sheet)
    dw, dh = im_ds.size
    print(f"Deck sheet size: {dw}x{dh}")
    # Card back is in the bottom right corner: x: 880..990, y: 575..660
    card_back = im_ds.crop((880, 575, 990, 660)).resize((300, 420), Image.Resampling.LANCZOS)
    card_back.save(os.path.join(OUT_CARDS, "card_back_main.png"), quality=95)
    print("Extracted card_back_main")

print("Asset extraction complete!")
