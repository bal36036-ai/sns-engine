"""連載の props（props/series-N.json）に、2.5D（奥行き）のカメラの通り道を足して props/series-N-3d.json を書く。声は作り直さない。
- 引き：カメラは正面。寄り：話す子の方へ横に動きながら前へ進み、少しそちらを向く。
- 「！？」の台詞は、寄りへ一気に切り替える（驚きのカット）。それ以外は、なめらかに動く。
使い方：python tools/make_series_3d.py [話の番号…]
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ACTOR_Z = {"shinjin": 60, "kantoku": 0, "sekkei": -30, "shuna": 30}
MOVE = 16  # カメラが次の位置へ動く長さ（フレーム）


def target(cut, speaker_x):
    if cut["z0"] <= 1.01:  # 引き
        return {"x": 0, "z": 0, "yaw": 0}, 40
    off = speaker_x - 540
    return {"x": round(off * 0.55), "z": 190, "yaw": round(-off / 540 * 7, 2)}, 50


def build(no):
    p = json.loads((ROOT / "props" / f"series-{no}.json").read_text(encoding="utf-8"))
    lines = p["lines"]
    keys = []
    for c in p["cuts"]:
        ln = next((l for l in lines if l["start"] == c["start"]), None) or next((l for l in lines if l["start"] <= c["start"] < l["start"] + l["frames"] + 6), None)
        sx = p["actors"][ln["speaker"]]["x"] if ln else 540
        tgt, drift = target(c, sx)
        end = {**tgt, "z": tgt["z"] + drift}
        hard = bool(ln) and "！？" in ln["text"] and ln["start"] == c["start"]
        if not keys:
            keys.append({"f": c["start"], **tgt})
        elif hard:
            prev = keys[-1]
            keys.append({**{k: prev[k] for k in ("x", "z", "yaw")}, "f": c["start"]})
            keys.append({"f": c["start"] + 1, **tgt})
        else:
            keys.append({"f": min(c["start"] + MOVE, c["end"] - 1), **tgt})
        keys.append({"f": c["end"], **end})
    # 同じフレームが並んだら、あとのものだけ残す
    clean = []
    for k in keys:
        if clean and k["f"] <= clean[-1]["f"]:
            clean[-1] = k if k["f"] == clean[-1]["f"] else clean[-1]
            continue
        clean.append(k)
    p["depth"] = {"cam": clean, "actorZ": ACTOR_Z}
    (ROOT / "props" / f"series-{no}-3d.json").write_text(json.dumps(p, ensure_ascii=False), encoding="utf-8")
    print(f"series-{no}-3d: カメラの点 {len(clean)}")


if __name__ == "__main__":
    for n in [int(a) for a in sys.argv[1:]] or [1, 2]:
        build(n)
