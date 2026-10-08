"""会話劇（自然な動き版 PuppetCast）の props を作る。声・口の動きは props/cast-tsuika.json（make_cast_skit.py）を使い回し、
絵は public/rig/<キャラ>/<ポーズ>/rig.json（キャラクター/make_face_rigs.py が作る）を使う。
使い方：python tools/make_puppet_cast.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = json.loads((ROOT / "props" / "cast-tsuika.json").read_text(encoding="utf-8"))

# 場面ごとの全員のポーズ（rig の名前）と首かしげ（度）
SCENES = [
    {"poses": {"shuna": "shuna/s1_1-1", "kantoku": "kantoku/s1-1", "sekkei": "sekkei/s1-1", "shinjin": "shinjin/s1-1"}, "tilt": {"kantoku": -3}},
    {"poses": {"shuna": "shuna/s1_1-3", "kantoku": "kantoku/s1-3", "sekkei": "sekkei/s1-1", "shinjin": "shinjin/s1-1"}, "tilt": {"shinjin": 6}},
    {"poses": {"shuna": "shuna/s1_1-4", "kantoku": "kantoku/s1-1", "sekkei": "sekkei/s1-1", "shinjin": "shinjin/s1-3"}, "tilt": {"shinjin": -4}},
    {"poses": {"shuna": "shuna/s1_1-4", "kantoku": "kantoku/s1-1", "sekkei": "sekkei/s1-4", "shinjin": "shinjin/s1-3"}, "tilt": {"sekkei": -4}},
    {"poses": {"shuna": "shuna/s1_1-1", "kantoku": "kantoku/s1-1", "sekkei": "sekkei/s1-1", "shinjin": "shinjin/s1-1"}, "tilt": {"shuna": -7}},
]

rigs = {}
lines = []
for line, sc in zip(src["lines"], SCENES):
    for name in sc["poses"].values():
        if name not in rigs:
            r = json.loads((ROOT / "public" / "rig" / name / "rig.json").read_text(encoding="utf-8"))
            r.pop("align", None)
            r["dir"] = f"rig/{name}"
            rigs[name] = r
    lines.append({**{k: line[k] for k in ("speaker", "text", "voice", "frames", "lead", "mouth")}, "poses": sc["poses"], "tilt": sc["tilt"]})

props = {"cast": src["cast"], "rigs": rigs, "lines": lines, "bgm": src["bgm"], "bgmVolume": src["bgmVolume"], "credit": src["credit"]}
(ROOT / "props" / "puppet-cast-tsuika.json").write_text(json.dumps(props, ensure_ascii=False), encoding="utf-8")
print(len(lines), "場面", sorted(rigs))
