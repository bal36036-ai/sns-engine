"""キャラクター/<キャラ>/actions/*_act-*.png（演技ポーズ）を public/chara/actions/ へ取り込む。
縁の半透明の画素に残る緑（背景を抜いたときのにじみ）を消す。不透明な画素（新人の初心者マークの緑など）は触らない。
使い方：python tools/import_act_art.py
"""
import glob
from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path(r"C:\新しいフォルダー\OneDrive\AI作成\SNS集客\キャラクター")
DST = Path(__file__).resolve().parent.parent / "public" / "chara" / "actions"
DST.mkdir(parents=True, exist_ok=True)
for f in sorted(glob.glob(str(SRC / "*" / "actions" / "*_act-*.png"))):
    a = np.array(Image.open(f).convert("RGBA")).astype(np.int16)
    edge = a[..., 3] < 250
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    cap = np.maximum(r, b)
    a[..., 1] = np.where(edge & (g > cap), cap, g)
    Image.fromarray(a.astype(np.uint8)).save(DST / Path(f).name)
    print(Path(f).name, a.shape[1], "x", a.shape[0])
