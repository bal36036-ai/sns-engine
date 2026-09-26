"""9/28キリドリ（紙メモと計画画面）の3枚目だけを作り直す（2026-09-26）。

元の3枚目は、見出しが「メモした条件を入力する／定尺と必要な部材」なのに、
図がハリナビ用の「前提条件／対象項目／確認」になっていた。
キリドリの入力項目「定尺／部材と本数／刃幅」の図に差し替え、
20260928_instagram_03-v2.png として別名で書き出す（元の画像と build_carousels.py は変更しない）。
"""

import shutil
import tempfile
from pathlib import Path

import build_carousels as base

ROOT = Path(__file__).resolve().parent
original_icon = base.icon


def icon(draw, kind, accent):
    if kind != "kiridori_inputs":
        return original_icon(draw, kind, accent)
    # 元の「conditions」と同じ枠・配置・寸法で、ラベルだけキリドリの入力項目にする
    left, top, right, bottom = 92, 690, 988, 1110
    base.rounded(draw, (left, top, right, bottom), base.WHITE, base.LINE, 22, 2)
    draw.text((left + 30, top + 25), "説明図 / 画面表示ではありません", font=base.font(24), fill=base.MUTED)
    for i, label in enumerate(["定尺", "部材と本数", "刃幅"]):
        x = 155 + i * 280
        base.rounded(draw, (x, 820, x + 220, 960), base.PAPER, base.LINE, 14, 2)
        draw.text((x + 22, 863), label, font=base.font(34), fill=base.NAVY)
    base.rule(draw, 180, 1015, 900, 1015, accent, 4)


if __name__ == "__main__":
    base.icon = icon
    cfg = base.POSTS["20260928"]
    title, sub, motif = cfg["slides"][2]
    assert title == "メモした条件を入力する" and motif == "conditions"
    with tempfile.TemporaryDirectory() as tmp:
        base.ROOT = Path(tmp)
        made = base.make_slide("20260928", cfg, 3, (title, sub, "kiridori_inputs"))
        out = ROOT / "20260928_instagram_03-v2.png"
        shutil.copyfile(made, out)
    print(f"created {out.name}")
