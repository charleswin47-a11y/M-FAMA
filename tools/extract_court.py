import os
from PIL import Image

OUT_COURT = "assets/art/characters/court"
os.makedirs(OUT_COURT, exist_ok=True)

court_sheet = "assets/art/raw/media_1792042553023.jpg"
if os.path.exists(court_sheet):
    im = Image.open(court_sheet)
    W, H = im.size # 1024 x 682
    col_w = W / 4.0
    
    # 4 columns:
    # 0: Dona Trambique (Ouros)
    # 1: Migue (Copas)
    # 2: Madruga (Espadas)
    # 3: Pombo de Guerra (Paus)
    names = ["dona_trambique_ouros", "migue_copas", "madruga_espadas", "pombo_de_guerra_paus"]
    for i, name in enumerate(names):
        x1 = int(i * col_w + 10)
        x2 = int((i + 1) * col_w - 10)
        # Main upper illustration
        crop_fig = im.crop((x1, 130, x2, 420)).resize((400, 500), Image.Resampling.LANCZOS)
        crop_fig.save(os.path.join(OUT_COURT, f"{name}.jpg"), quality=95)
    print("Court figures extracted!")
