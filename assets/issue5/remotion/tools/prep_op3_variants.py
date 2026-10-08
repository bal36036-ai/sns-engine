"""案3の改善版：Codexで作った表情の差分（シーン/op3v_*.png）を、元の絵（op3_bg.png）に位置合わせして、頭の部分だけを重ねる透明PNG（op3p_*.png、1080角）にする。
- 位置合わせ：全体を縮小して、倍率と位置を総当たりで探す（AIの絵は、同じ構図を頼んでも、わずかにずれることがあるため）。
- 重ねる範囲：新人の頭（左）／設計の頭（右）。ふちはぼかして、元の絵となじませる。
出力：genba-remotion/public/scene/op/op3p_<名前>.png と、確認用の並び画像
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "シーン")
OUT = r"C:\Users\sdk_y\Projects\genba-remotion\public\scene\op"
N = 1080
# 頭の範囲（1080角の画素）。新人＝左、設計＝右。首から下は元の絵のまま
HEAD = {"c": (20, 0, 520, 400), "p": (520, 0, 1050, 400)}
WHO = {"p_notice": "p", "p_sorry": "p", "c_relief": "c"}


def load(path):
    return Image.open(path).convert("RGB").resize((N, N), Image.LANCZOS)


def small(im, s=135):
    return np.asarray(im.convert("L").resize((s, s), Image.LANCZOS)).astype(np.float32)


def align(base, var, box):
    """var を base に重ねるための（倍率, dx, dy）を総当たりで探す。比べる範囲は、頭の下の胴体〜机のふち（頭の表情に左右されにくい所）。"""
    x0, y0, x1, y1 = box
    ref = small(base)
    best = (1e18, 1.0, 0, 0)
    for sc in np.arange(0.97, 1.031, 0.01):
        w = int(N * sc)
        v = var.resize((w, w), Image.LANCZOS)
        for dy in range(-16, 17, 4):
            for dx in range(-16, 17, 4):
                canvas = Image.new("RGB", (N, N), (0, 0, 0))
                canvas.paste(v, ((N - w) // 2 + dx, (N - w) // 2 + dy))
                a = small(canvas)
                # 胴体〜机のふち（y 330〜470）を、頭の左右の幅で比べる
                sl = (slice(int(330 / N * 135), int(470 / N * 135)), slice(int(x0 / N * 135), int(x1 / N * 135)))
                e = float(np.mean((a[sl] - ref[sl]) ** 2))
                if e < best[0]:
                    best = (e, sc, dx, dy)
    return best


def main():
    os.makedirs(OUT, exist_ok=True)
    base = load(os.path.join(SRC, "op3_bg.png"))
    names = sys.argv[1:] or [n for n in WHO if os.path.exists(os.path.join(SRC, f"op3v_{n}.png"))]
    tiles = []
    for name in names:
        var = load(os.path.join(SRC, f"op3v_{name}.png"))
        box = HEAD[WHO[name]]
        e, sc, dx, dy = align(base, var, box)
        w = int(N * sc)
        canvas = Image.new("RGB", (N, N))
        canvas.paste(var.resize((w, w), Image.LANCZOS), ((N - w) // 2 + dx, (N - w) // 2 + dy))
        # 頭の範囲だけ（ふちをぼかす）。下は、首の少し下で消える
        mask = Image.new("L", (N, N), 0)
        x0, y0, x1, y1 = box
        mask.paste(255, (x0 + 30, 0, x1 - 30, y1 - 40))
        mask = mask.filter(ImageFilter.GaussianBlur(26))
        out = canvas.convert("RGBA")
        out.putalpha(mask)
        out.save(os.path.join(OUT, f"op3p_{name}.png"))
        prev = base.copy()
        prev.paste(canvas, (0, 0), mask)
        tiles.append(prev.resize((400, 400)))
        print(f"{name}: 倍率{sc:.2f} ずれ({dx},{dy}) 誤差{e:.1f}")
    if tiles:
        s = Image.new("RGB", (400 * (len(tiles) + 1), 400), "white")
        s.paste(base.resize((400, 400)), (0, 0))
        for k, t in enumerate(tiles):
            s.paste(t, (400 * (k + 1), 0))
        s.save(os.path.join(os.environ["TEMP"], "chk1026", "op3-variants.png"))


if __name__ == "__main__":
    main()
