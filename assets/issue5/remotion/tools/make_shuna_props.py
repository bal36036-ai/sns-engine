"""職人の黒シュナの見本（端材のあるある）の props を作る。声と口の動きは props/dog-tanzai.json（make_dog_skit.py）を使い回す。
使い方：python tools/make_shuna_props.py
"""
import glob
import json
import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
d = json.loads((ROOT / "props" / "dog-tanzai.json").read_text(encoding="utf-8"))
sizes = {os.path.basename(f): list(Image.open(f).size) for f in glob.glob(str(ROOT / "public" / "chara" / "*.png"))}
L = d["lines"]
# 1：歩いて登場 → 立って話す（声が大きいときは口を開けて手を振る絵）
L[0]["lead"] = 34
L[0]["frames"] += 24
L[0]["enter"] = {"file": "s2_1-1.png", "frames": 30}
L[0]["sprites"] = [{"file": "s1_1-1.png", "at": 0, "alt": "s1_1-2.png"}]
# 2：メジャーで測る → 頭をかいて困る
n = L[1]["frames"]
L[1]["sprites"] = [{"file": "s2_1-2.png", "at": 0}, {"file": "s1_1-3.png", "at": int(n * 0.55)}]
# 3：考える → 最後にグッド
n = L[2]["frames"]
L[2]["frames"] += 20
L[2]["sprites"] = [{"file": "s1_1-4.png", "at": 0}, {"file": "s3_1-2.png", "at": n - 10}]
d["sizes"] = sizes
(ROOT / "props" / "shuna-tanzai.json").write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")
print([l["frames"] for l in L], sum(l["frames"] for l in L))
