"""流行りの雰囲気に寄せた、オリジナルのBGMを2種類つくる（他人の曲・素材・サンプル音源は使わない。音はすべて数式で作る）。
- lofi：約88拍/分。キック・スネア・はねたハイハット、エレピ風の和音（Fmaj7→Em7→Dm7→Cmaj7）、ベース、こもった音、うすいレコードのノイズ。
- pop ：約118拍/分。四つ打ちのキック、手拍子、裏のハイハット、はじくシンセのアルペジオ（C→G→Am→F）、ベース。
出力：public/audio/bgm-lofi.wav、public/audio/bgm-pop.wav（44.1kHz・モノラル）。長さは src/audioTiming.ts の動画の長さに合わせる。
乱数は固定（毎回同じ音になる）。
使い方：python tools/make_bgm_trendy.py
"""
import math
import os
import re
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "audio"
SR = 44100
rng = np.random.default_rng(20261008)

timing = (ROOT / "src" / "audioTiming.ts").read_text(encoding="utf-8")
TOTAL_SEC = int(re.search(r"TOTAL_AUDIO_FRAMES = (\d+)", timing).group(1)) / 30 + 0.6
# 環境変数 BGM_SEC（秒）と BGM_ONLY=pop を指定すると、長い曲（bgm-pop-long.wav）だけを作る（複数の動画で共用）
if os.environ.get("BGM_SEC"):
    TOTAL_SEC = float(os.environ["BGM_SEC"])


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lowpass(x, cutoff):
    """FFTでやわらかく高い音を落とす（scipyなし）。"""
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    spec *= 1 / np.sqrt(1 + (f / cutoff) ** 4)
    return np.fft.irfft(spec, len(x))


def highpass(x, cutoff):
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    spec *= 1 / np.sqrt(1 + (cutoff / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(spec, len(x))


class Track:
    def __init__(self, seconds):
        self.n = int(seconds * SR)
        self.buf = np.zeros(self.n)

    def add(self, sig, start):
        s = int(start * SR)
        if s >= self.n:
            return
        e = min(self.n, s + len(sig))
        self.buf[s:e] += sig[: e - s]


def kick(length=0.32, punch=1.0):
    t = np.arange(int(length * SR)) / SR
    f = 45 + 95 * np.exp(-t * 28)
    phase = 2 * math.pi * np.cumsum(f) / SR
    return punch * np.sin(phase) * np.exp(-t * 9)


def snare(length=0.22):
    t = np.arange(int(length * SR)) / SR
    noise = highpass(rng.standard_normal(len(t)), 1500) * np.exp(-t * 18)
    body = np.sin(2 * math.pi * 185 * t) * np.exp(-t * 25)
    return 0.5 * noise + 0.5 * body


def clap(length=0.2):
    t = np.arange(int(length * SR)) / SR
    env = np.exp(-t * 30) + 0.6 * np.exp(-np.maximum(t - 0.012, 0) * 30) * (t > 0.012) + 0.5 * np.exp(-np.maximum(t - 0.024, 0) * 22) * (t > 0.024)
    return highpass(rng.standard_normal(len(t)), 1200) * env * 0.6


def hat(length=0.06, open_=False):
    length = 0.22 if open_ else length
    t = np.arange(int(length * SR)) / SR
    return highpass(rng.standard_normal(len(t)), 7000) * np.exp(-t * (14 if open_ else 70)) * 0.35


def epiano(midis, length, amp=0.12):
    """エレピ風：倍音少なめ＋ゆっくりした揺れ（トレモロ）＋わずかなずらし。"""
    t = np.arange(int(length * SR)) / SR
    env = np.minimum(1, t / 0.015) * np.exp(-t * 1.4)
    trem = 1 + 0.12 * np.sin(2 * math.pi * 4.5 * t)
    sig = np.zeros(len(t))
    for m in midis:
        f = hz(m)
        sig += np.sin(2 * math.pi * f * t) + 0.3 * np.sin(2 * math.pi * 2.003 * f * t) * np.exp(-t * 4) + 0.08 * np.sin(2 * math.pi * 3 * f * t) * np.exp(-t * 6)
    return amp * sig * env * trem


def pluck(midi, length=0.35, amp=0.16):
    """はじくシンセ：のこぎり波に近い倍音を、すぐ減衰させる。"""
    t = np.arange(int(length * SR)) / SR
    f = hz(midi)
    sig = sum(np.sin(2 * math.pi * k * f * t) / k * np.exp(-t * (6 + 5 * k)) for k in range(1, 7))
    return amp * sig * np.minimum(1, t / 0.004)


def bass(midi, length, amp=0.32):
    t = np.arange(int(length * SR)) / SR
    f = hz(midi)
    env = np.minimum(1, t / 0.01) * np.minimum(1, np.maximum(length - t, 0) / 0.04)
    return amp * (np.sin(2 * math.pi * f * t) + 0.15 * np.sin(2 * math.pi * 2 * f * t)) * env


def finish(x, fade_in=0.8, fade_out=2.0):
    t = np.arange(len(x)) / SR
    x = x * np.minimum(1, t / fade_in) * np.clip((TOTAL_SEC - t) / fade_out, 0, 1)
    return x / max(1e-9, np.abs(x).max()) * 0.9


def write(x, name):
    pcm = (x * 32767).astype("<i2")
    with wave.open(str(OUT / name), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"{name}: {len(x) / SR:.1f}秒")


def lofi():
    bpm = 88
    beat = 60 / bpm
    bar = 4 * beat
    swing = 0.18 * beat / 2  # 2つ目の8分音符を少し遅らせる（はねたリズム）
    chords = [(53, [64, 69, 72, 76]), (52, [62, 67, 71, 74]), (50, [60, 65, 69, 72]), (48, [59, 64, 67, 71])]  # Fmaj7 Em7 Dm7 Cmaj7
    tr = Track(TOTAL_SEC)
    drums = Track(TOTAL_SEC)
    i = 0
    while i * bar < TOTAL_SEC:
        root, notes = chords[i % 4]
        t0 = i * bar
        tr.add(epiano(notes, bar * 0.95), t0)
        tr.add(epiano([notes[1] + 12], beat * 1.5, 0.05), t0 + 2.5 * beat)
        tr.add(bass(root - 12, beat * 1.4), t0)
        tr.add(bass(root - 12, beat * 0.8), t0 + 2.5 * beat)
        for b in range(4):
            if b in (0, 2):
                drums.add(kick(punch=0.9), t0 + b * beat)
            if b == 2 and i % 2 == 1:
                drums.add(kick(punch=0.6), t0 + b * beat + beat / 2 + swing)
            if b in (1, 3):
                drums.add(snare(), t0 + b * beat)
            drums.add(hat(), t0 + b * beat)
            drums.add(hat() * 0.6, t0 + b * beat + beat / 2 + swing)
        i += 1
    mix = lowpass(tr.buf, 2600) + 0.8 * lowpass(drums.buf, 5500)
    crackle = np.zeros(len(mix))
    pos = rng.integers(0, len(mix), size=int(TOTAL_SEC * 6))
    crackle[pos] = rng.uniform(-0.25, 0.25, size=len(pos))
    hiss = highpass(rng.standard_normal(len(mix)), 3000) * 0.004
    write(finish(mix + lowpass(crackle, 4000) * 0.3 + hiss), "bgm-lofi.wav")


def pop():
    bpm = 118
    beat = 60 / bpm
    bar = 4 * beat
    chords = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [60, 64, 69]), (41, [60, 65, 69])]  # C G Am F
    tr = Track(TOTAL_SEC)
    drums = Track(TOTAL_SEC)
    i = 0
    while i * bar < TOTAL_SEC:
        root, notes = chords[i % 4]
        t0 = i * bar
        seq = [notes[0], notes[1], notes[2], notes[1] + 12, notes[2] + 12, notes[1] + 12, notes[2], notes[1]]
        for k in range(16):
            m = seq[k % 8] + 12
            tr.add(pluck(m, amp=0.13 if k % 2 else 0.17), t0 + k * beat / 4)
        for b in range(4):
            tr.add(bass(root - 12, beat * 0.42, 0.3), t0 + b * beat + beat / 2)
            drums.add(kick(length=0.25, punch=1.0), t0 + b * beat)
            drums.add(hat(open_=True) * 0.7, t0 + b * beat + beat / 2)
            if b in (1, 3):
                drums.add(clap(), t0 + b * beat)
        tr.add(epiano(notes, bar * 0.9, 0.05), t0)  # うしろで薄く和音
        i += 1
    mix = lowpass(tr.buf, 7000) + 0.85 * drums.buf
    write(finish(mix), "bgm-pop-long.wav" if os.environ.get("BGM_SEC") else "bgm-pop.wav")


if not os.environ.get("BGM_ONLY"):
    lofi()
pop()
