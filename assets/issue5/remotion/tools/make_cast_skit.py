"""現場の仲間の会話劇（CastSkit）の、声・口の動き・台本データ（props/cast-*.json）を作る。
- 声：ローカルの VOICEVOX Nemo 0.24.0（127.0.0.1:50121）。キャラごとに声を変える。専門語はひらがなで書く。
- 絵：public/chara/（黒シュナ：s1_1-*.png など、仲間：<キャラ>/s1-*.png）
使い方：VOICEVOX Nemo を起動してから  python tools/make_cast_skit.py [名前]
"""
import glob
import json
import math
import os
import sys
import urllib.parse
import urllib.request
import wave
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ENDPOINT = "http://127.0.0.1:50121"
FPS = 30
LEAD = 8
TAIL = 0.5

# キャラ：名前・立ち位置・背の高さ・色・声（VOICEVOX Nemo の speaker と高さ）
CAST = {
    "shuna": {"name": "職人 黒シュナ", "x": 215, "height": 480, "color": "#1F2D3D", "voice": 10001, "pitch": 0.03},
    "kantoku": {"name": "現場監督", "x": 460, "height": 480, "color": "#2E7D5B", "voice": 10000, "pitch": 0.0},
    "sekkei": {"name": "設計", "x": 700, "height": 450, "color": "#3B6FB6", "voice": 10004, "pitch": 0.0},
    "shinjin": {"name": "新人", "x": 925, "height": 380, "color": "#D9622B", "voice": 10008, "pitch": 0.05},
}

# 台本：speaker・text（吹き出し）・voice（読み）・poses（その場面の全員の絵）・alt（話す人の口を開けた絵）
SKITS = {
    # 10/14 のあるある（材料取りがまとまったところで「追加です」）を元にした見本
    "cast-tsuika": [
        dict(speaker="kantoku", text="ごめん！\n部材、追加になった！", voice="ごめん！ぶざい、ついかになった！", min=60,
             poses={"shuna": "s1_1-1.png", "kantoku": "kantoku/s1-2.png", "sekkei": "sekkei/s1-1.png", "shinjin": "shinjin/s1-1.png"}, alt=None),
        dict(speaker="shuna", text="えっ、いま割り付け\n終わったところ…", voice="えっ、いま、わりつけ、おわったところ…", min=70,
             poses={"shuna": "s1_1-3.png", "kantoku": "kantoku/s1-3.png", "sekkei": "sekkei/s1-1.png", "shinjin": "shinjin/s1-4.png"}),
        dict(speaker="shinjin", text="入る場所を探すんですか？\n全部組み直しですか？", voice="はいる、ばしょを、さがすんですか？ぜんぶ、くみなおしですか？", min=80,
             poses={"shuna": "s1_1-4.png", "kantoku": "kantoku/s1-1.png", "sekkei": "sekkei/s1-3.png", "shinjin": "shinjin/s1-2.png"}),
        dict(speaker="sekkei", text="そこ、悩みますよね…", voice="そこ、なやみますよね…", min=60,
             poses={"shuna": "s1_1-4.png", "kantoku": "kantoku/s1-1.png", "sekkei": "sekkei/s1-4.png", "shinjin": "shinjin/s1-3.png"}),
        dict(speaker="shuna", text="みなさんの現場では、\nどうしてますか？", voice="みなさんの、げんばでは、どうしてますか？", min=80,
             poses={"shuna": "s1_1-2.png", "kantoku": "kantoku/s1-1.png", "sekkei": "sekkei/s1-1.png", "shinjin": "shinjin/s1-1.png"}, alt=None),
    ],
}


def api(path, data=None, ctype=None):
    req = urllib.request.Request(ENDPOINT + path, data=data, method="POST" if data is not None else "GET")
    if ctype:
        req.add_header("Content-Type", ctype)
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def synth(text, path, speaker, pitch):
    q = json.loads(api("/audio_query?" + urllib.parse.urlencode({"text": text, "speaker": speaker}), b""))
    q.update({"speedScale": 1.1, "pitchScale": pitch, "intonationScale": 1.2, "prePhonemeLength": 0.05, "postPhonemeLength": 0.08})
    path.write_bytes(api(f"/synthesis?speaker={speaker}", json.dumps(q, ensure_ascii=False).encode("utf-8"), "application/json"))
    with wave.open(str(path), "rb") as w:
        sr = w.getframerate()
        a = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(float) / 32768
    step = sr // FPS
    rms = np.array([np.sqrt(np.mean(a[i:i + step] ** 2)) for i in range(0, len(a) - step + 1, step)])
    m = np.clip(rms / (np.percentile(rms[rms > 0], 90) if (rms > 0).any() else 1), 0, 1)
    m = np.where(m < 0.12, 0, m)
    return len(a) / sr, [round(float(v) * (0.75 if i % 2 else 1.0), 3) for i, v in enumerate(m)]


def build(name):
    out = ROOT / "public" / "audio" / name
    out.mkdir(parents=True, exist_ok=True)
    chara = ROOT / "public" / "chara"
    sizes = {str(Path(f).relative_to(chara)).replace("\\", "/"): list(Image.open(f).size) for f in glob.glob(str(chara / "**" / "*.png"), recursive=True)}
    lines = []
    for i, ln in enumerate(SKITS[name]):
        c = CAST[ln["speaker"]]
        d, mouth = synth(ln["voice"], out / f"line-{i}.wav", c["voice"], c["pitch"])
        frames = max(ln["min"], math.ceil((LEAD / FPS + d + TAIL) * FPS))
        for f in ln["poses"].values():
            if f not in sizes:
                sys.exit(f"絵がありません: {f}")
        lines.append({"speaker": ln["speaker"], "text": ln["text"], "voice": f"{name}/line-{i}.wav", "frames": frames, "lead": LEAD, "mouth": mouth, "poses": ln["poses"], **({"alt": ln["alt"]} if ln.get("alt") else {})})
        print(f"{name} {i + 1} {c['name']}: 声 {d:.2f}秒 → {frames}フレーム", flush=True)
    cast = {k: {kk: v[kk] for kk in ("name", "x", "height", "color")} for k, v in CAST.items()}
    props = {"cast": cast, "lines": lines, "sizes": sizes, "bgm": "bgm-pop-long.wav", "bgmVolume": 0.28, "credit": "げんばアプリ工房｜音声：VOICEVOX Nemo"}
    (ROOT / "props" / f"{name}.json").write_text(json.dumps(props, ensure_ascii=False), encoding="utf-8")
    print(f"{name}: 合計 {sum(l['frames'] for l in lines) / FPS:.1f}秒")


if __name__ == "__main__":
    for n in (sys.argv[1:] or list(SKITS)):
        build(n)
