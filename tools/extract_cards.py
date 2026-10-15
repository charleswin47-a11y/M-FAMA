import os
from PIL import Image

OUT_FACES = "assets/art/cards/faces"
os.makedirs(OUT_FACES, exist_ok=True)

deck_sheet_path = "assets/art/raw/media_1792042553177.jpg"
im = Image.open(deck_sheet_path)
W, H = im.size # 1024, 682

# Let's inspect the cards grid:
# On the left, there is a suit label column (x: 0 to ~85)
# Then 10 card columns (x: ~86 to ~995)
# Top has a header (y: 0 to ~8)
# Row 0: Paus (y: ~8 to ~148)
# Row 1: Copas (y: ~150 to ~290)
# Row 2: Espadas (y: ~292 to ~432)
# Row 3: Ouros (y: ~434 to ~574)
# Bottom has footer text (y: ~575 to 682)

# Let us verify the column boundaries:
# Total 10 columns across ~86 to 995 -> width of each card is around 90px, with ~1px gap
# Let's test crop one card and measure
suits = ["clubs", "hearts", "spades", "diamonds"]
ranks = ["4", "5", "6", "7", "q", "j", "k", "a", "2", "3"]

# Precise coordinates measured:
# x starts around 85, end around 995. Total span = 910 px.
# 10 cards -> ~91 px per column. Card width is approx 85 px, gap ~6 px.
x_start = 86
x_span = 910
col_w = x_span / 10.0 # 91.0

# Row y coordinates:
# Row 0 (Paus): y = 8 to 146 (height ~ 138)
# Row 1 (Copas): y = 150 to 288 (height ~ 138)
# Row 2 (Espadas): y = 292 to 430 (height ~ 138)
# Row 3 (Ouros): y = 434 to 572 (height ~ 138)
y_rows = [
    (8, 146),
    (150, 288),
    (292, 430),
    (434, 572)
]

for s_idx, suit in enumerate(suits):
    y1, y2 = y_rows[s_idx]
    for r_idx, rank in enumerate(ranks):
        x1 = int(x_start + r_idx * col_w + 3)
        x2 = int(x1 + col_w - 6)
        card_crop = im.crop((x1, y1, x2, y2)).resize((240, 360), Image.Resampling.LANCZOS)
        out_name = f"{rank}_{suit}.png"
        card_crop.save(os.path.join(OUT_FACES, out_name), quality=95)

print(f"Extracted all 40 cards to {OUT_FACES}!")
