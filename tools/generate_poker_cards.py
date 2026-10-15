import os
from PIL import Image, ImageDraw, ImageFont

suits = ['clubs', 'diamonds', 'hearts', 'spades']
suit_colors = {
    'clubs': (36, 82, 71, 255),       # Deep vintage green
    'diamonds': (185, 119, 50, 255),  # Vintage gold/amber
    'hearts': (116, 38, 58, 255),     # Deep wine red
    'spades': (73, 56, 91, 255)       # Noir purple
}

suit_symbols = {
    'clubs': '♣',
    'diamonds': '♦',
    'hearts': '♥',
    'spades': '♠'
}

faces_dir = 'assets/art/cards/faces'
os.makedirs(faces_dir, exist_ok=True)

# Load base template from 6 of the same suit to get background and borders
for s in suits:
    template_path = os.path.join(faces_dir, f'6_{s}.png')
    if not os.path.exists(template_path):
        template_path = os.path.join(faces_dir, f'7_{s}.png')
    
    base_img = Image.open(template_path).convert('RGBA')
    w, h = base_img.size

    # Extract central pip or symbol
    # In a 6 or 4 card, pips are located at distinct coords
    # We can also load or render crisp pips
    for rank in ['8', '9', '10']:
        out_path = os.path.join(faces_dir, f'{rank}_{s}.png')
        if os.path.exists(out_path):
            continue
        
        # Create a copy of base card (keeps identical vintage card border, parchment texture, inner lines)
        card = base_img.copy()
        draw = ImageDraw.Draw(card)
        
        # Clear the inner area with the parchment tone to redraw custom pips & corner numbers
        # Let's sample parchment background color near (w//2, h//2)
        # To preserve texture, we can clone a blank parchment patch or cover the center pips
        # Let's inspect the center
        # For top-left corner index (rank + suit):
        # We replace top-left and bottom-right indices
        # Let's use standard fonts or clean serif rendering
        try:
            font_rank = ImageFont.truetype("arial.ttf", 64)
            font_suit = ImageFont.truetype("arial.ttf", 48)
            font_pip = ImageFont.truetype("arial.ttf", 72)
        except Exception:
            font_rank = ImageFont.load_default()
            font_suit = font_rank
            font_pip = font_rank
            
        # Parchment fill for center rect (approx bounds: x from 120 to w-120, y from 130 to h-130)
        # Sample parchment tone:
        parchment_color = (235, 228, 212, 255)
        
        # Smoothly blank out center area
        draw.rectangle([120, 140, w - 120, h - 140], fill=parchment_color)
        # Blank out corner numbers:
        draw.rectangle([35, 35, 115, 135], fill=parchment_color)
        draw.rectangle([w - 115, h - 135, w - 35, h - 35], fill=parchment_color)
        
        col = suit_colors[s]
        sym = suit_symbols[s]
        
        # Top-left corner
        draw.text((45, 40), rank, fill=col, font=font_rank)
        draw.text((48, 105), sym, fill=col, font=font_suit)
        
        # Bottom-right corner (rotated or drawn)
        draw.text((w - 95 if rank != '10' else w - 110, h - 120), rank, fill=col, font=font_rank)
        draw.text((w - 85, h - 60), sym, fill=col, font=font_suit)
        
        # Pip distribution for 8, 9, 10
        # 8: 2 cols x 3 rows + 2 center
        # 9: 2 cols x 4 rows + 1 center
        # 10: 2 cols x 4 rows + 2 center
        col_left = w * 0.33
        col_right = w * 0.67
        col_mid = w * 0.5
        
        if rank == '8':
            ys = [h * 0.22, h * 0.42, h * 0.62, h * 0.82]
            pips = [
                (col_left, ys[0]), (col_right, ys[0]),
                (col_mid, h * 0.32),
                (col_left, ys[2]), (col_right, ys[2]),
                (col_mid, h * 0.72),
                (col_left, ys[1]), (col_right, ys[1])
            ]
        elif rank == '9':
            pips = [
                (col_left, h * 0.22), (col_right, h * 0.22),
                (col_left, h * 0.40), (col_right, h * 0.40),
                (col_mid, h * 0.52),
                (col_left, h * 0.64), (col_right, h * 0.64),
                (col_left, h * 0.82), (col_right, h * 0.82)
            ]
        else: # 10
            pips = [
                (col_left, h * 0.20), (col_right, h * 0.20),
                (col_mid, h * 0.31),
                (col_left, h * 0.42), (col_right, h * 0.42),
                (col_left, h * 0.62), (col_right, h * 0.62),
                (col_mid, h * 0.73),
                (col_left, h * 0.84), (col_right, h * 0.84)
            ]
            
        for px, py in pips:
            # Draw symbol centered
            bbox = draw.textbbox((0, 0), sym, font=font_pip)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            draw.text((px - tw/2, py - th/2), sym, fill=col, font=font_pip)
            
        card.save(out_path, "PNG")
        print(f"Generated {out_path}")

print("All poker cards (8, 9, 10) generated successfully.")
