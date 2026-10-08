"""寄りの場面（Opening）と、口が動く場面（WorkScene）などを1本につないで、BGMを重ねる。
使い方：python tools/build_short.py 出力.mp4 場面1.mp4 場面2.mp4 …
- つなぎ目は、そのまま切り替える（1080×1080・30fps。声は各場面の中にある）。
- BGM：public/audio/bgm-pop-long.wav を、音量0.26で、最後の1秒で消える。
"""
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent


def run(*args):
    r = subprocess.run(["npx", "remotion", *args], cwd=ROOT, capture_output=True, text=True, shell=True, encoding="utf-8")
    return r


def duration(p):
    r = run("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p))
    return float(r.stdout.strip().splitlines()[-1])


def main():
    out, segs = Path(sys.argv[1]).resolve(), [Path(a).resolve() for a in sys.argv[2:]]
    tmp = out.with_suffix(".tmp.mp4")
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    for s in segs:
        cmd += ["-i", str(s)]
    n = len(segs)
    cmd += ["-filter_complex", "".join(f"[{i}:v][{i}:a]" for i in range(n)) + f"concat=n={n}:v=1:a=1[v][a]", "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-crf", "21", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", str(tmp)]
    r = run(*cmd)
    if r.returncode:
        sys.exit(r.stderr)
    total = duration(tmp)
    # このPCの ffmpeg（Remotion同梱）には afade・amix が無いので、BGMの重ねは numpy で行う
    voice_wav, mix_wav = out.with_suffix(".voice.wav"), out.with_suffix(".mix.wav")
    r = run("ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp), "-vn", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", str(voice_wav))
    if r.returncode:
        sys.exit(r.stderr)
    with wave.open(str(voice_wav), "rb") as w:
        sr, ch = w.getframerate(), w.getnchannels()
        v = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float32).reshape(-1, ch)
    bgm_src = ROOT / "public" / "audio" / "bgm-pop-long.wav"
    tmp_b = out.with_suffix(".bgm.wav")
    r = run("ffmpeg", "-y", "-loglevel", "error", "-i", str(bgm_src), "-ac", "2", "-ar", str(sr), "-c:a", "pcm_s16le", str(tmp_b))
    if r.returncode:
        sys.exit(r.stderr)
    with wave.open(str(tmp_b), "rb") as w:
        b = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float32).reshape(-1, 2)
    b = b[: len(v)]
    if len(b) < len(v):
        b = np.pad(b, ((0, len(v) - len(b)), (0, 0)))
    fade = np.clip((len(v) - np.arange(len(v))) / sr, 0, 1)[:, None]  # 最後の1秒で消える
    m = np.clip(v + b * 0.26 * fade, -32768, 32767).astype("<i2")
    with wave.open(str(mix_wav), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(m.tobytes())
    r = run("ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp), "-i", str(mix_wav), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", str(out))
    if r.returncode:
        sys.exit(r.stderr)
    for f in (voice_wav, mix_wav, tmp_b):
        f.unlink()
    tmp.unlink()
    print(f"{out.name}: {total:.1f}秒、{out.stat().st_size / 1e6:.1f}MB")


if __name__ == "__main__":
    main()
