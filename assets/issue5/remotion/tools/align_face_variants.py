"""顔の差分（_face/*.png）を、元の絵（poses/s1_1-1.png）にぴったり重なるようにそろえ、変わった場所（口・目）を調べる。
出力：rig/base.png・rig/<差分>.png（元の絵と同じ大きさの透過PNG）、rig/rig.json（口・目の位置）
使い方：python align_face_variants.py
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "..", "..", "LINE絵文字")))
import intake  # noqa: E402

PAD, UP = 60, 2
base = Image.open(os.path.join(HERE, "poses", "s1_1-1.png")).convert("RGBA")
W, H = base.size
B = np.array(base).astype(float)
os.makedirs(os.path.join(HERE, "rig"), exist_ok=True)
base.save(os.path.join(HERE, "rig", "base.png"))


def bbox(alpha):
    ys, xs = np.where(alpha > 40)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def place(v, sx, sy, dx, dy):
    """差分の画像 v（RGBA配列）を倍率と位置で、元の絵の大きさ W×H に置く"""
    im = Image.fromarray(v.astype(np.uint8))
    im = im.resize((max(1, round(im.width * sx)), max(1, round(im.height * sy))), Image.LANCZOS)
    cv = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cv.paste(im, (dx, dy), im)
    return np.array(cv).astype(float)


rig = {"size": [W, H], "variants": {}}
bx0, by0, bx1, by1 = bbox(B[..., 3])
for name in ("mouth_half", "mouth_open", "eyes_closed"):
    p = os.path.join(HERE, "_face", f"{name}.png")
    if not os.path.exists(p):
        print(name, "なし"); continue
    v = intake.remove_bg(Image.open(p)).astype(float)
    vx0, vy0, vx1, vy1 = bbox(v[..., 3])
    s0 = (by1 - by0) / (vy1 - vy0)
    best = None
    lower = slice(int(H * 0.5), H)  # 体（下半分）は変わらないはずなので、そこで合わせる
    for ds in np.linspace(-0.03, 0.03, 13):
        s = s0 * (1 + ds)
        for ox in range(-6, 7, 2):
            for oy in range(-6, 7, 2):
                dx = round(bx0 - vx0 * s) + ox; dy = round(by0 - vy0 * s) + oy
                P = place(v, s, s, dx, dy)
                m = (B[lower][..., 3] > 200) & (P[lower][..., 3] > 200)
                if m.sum() < 1000: continue
                err = np.abs(P[lower][..., :3] - B[lower][..., :3])[m].mean()
                if best is None or err < best[0]: best = (err, s, dx, dy)
    err, s, dx, dy = best
    P = place(v, s, s, dx, dy)
    # 変わった場所（頭の部分だけ）
    diff = np.abs(P[..., :3] - B[..., :3]).mean(axis=2) * (B[..., 3] > 200) * (P[..., 3] > 200)
    diff[int(H * 0.5):] = 0
    mask = ndimage.gaussian_filter((diff > 40).astype(float), 3) > 0.25
    lab, n = ndimage.label(mask)
    if n:
        sizes = ndimage.sum(mask, lab, range(1, n + 1))
        keep = np.isin(lab, [i + 1 for i, z in enumerate(sizes) if z > 60])
        ys, xs = np.where(keep)
        region = [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)]
    else:
        region = None
    Image.fromarray(P.astype(np.uint8)).save(os.path.join(HERE, "rig", f"{name}.png"))
    rig["variants"][name] = {"err": round(float(err), 2), "scale": round(float(s), 4), "dx": dx, "dy": dy, "region": region}
    print(name, rig["variants"][name])
json.dump(rig, open(os.path.join(HERE, "rig", "rig.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
