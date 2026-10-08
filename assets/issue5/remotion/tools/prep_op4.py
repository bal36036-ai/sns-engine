"""案4の代案「同じ輪郭、穴は逆。」の部材と照合用の図を、AIの絵ではなく、ここで正確に描く（2026-10-09 ChatGPT代案、ばる「いいよ」）。
- 外周は同じ形（右上の角を斜めに切り、左下に切り欠き）。向き・基準線も同じ。
- 穴は、部材が左側、図が右側（左右反転の一つに固定）。穴の位置の違いが、数字を読まなくても目で分かる。
出力：genba-remotion/public/scene/op/op4_part.png・op4_draw.png
"""
import os
from PIL import Image, ImageDraw, ImageFilter

OUT = r"C:\Users\sdk_y\Projects\genba-remotion\public\scene\op"
K = 4  # 4倍で描いて縮める（ふちをなめらかに）
W, H = 440, 260  # 描く大きさ（1080角の画面の画素）
PAD = 30

# 外周（図の座標、左上が原点）。右上の角を斜めに切り、左下に切り欠き。
OUTLINE = [(0, 0), (330, 0), (400, 70), (400, 220), (70, 220), (70, 170), (0, 170)]
HOLES_PART = [(75, 50), (75, 120)]  # 部材：左側
HOLES_DRAW = [(325, 110), (325, 180)]  # 図：右側（外周の内側）
R = 17


def sc(pts, ox=PAD, oy=PAD):
    return [((x + ox) * K, (y + oy) * K) for x, y in pts]


def part():
    img = Image.new("RGBA", ((W + PAD) * K, (H + PAD) * K), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # 影
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).polygon(sc(OUTLINE, PAD + 8, PAD + 12), fill=(0, 0, 0, 120))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10 * K / 2)))
    # 鋼板（縦のグラデーション）
    plate = Image.new("RGBA", img.size, (0, 0, 0, 0))
    pd = ImageDraw.Draw(plate)
    top, bot = (170, 178, 188), (110, 118, 128)
    for y in range(PAD * K, (PAD + 222) * K):
        t = (y - PAD * K) / (222 * K)
        pd.line([(0, y), (img.width, y)], fill=tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)) + (255,))
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).polygon(sc(OUTLINE), fill=255)
    img.paste(plate, (0, 0), mask)
    d = ImageDraw.Draw(img)
    d.line(sc(OUTLINE + [OUTLINE[0]]), fill=(70, 78, 90, 255), width=5 * K // 2, joint="curve")
    # 上の縁のハイライト
    d.line(sc([(2, 3), (330, 3), (398, 71)]), fill=(225, 230, 236, 200), width=2 * K)
    # 穴（向こう側の机の色が見える）
    for (hx, hy) in HOLES_PART:
        cx, cy = (hx + PAD) * K, (hy + PAD) * K
        d.ellipse([cx - R * K, cy - R * K, cx + R * K, cy + R * K], fill=(58, 62, 70, 255), outline=(60, 66, 76, 255), width=3 * K)
        d.arc([cx - R * K + 3 * K, cy - R * K + 3 * K, cx + R * K - 3 * K, cy + R * K - 3 * K], 200, 320, fill=(235, 238, 242, 255), width=3 * K)
    return img.resize((W + PAD, H + PAD), Image.LANCZOS)


def draw():
    img = Image.new("RGBA", ((W + PAD) * K, (H + PAD) * K), (0, 0, 0, 0))
    # 紙（外周より一回り大きい）
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rectangle([8 * K, 14 * K, (W + 22) * K, (H + 24) * K], fill=(0, 0, 0, 110))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(9 * K / 2)))
    d = ImageDraw.Draw(img)
    d.rectangle([4 * K, 6 * K, (W + 14) * K, (H + 16) * K], fill=(250, 248, 242, 255), outline=(205, 198, 186, 255), width=2 * K)
    blue = (40, 90, 190, 255)
    d.line(sc(OUTLINE + [OUTLINE[0]]), fill=blue, width=4 * K, joint="curve")
    for (hx, hy) in HOLES_DRAW:
        cx, cy = (hx + PAD) * K, (hy + PAD) * K
        d.ellipse([cx - R * K, cy - R * K, cx + R * K, cy + R * K], outline=blue, width=4 * K)
        d.line([(cx - (R + 9) * K, cy), (cx + (R + 9) * K, cy)], fill=blue, width=2 * K)
        d.line([(cx, cy - (R + 9) * K), (cx, cy + (R + 9) * K)], fill=blue, width=2 * K)
    # 基準線（部材と同じ位置・同じ向き）
    for x in range(0, 400, 16):
        d.line(sc([(x, 238), (x + 8, 238)]), fill=(120, 150, 210, 255), width=2 * K)
    return img.resize((W + PAD, H + PAD), Image.LANCZOS)


os.makedirs(OUT, exist_ok=True)
part().save(os.path.join(OUT, "op4_part.png"))
draw().save(os.path.join(OUT, "op4_draw.png"))
a, b = Image.open(os.path.join(OUT, "op4_part.png")), Image.open(os.path.join(OUT, "op4_draw.png"))
s = Image.new("RGB", (a.width + b.width + 40, a.height + 20), (150, 150, 150))
s.paste(a, (10, 10), a)
s.paste(b, (a.width + 30, 10), b)
s.save(os.path.join(os.environ["TEMP"], "chk1026", "op4-sprites.png"))
print(a.size, b.size)
