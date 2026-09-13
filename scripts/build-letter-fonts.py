"""Download OFL fonts from Google Fonts and package local WOFF2 copies."""
from pathlib import Path
from urllib.request import urlopen
from urllib.parse import quote
from io import BytesIO
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset

root = Path(__file__).resolve().parents[1] / 'assets' / 'fonts'
items = [
    ('notosanskr', 'NotoSansKR[wght].ttf', 'letter-sans'),
    ('gowundodum', 'GowunDodum-Regular.ttf', 'letter-round'),
    ('gowunbatang', 'GowunBatang-Regular.ttf', 'letter-serif'),
    ('nanumpenscript', 'NanumPenScript-Regular.ttf', 'letter-pen'),
]
for folder, filename, output in items:
    base = 'https://raw.githubusercontent.com/google/fonts/main/ofl/' + folder + '/'
    font = TTFont(BytesIO(urlopen(base + quote(filename), timeout=60).read()))
    if 'fvar' in font:
        font = instantiateVariableFont(font, {'wght': 400}, inplace=True)
        # Full modern Hangul, Jamo, Latin, punctuation and symbols; no 10 MB pan-CJK download.
        sub = subset.Subsetter()
        sub.populate(unicodes=list(range(0x20,0x250))+list(range(0x1100,0x1200))+list(range(0x2000,0x3300))+list(range(0xAC00,0xD7B0))+list(range(0xFF00,0xFFF0)))
        sub.subset(font)
    font.flavor = 'woff2'
    font.save(root / (output + '.woff2'))
    license_text = urlopen(base + 'OFL.txt', timeout=60).read().decode('utf-8')
    (root / (output + '-OFL.txt')).write_text('\n'.join(line.rstrip() for line in license_text.splitlines())+'\n', encoding='utf-8')
    print(output, (root / (output + '.woff2')).stat().st_size)
