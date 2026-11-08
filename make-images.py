# Regenerates the icons and the link-preview image from app/logo-source.png.
# Run once after changing the logo: python make-images.py  (needs Pillow). Outputs go to app/ and are copied by build-app.mjs.
from PIL import Image, ImageDraw, ImageFont

BG, INK, MUTED, LINK = (21, 23, 26), (228, 230, 233), (160, 166, 174), (127, 176, 255)

def square(im):
    im = im.crop(im.getbbox())
    s = max(im.size)
    sq = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    sq.paste(im, ((s - im.size[0]) // 2, (s - im.size[1]) // 2))
    return sq

logo = square(Image.open('app/logo-source.png').convert('RGBA'))
logo.resize((128, 128), Image.LANCZOS).save('app/logo.png', optimize=True)
logo.resize((64, 64), Image.LANCZOS).save('app/favicon.png', optimize=True)
logo.resize((32, 32), Image.LANCZOS).save('app/favicon-32.png', optimize=True)
logo.resize((48, 48), Image.LANCZOS).save('app/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])

# Icons on a solid background (home screens and the web manifest do not like transparency).
def tile(size, pad):
    t = Image.new('RGBA', (size, size), BG + (255,))
    inner = size - 2 * pad
    t.alpha_composite(logo.resize((inner, inner), Image.LANCZOS), (pad, pad))
    return t.convert('RGB')
tile(180, 18).save('app/apple-touch-icon.png', optimize=True)
tile(192, 24).save('app/icon-192.png', optimize=True)
tile(512, 64).save('app/icon-512.png', optimize=True)

# Link preview, 1200x630.
og = Image.new('RGBA', (1200, 630), BG + (255,))
og.alpha_composite(logo.resize((330, 330), Image.LANCZOS), (90, 150))
d = ImageDraw.Draw(og)
bold = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 72)
reg = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 34)
small = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 28)
d.text((470, 160), 'Cathedral', font=bold, fill=INK)
d.text((470, 250), 'Megaten Fusion Calculator', font=reg, fill=INK)
d.text((470, 335), 'Skill planner, party builder,', font=reg, fill=MUTED)
d.text((470, 380), 'fusion chart and recipes', font=reg, fill=MUTED)
d.text((470, 450), '41 games: Shin Megami Tensei, Persona,', font=small, fill=LINK)
d.text((470, 487), 'Devil Summoner, Devil Survivor and more', font=small, fill=LINK)
d.rectangle((0, 610, 1200, 630), fill=LINK)
og.convert('RGB').save('app/og-image.png', optimize=True)
print('images written')
