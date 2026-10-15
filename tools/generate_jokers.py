import os
from PIL import Image, ImageDraw, ImageFont

jokers_dir = 'assets/art/cards/jokers'
os.makedirs(jokers_dir, exist_ok=True)

jokers = [
    { "id": "joker_trapaceiro", "name": "O TRAPACEIRO", "desc": "Dois Pares dão +40 Fichas e +4 Mult", "badge": "+40 / +4", "accent": (185, 119, 50) },
    { "id": "joker_sangue_frio", "name": "SANGUE FRIO", "desc": "Sequência ganha x2 Mult", "badge": "X2 MULT", "accent": (74, 38, 58) },
    { "id": "joker_dona_trambique", "name": "DONA TRAMBIQUE", "desc": "Cartas de Ouros pontuadas dão +5 Mult", "badge": "♦ +5 MULT", "accent": (212, 160, 23) },
    { "id": "joker_pombo_de_guerra", "name": "POMBO DE GUERRA", "desc": "+60 Fichas em mãos de 3 cartas ou menos", "badge": "+60 FICHAS", "accent": (36, 82, 71) },
    { "id": "joker_dedo_de_gesso", "name": "DEDO DE GESSO", "desc": "Trinca ou Full House ganham +8 Mult", "badge": "+8 MULT", "accent": (90, 70, 110) },
    { "id": "joker_cafajeste", "name": "O CAFAJESTE", "desc": "+4 Mult base para todas as mãos", "badge": "+4 MULT", "accent": (140, 40, 40) },
    { "id": "joker_madruga", "name": "MADRUGA SINISTRO", "desc": "Cartas de Espadas dão +25 Fichas", "badge": "♠ +25 FICHAS", "accent": (73, 56, 91) },
    { "id": "joker_agiota", "name": "O AGIOTA", "desc": "Receba +$3 de bônus por rodada vencida", "badge": "+$3 CAIXA", "accent": (46, 125, 50) },
    { "id": "joker_migue", "name": "MIGUÉ DO COPAS", "desc": "Cartas de Copas dão +20 Fichas e +2 Mult", "badge": "♥ +20 / +2", "accent": (180, 40, 60) },
    { "id": "joker_coronel", "name": "O CORONEL", "desc": "x3 Mult se jogado na última mão da rodada", "badge": "X3 CLUTCH", "accent": (130, 20, 20) }
]

w, h = 661, 955

try:
    font_title = ImageFont.truetype("arialbd.ttf", 36)
    font_desc = ImageFont.truetype("arial.ttf", 26)
    font_badge = ImageFont.truetype("arialbd.ttf", 42)
    font_sub = ImageFont.truetype("arial.ttf", 24)
except Exception:
    font_title = ImageFont.load_default()
    font_desc = font_title
    font_badge = font_title
    font_sub = font_title

for j in jokers:
    card = Image.new("RGBA", (w, h), (20, 16, 26, 255))
    draw = ImageDraw.Draw(card)
    
    # Outer dark gold border
    draw.rounded_rectangle([15, 15, w-15, h-15], radius=28, outline=(197, 160, 89, 255), width=6)
    draw.rounded_rectangle([25, 25, w-25, h-25], radius=22, outline=(60, 45, 75, 255), width=3)
    
    # Inner parchment/felt card body
    draw.rounded_rectangle([35, 35, w-35, h-35], radius=18, fill=(28, 22, 36, 255))
    
    # Header tag
    draw.rectangle([35, 50, w-35, 120], fill=(15, 12, 20, 255))
    draw.text((w//2, 85), "CORINGA DO SUBMUNDO", fill=(197, 160, 89, 255), font=font_sub, anchor="mm")
    
    # Central emblem / portrait box
    box_top, box_bot = 140, 560
    draw.rounded_rectangle([70, box_top, w-70, box_bot], radius=16, fill=(18, 14, 24, 255), outline=j["accent"], width=4)
    
    # Badge banner inside box
    draw.rounded_rectangle([100, 310, w-100, 400], radius=12, fill=j["accent"])
    draw.text((w//2, 355), j["badge"], fill=(255, 255, 255, 255), font=font_badge, anchor="mm")
    
    # Name bar
    draw.rectangle([50, 590, w-50, 670], fill=(15, 12, 20, 255))
    draw.text((w//2, 630), j["name"], fill=(255, 235, 180, 255), font=font_title, anchor="mm")
    
    # Description box
    draw.rounded_rectangle([60, 690, w-60, 870], radius=14, fill=(35, 28, 45, 255), outline=(197, 160, 89, 120), width=2)
    
    # Text wrap for description
    words = j["desc"].split(" ")
    lines = []
    cur = ""
    for wrd in words:
        test = cur + (" " if cur else "") + wrd
        bbox = draw.textbbox((0, 0), test, font=font_desc)
        if bbox[2] - bbox[0] < (w - 160):
            cur = test
        else:
            lines.append(cur)
            cur = wrd
    if cur:
        lines.append(cur)
        
    line_y = 745
    for l in lines:
        draw.text((w//2, line_y), l, fill=(230, 220, 240, 255), font=font_desc, anchor="mm")
        line_y += 38
        
    # Card footer
    draw.text((w//2, 905), "MÁ FAMA • ROGUELIKE", fill=(197, 160, 89, 180), font=font_sub, anchor="mm")
    
    out_file = os.path.join(jokers_dir, f"{j['id']}.png")
    card.save(out_file, "PNG")
    print(f"Created {out_file}")

print("All Joker cards created.")
