from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "art" / "home-share-v2-bg.png"
OUTPUT = ROOT / "og" / "og-home-v2.png"

WIDTH, HEIGHT = 1200, 630
INK = "#3f2c25"
MUTED = "#8d756b"
CORAL = "#ef6a5b"
PILL_BG = "#fffaf5"
PILL_LINE = "#ead8cd"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


canvas = ImageOps.fit(Image.open(SOURCE).convert("RGB"), (WIDTH, HEIGHT), method=Image.Resampling.LANCZOS)
draw = ImageDraw.Draw(canvas)
regular = "C:/Windows/Fonts/malgun.ttf"
bold = "C:/Windows/Fonts/malgunbd.ttf"

brand_font = font(bold, 32)
headline_font = font(bold, 58)
chip_font = font(bold, 23)
note_font = font(regular, 25)

draw.text((66, 54), "같이놀자", font=brand_font, fill=INK)
brand_width = draw.textbbox((66, 54), "같이놀자", font=brand_font)[2] - 66
heart_x, heart_y = 66 + brand_width + 16, 64
draw.text((heart_x - 4, heart_y - 14), "♥", font=font("C:/Windows/Fonts/arialbd.ttf", 40), fill=CORAL)

draw.text((66, 165), "마음을 전하고,", font=headline_font, fill=INK)
draw.text((66, 243), "같이 웃는 곳.", font=headline_font, fill=INK)
draw.text((68, 345), "소중한 사람과, 조금 더 가까이.", font=note_font, fill=MUTED)

chips = [("마음 전하기", 168), ("나랑 한판", 142), ("심리테스트", 158)]
x, y = 66, 425
for label, chip_width in chips:
    draw.rounded_rectangle((x, y, x + chip_width, y + 58), radius=29, fill=PILL_BG, outline=PILL_LINE, width=2)
    box = draw.textbbox((0, 0), label, font=chip_font)
    text_width = box[2] - box[0]
    text_height = box[3] - box[1]
    draw.text((x + (chip_width - text_width) / 2, y + (58 - text_height) / 2 - box[1]), label, font=chip_font, fill=CORAL)
    x += chip_width + 12

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(OUTPUT, optimize=True)
print(OUTPUT)
