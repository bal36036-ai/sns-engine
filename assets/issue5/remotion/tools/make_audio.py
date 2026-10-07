"""SortOrderVideo 用の音声を作る。
- 声：ローカルの VOICEVOX Nemo 0.24.0（127.0.0.1:50121）、女声1・ノーマル（speaker 10005）。外部の音声サービスは使わない。
- 曲：このスクリプトが数式で作る、オリジナルの短いBGM（他人の曲・素材は使わない。著作権の確認が要る素材は入れない）。
- 出力：public/audio/*.wav と、場面の長さ（フレーム数）を書いた src/audioTiming.ts。
使い方：VOICEVOX Nemo を起動してから  python tools/make_audio.py
"""
import json
import math
import urllib.parse
import urllib.request
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "audio"
OUT.mkdir(parents=True, exist_ok=True)
ENDPOINT = "http://127.0.0.1:50121"
VOICE = 10005
FPS = 30

# 専門用語はひらがなで書く（読み間違い防止）。数字も言葉で書く。
LINES = {
    "hook": "おなじぶざいでも、ならべるじゅんばんで、ていじゃくのほんすうは、かわる？ キリドリで、ためしました。",
    "condition": "ていじゃくは、ろくせんミリ。はのはばは、ごミリ。ぶざいは、エー、ビー、シーが、にほんずつ。",
    "input": "かいたじゅんだと、ていじゃくは、さんぼん。ぶどまりは、ろくじゅういってんいちパーセント。",
    "auto": "じどうだと、ていじゃくは、にほん。ぶどまりは、きゅうじゅういってんななパーセント。",
    "question": "ながいぶざいから？ かいたじゅんで？ みなさんは、どちらですか。",
}
LEAD = 0.45  # 場面の頭の無音（秒）
TAIL = 0.70  # 場面の終わりの余白（秒）
MIN_FRAMES = {"hook": 105, "condition": 135, "input": 135, "auto": 135, "question": 120}  # 画面のアニメが終わるのに必要な長さ


def api(path, data=None, content_type=None):
    req = urllib.request.Request(ENDPOINT + path, data=data, method="POST" if data is not None else "GET")
    if content_type:
        req.add_header("Content-Type", content_type)
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def synth(text, path):
    q = json.loads(api("/audio_query?" + urllib.parse.urlencode({"text": text, "speaker": VOICE}), b""))
    q.update({"speedScale": 1.08, "intonationScale": 1.08, "prePhonemeLength": 0.05, "postPhonemeLength": 0.08})
    path.write_bytes(api(f"/synthesis?speaker={VOICE}", json.dumps(q, ensure_ascii=False).encode("utf-8"), "application/json"))
    with wave.open(str(path), "rb") as w:
        return w.getnframes() / w.getframerate()


def make_bgm(seconds, path, sr=44100):
    """やさしい、C長調のゆっくりした曲（約84拍/分）。和音のパッドと、ゆるいアルペジオ。毎回同じ音になる（乱数なし）。"""
    n = int(seconds * sr)
    t = np.arange(n) / sr
    bpm = 84
    beat = 60 / bpm
    chords = [  # 各小節：根音・和音（MIDI）。C → Am → F → G
        (48, [60, 64, 67]),
        (45, [57, 60, 64]),
        (41, [57, 60, 65]),
        (43, [59, 62, 67]),
    ]
    out = np.zeros(n)
    hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)

    def tone(freq, start, dur, amp, kind="sine"):
        s = int(start * sr)
        e = min(n, s + int(dur * sr))
        if s >= n or e <= s:
            return
        tt = np.arange(e - s) / sr
        env = np.minimum(1.0, tt / 0.03) * np.exp(-tt * (2.2 if kind == "pluck" else 0.5))
        if kind == "pad":
            env = np.minimum(1.0, tt / 0.6) * np.minimum(1.0, (dur - tt) / 0.8).clip(0, 1)
        wave_ = np.sin(2 * math.pi * freq * tt) + 0.25 * np.sin(2 * math.pi * 2 * freq * tt)
        out[s:e] += amp * env * wave_

    bar = 4 * beat
    i = 0
    while i * bar < seconds + bar:
        root, notes = chords[i % len(chords)]
        t0 = i * bar
        tone(hz(root), t0, bar, 0.16, "pad")
        for m in notes:
            tone(hz(m), t0, bar, 0.07, "pad")
        arp = [notes[0], notes[1], notes[2], notes[1] + 12, notes[2], notes[1], notes[0] + 12, notes[1]]
        for k, m in enumerate(arp):
            tone(hz(m + 12), t0 + k * beat / 2, beat * 1.2, 0.10, "pluck")
        i += 1
    fade = np.minimum(1.0, t / 1.2) * np.minimum(1.0, (seconds - t) / 1.8).clip(0, 1)
    out *= fade
    out = out / max(1e-9, np.abs(out).max()) * 0.9
    pcm = (out * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def main():
    frames = {}
    for key, text in LINES.items():
        d = synth(text, OUT / f"voice-{key}.wav")
        need = math.ceil((LEAD + d + TAIL) * FPS)
        frames[key] = max(MIN_FRAMES[key], need)
        print(f"{key}: 声 {d:.2f}秒 → 場面 {frames[key]}フレーム（{frames[key] / FPS:.1f}秒）", flush=True)
    total = sum(frames.values())
    make_bgm(total / FPS + 0.5, OUT / "bgm.wav")
    ts = (
        "// tools/make_audio.py が作るファイル。直接は編集しない。\n"
        f"export const VOICE_FRAMES = {json.dumps(frames)} as const;\n"
        f"export const LEAD_FRAMES = {round(LEAD * FPS)};\n"
        f"export const TOTAL_AUDIO_FRAMES = {total};\n"
    )
    (ROOT / "src" / "audioTiming.ts").write_text(ts, encoding="utf-8")
    print(f"合計 {total}フレーム（{total / FPS:.1f}秒）")


main()
