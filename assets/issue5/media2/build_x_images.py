"""Xの画像なし投稿用の画像を spec-x.json から作る。build_instagram_batch.py の描画をそのまま使い、出力先だけ x/ に変える。
画像に日付は入れない。出力：media2/x/x-<投稿ID先頭8桁>_instagram_0N.png
使い方：python build_x_images.py [投稿ID ...]
"""
import json, sys
from pathlib import Path
from PIL import Image
import build_instagram_batch as b

HERE = Path(__file__).resolve().parent
OUT = HERE / "x"; OUT.mkdir(exist_ok=True)
b.OUT = OUT

# 矢印のない選択肢の図（順番や変換に見えないように）。4個以上は2列の格子にする
_orig_motif = b.motif
def motif(im, draw, spec, accent):
    kind, _, arg = spec.partition(":")
    if kind != "choices":
        return _orig_motif(im, draw, spec, accent)
    parts = arg.split("|")
    b.card(draw, "説明図 / 画面表示ではありません")
    cols = 2 if len(parts) >= 4 else len(parts)
    rows = (len(parts) + cols - 1) // cols
    gap = 30
    width = (b.CARD[2] - b.CARD[0] - 100 - gap * (cols - 1)) // cols
    height = 120
    top = 760 + (350 - rows * height - (rows - 1) * gap) // 2
    for i, label in enumerate(parts):
        x = b.CARD[0] + 50 + (i % cols) * (width + gap)
        y = top + (i // cols) * (height + gap)
        b.base.rounded(draw, (x, y, x + width, y + height), b.base.PAPER, b.base.LINE, 14, 2)
        fnt = b.base.font(40 if len(label) <= 6 else 32)
        tw = draw.textlength(label, font=fnt)
        draw.text((x + (width - tw) / 2, y + (height - 48) / 2), label, font=fnt, fill=b.base.NAVY)
b.motif = motif
SPEC = json.loads((HERE / "spec-x.json").read_text(encoding="utf-8"))["x"]
wanted = set(sys.argv[1:])
for pid, cfg in SPEC.items():
    if wanted and pid not in wanted: continue
    paths = [b.make_slide("x-" + pid, cfg, i, s) for i, s in enumerate(cfg["slides"], 1)]
    sheet = Image.new("RGB", (300 * len(paths), 375), "white")
    for n, p in enumerate(paths):
        with Image.open(p) as s: sheet.paste(s.resize((300, 375), Image.Resampling.LANCZOS), (n * 300, 0))
    sheet.save(OUT / f"x-{pid}_contact.jpg", quality=88)
    print(pid, len(paths))
