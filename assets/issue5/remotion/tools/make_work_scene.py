"""「作業している → 仲間が歩いてくる → 話す」動画（WorkScene）の props を作る。
声と口の動きは props/cast-tsuika.json（make_cast_skit.py）を使い回す。絵：public/chara/actions/（作業・歩きのコマ）、public/rig/（口パク付き）。
使い方：python tools/make_work_scene.py
"""
import glob
import json
import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
src = json.loads((ROOT / "props" / "cast-tsuika.json").read_text(encoding="utf-8"))
chara = ROOT / "public" / "chara"
sizes = {str(Path(f).relative_to(chara)).replace("\\", "/"): list(Image.open(f).size) for f in glob.glob(str(chara / "**" / "*.png"), recursive=True)}


def rig(name):
    r = json.loads((ROOT / "public" / "rig" / name / "rig.json").read_text(encoding="utf-8"))
    r.pop("align", None)
    r["dir"] = f"rig/{name}"
    return r


L = src["lines"]
SHUNA_X, SHUNA_H = 700, 470
KAN_X, KAN_H = 330, 430
t1 = 150                      # 監督が話し始める
t2 = t1 + L[0]["frames"] + 4  # 黒シュナが答える
t3 = t2 + L[1]["frames"] + 4  # 黒シュナが問いかける
total = t3 + L[4]["frames"] + 30
measure = [f"actions/shuna_measure-{i}.png" for i in (1, 2, 3, 4)]
walk = [f"actions/kantoku_walk-{i}.png" for i in (1, 2, 3, 4)]

actors = {
    "kantoku": {"name": src["cast"]["kantoku"]["name"], "color": src["cast"]["kantoku"]["color"], "x": KAN_X, "tracks": [
        {"kind": "cycle", "start": 40, "end": 140, "files": walk, "fps": 8, "x0": -200, "x1": KAN_X, "height": KAN_H, "bob": 8},
        {"kind": "rig", "start": 140, "end": t2, "rig": "kantoku/s1-1", "height": KAN_H},
        {"kind": "rig", "start": t2, "end": total, "rig": "kantoku/s1-3", "height": KAN_H, "tilt": -2},
    ]},
    "shuna": {"name": src["cast"]["shuna"]["name"], "color": src["cast"]["shuna"]["color"], "x": SHUNA_X, "tracks": [
        {"kind": "cycle", "start": 0, "end": t1 + 30, "files": measure, "fps": 4, "height": SHUNA_H},
        {"kind": "cycle", "start": t1 + 30, "end": t2, "files": ["actions/shuna_table-4.png"], "fps": 1, "height": SHUNA_H - 10},
        {"kind": "rig", "start": t2, "end": t3, "rig": "shuna/t-2", "height": SHUNA_H - 10},
        {"kind": "rig", "start": t3, "end": total, "rig": "shuna/t-3", "height": SHUNA_H - 10, "tilt": -4},
    ]},
}
rigs = {n: rig(n) for n in ("kantoku/s1-1", "kantoku/s1-3", "shuna/t-2", "shuna/t-3")}
lines = [
    {**{k: L[0][k] for k in ("speaker", "text", "voice", "lead", "mouth", "frames")}, "start": t1},
    {**{k: L[1][k] for k in ("speaker", "text", "voice", "lead", "mouth", "frames")}, "start": t2},
    {**{k: L[4][k] for k in ("speaker", "text", "voice", "lead", "mouth", "frames")}, "start": t3},
]
props = {"actors": actors, "rigs": rigs, "sizes": sizes, "lines": lines, "bg": "scene/bg_workshop.png", "bgm": src["bgm"], "bgmVolume": src["bgmVolume"], "credit": src["credit"], "total": total}
(ROOT / "props" / "work-tsuika.json").write_text(json.dumps(props, ensure_ascii=False), encoding="utf-8")
print("合計", total, "フレーム", round(total / 30, 1), "秒")
