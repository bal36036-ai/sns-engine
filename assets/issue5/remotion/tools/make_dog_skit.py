"""職人ワンちゃん（ミニチュアシュナウザー）の寸劇の、声と口の動き（props/dog-*.json）を作る。
- 声：ローカルの VOICEVOX Nemo 0.24.0（127.0.0.1:50121）、男声1（speaker 10001）。専門語はひらがなで書く。
- 口：声の大きさ（1/30秒ごと）から 0〜1 を作る。
使い方：VOICEVOX Nemo を起動してから  python tools/make_dog_skit.py [名前]
"""
import json
import math
import sys
import urllib.parse
import urllib.request
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
ENDPOINT = "http://127.0.0.1:50121"
VOICE = 10001
FPS = 30
LEAD = 10
TAIL = 0.8

# 台本：text は吹き出し、voice は読み（ひらがな）、pose は表情、prop は背景の小物
SKITS = {
    # 10/12 のあるある（ChatGPT案「あとで使えそうで残した端材」）を元にした見本
    "dog-tanzai": [
        dict(text="「あとで使えそう」で\n残した端材。", voice="あとでつかえそうって、のこした、たんざい。", pose="talk", prop="rack", min=75),
        dict(text="いざ使うとき、\n長さを測るところから…", voice="いざつかうときに、ながさを、はかるところから、はじまるんだよね。", pose="sweat", prop="measure", min=90),
        dict(text="みなさんの現場では、\nどうしてますか？", voice="みなさんのげんばでは、どうしてますか？", pose="question", prop="rack", min=80),
    ],
}


def api(path, data=None, ctype=None):
    req = urllib.request.Request(ENDPOINT + path, data=data, method="POST" if data is not None else "GET")
    if ctype:
        req.add_header("Content-Type", ctype)
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def synth(text, path):
    q = json.loads(api("/audio_query?" + urllib.parse.urlencode({"text": text, "speaker": VOICE}), b""))
    q.update({"speedScale": 1.1, "pitchScale": 0.03, "intonationScale": 1.2, "prePhonemeLength": 0.05, "postPhonemeLength": 0.08})
    path.write_bytes(api(f"/synthesis?speaker={VOICE}", json.dumps(q, ensure_ascii=False).encode("utf-8"), "application/json"))
    with wave.open(str(path), "rb") as w:
        sr = w.getframerate()
        a = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(float) / 32768
        if w.getnchannels() == 2:
            a = a.reshape(-1, 2).mean(axis=1)
    step = sr // FPS
    rms = np.array([np.sqrt(np.mean(a[i:i + step] ** 2)) if len(a[i:i + step]) else 0 for i in range(0, len(a), step)])
    m = np.clip(rms / (np.percentile(rms[rms > 0], 90) if (rms > 0).any() else 1), 0, 1)
    m = np.where(m < 0.12, 0, m)  # 小さい音は口を閉じる
    # 開きっぱなしに見えないよう、2フレームごとに少し閉じる
    m = [round(float(v) * (0.75 if i % 2 else 1.0), 3) for i, v in enumerate(m)]
    return len(a) / sr, m


def build(name):
    out = ROOT / "public" / "audio" / name
    out.mkdir(parents=True, exist_ok=True)
    lines = []
    for i, ln in enumerate(SKITS[name]):
        d, mouth = synth(ln["voice"], out / f"line-{i}.wav")
        frames = max(ln["min"], math.ceil((LEAD / FPS + d + TAIL) * FPS))
        lines.append({"text": ln["text"], "voice": f"{name}/line-{i}.wav", "frames": frames, "lead": LEAD, "mouth": mouth, "pose": ln["pose"], "prop": ln["prop"]})
        print(f"{name} {i + 1}: 声 {d:.2f}秒 → {frames}フレーム", flush=True)
    props = {"lines": lines, "bgm": "bgm-pop-long.wav", "bgmVolume": 0.3, "credit": "げんばアプリ工房｜音声：VOICEVOX Nemo"}
    (ROOT / "props" / f"{name}.json").write_text(json.dumps(props, ensure_ascii=False), encoding="utf-8")
    print(f"{name}: 合計 {sum(l['frames'] for l in lines) / FPS:.1f}秒")


if __name__ == "__main__":
    for n in (sys.argv[1:] or list(SKITS)):
        build(n)
