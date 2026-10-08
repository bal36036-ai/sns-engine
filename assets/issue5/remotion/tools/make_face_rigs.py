"""キャラクターのポーズに、口パク・まばたき用の差分（口を半分／大きく開けた顔、目を閉じた顔）を付ける。
2026-10-08 ばる「もっと自然な動きで」「できたら見せて」。職人黒シュナ/gen_face_variants.py・align_face_variants.py を、どのキャラ・どのポーズでも使えるようにしたもの。
1) Codex の画像生成（編集）で、元の絵と同じで顔だけ違う3枚を作る（ChatGPTの利用枠。追加の支払いなし）
2) 元の絵にぴったり重なるようにそろえ、口と目の位置を、変わり方が大きい場所から求める
3) genba-remotion/public/rig/<キャラ>/<ポーズ>/ に base.png・mouth_half.png・mouth_open.png・eyes_closed.png・rig.json を置く（縁の緑も消す）
使い方：python make_face_rigs.py <キャラのフォルダ>/<ポーズ>.png [...]   例：python make_face_rigs.py 現場監督_柴犬/s1-1.png
       --align-only … 生成はせず、そろえる処理だけやり直す
"""
import glob, json, os, shutil, sys
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "..", "LINE絵文字")))
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding="utf-8")
    except Exception: pass
import intake  # noqa: E402

MODEL = os.environ.get("LINE_EMOJI_CODEX_MODEL", "gpt-6.1-sol")
GENIMG = os.path.join(os.path.expanduser("~"), ".codex", "generated_images")
PUBLIC = "C:/Users/sdk_y/Projects/genba-remotion/public/rig"
IDS = {"職人黒シュナ": "shuna", "現場監督_柴犬": "kantoku", "設計_トイプードル": "sekkei", "新人_コーギー": "shinjin"}
VARIANTS = {
    "mouth_half": "the mouth is HALF OPEN as if in the middle of saying a word (small open mouth, a little tongue visible)",
    "mouth_open": "the mouth is WIDE OPEN as if saying 'ah' while talking (tongue visible)",
    "eyes_closed": "both eyes are gently CLOSED as in the middle of a blink (curved eyelid lines); keep the mouth exactly as it is",
}
PAD, UP = 60, 2


def generate(work, label):
    import codex_thread
    for k, desc in VARIANTS.items():
        tgt = os.path.join(work, f"{k}.png")
        if os.path.exists(tgt): continue
        pr = (f"【げんばアプリ工房】{label}：顔の差分「{k}」を作る（make_face_rigs.py）\n\n"
              f"Use the built-in image_gen tool to EDIT the image {work}\\base.png (load it with view_image first and pass it to image_gen as the image to edit).\n"
              "Make an image that is IDENTICAL to base.png: same canvas size, same pure green (#00FF00) background, same dog, same pose, same position, "
              "same scale, same hat, same clothes, same props, same lighting, same art style. Change ONLY the face: " + desc + ".\n"
              "Do not move, resize, crop or redraw anything else. No text.\n"
              f"Then copy the generated image into {work} as {k}.png, and finish by printing the output path and anything that failed. "
              "Do not create, edit or delete files anywhere else.\n")
        print(f"{label} {k}: 生成中…", flush=True)
        ok, msg, tid, log = codex_thread.run_turn(work, pr, MODEL, name=f"【げんばアプリ工房】{label} 顔の差分 {k}", timeout=900, effort="high")
        open(os.path.join(work, f"log_{k}.txt"), "w", encoding="utf-8").write(f"ok={ok} thread={tid}\n{msg}\n---\n{log}")
        if not os.path.exists(tgt):
            found = sorted(glob.glob(os.path.join(GENIMG, str(tid), "*.png")), key=os.path.getmtime)
            if found: shutil.copy(found[-1], tgt)
        print("  →", "できました" if os.path.exists(tgt) else "できませんでした", flush=True)


def bbox(alpha):
    ys, xs = np.where(alpha > 40)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def place(v, s, dx, dy, W, H):
    im = Image.fromarray(v.astype(np.uint8))
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    cv = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cv.paste(im, (dx, dy), im)
    return np.array(cv).astype(float)


def despill(a):
    a = a.astype(int)
    band = ndimage.binary_dilation(a[..., 3] < 128, iterations=12) & (a[..., 3] > 0)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    lim = (r + b) // 2 + 6
    spill = band & (g > lim) & (g > b + 12)
    a[..., 1] = np.where(spill, lim, g)
    return a.astype(np.uint8)


def hot_region(P, B, head_bottom, top_frac, top=0):
    """差分のうち変わり方が大きい場所（上位 top_frac）の外接矩形。top〜head_bottom の高さだけを見る"""
    diff = np.abs(P[..., :3] - B[..., :3]).mean(axis=2) * (B[..., 3] > 200) * (P[..., 3] > 200)
    diff[head_bottom:] = 0
    diff[:top] = 0
    d = ndimage.gaussian_filter(diff, 2)
    vals = d[d > 0]
    if not len(vals): return None
    thr = max(25, np.quantile(vals, 1 - top_frac))
    m = d > thr
    lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=3))
    if not n: return None
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i in np.argsort(sizes)[::-1][:2]])  # 大きい2つ（目なら左右）
    ys, xs = np.where(keep & m)
    return [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)]


def align(pose_path, work, out):
    base = Image.open(pose_path).convert("RGBA")
    W, H = base.size
    B = np.array(base).astype(float)
    bx0, by0, bx1, by1 = bbox(B[..., 3])
    os.makedirs(out, exist_ok=True)
    Image.fromarray(despill(B)).save(os.path.join(out, "base.png"))
    res = {"size": [W, H]}
    lower = slice(int(H * 0.5), H)
    for k in VARIANTS:
        p = os.path.join(work, f"{k}.png")
        if not os.path.exists(p): print("  なし:", k); return None
        v = intake.remove_bg(Image.open(p)).astype(float)
        vx0, vy0, vx1, vy1 = bbox(v[..., 3])
        s0 = (by1 - by0) / (vy1 - vy0)
        best = None
        for ds in np.linspace(-0.03, 0.03, 13):
            s = s0 * (1 + ds)
            for ox in range(-6, 7, 2):
                for oy in range(-6, 7, 2):
                    dx = round(bx0 - vx0 * s) + ox; dy = round(by0 - vy0 * s) + oy
                    P = place(v, s, dx, dy, W, H)
                    m = (B[lower][..., 3] > 200) & (P[lower][..., 3] > 200)
                    if m.sum() < 1000: continue
                    err = np.abs(P[lower][..., :3] - B[lower][..., :3])[m].mean()
                    if best is None or err < best[0]: best = (err, s, dx, dy)
        err, s, dx, dy = best
        P = place(v, s, dx, dy, W, H)
        Image.fromarray(despill(P)).save(os.path.join(out, f"{k}.png"))
        res[k] = {"err": round(float(err), 2), "P": P}
    mo = hot_region(res["mouth_open"]["P"], B, int(H * 0.5), 0.012)
    # 目は、口より上の帯（眉は描き直されやすいので、その下）だけで探す
    # 目を閉じた差分では眉も描き直されるので、眉と目をまとめて差し替える（口より上の範囲）
    ey = hot_region(res["eyes_closed"]["P"], B, int(mo[1] - H * 0.025), 0.06, top=int(mo[1] - H * 0.2))
    neck = min(int(H * 0.55), mo[3] + 16)
    rig = {"size": [W, H], "neckY": neck, "pivot": [int((mo[0] + mo[2]) / 2), neck - 8],
           "mouth": {"half": "mouth_half.png", "open": "mouth_open.png", "region": mo},
           "eyes": {"closed": "eyes_closed.png", "region": ey}, "align": {k: res[k]["err"] for k in VARIANTS}}
    json.dump(rig, open(os.path.join(out, "rig.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return rig


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    only_align = "--align-only" in sys.argv
    for rel in args:
        folder, pose = rel.replace("\\", "/").split("/")
        name = pose[:-4]
        pose_path = os.path.join(HERE, folder, "poses", pose)
        work = os.path.join(HERE, folder, "_face", name)
        os.makedirs(work, exist_ok=True)
        if not os.path.exists(os.path.join(work, "base.png")):
            im = Image.open(pose_path).convert("RGBA")
            cv = Image.new("RGBA", (im.width + 2 * PAD, im.height + 2 * PAD), (0, 255, 0, 255))
            cv.alpha_composite(im, (PAD, PAD))
            cv = cv.convert("RGB")
            cv.resize((cv.width * UP, cv.height * UP), Image.LANCZOS).save(os.path.join(work, "base.png"))
        if not only_align: generate(work, f"{folder} {name}")
        rig = align(pose_path, work, os.path.join(PUBLIC, IDS[folder], name))
        print(f"{folder}/{pose}:", json.dumps(rig, ensure_ascii=False) if rig else "差分がそろっていません", flush=True)


if __name__ == "__main__":
    main()
