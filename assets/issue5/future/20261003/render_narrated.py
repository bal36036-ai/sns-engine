"""Build the October 3 TikTok review video with the existing visual and local Nemo pipeline."""

import importlib.util
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
VIDEO = HERE.parents[1] / "video"
ID = "20261003-tiktok-harinavi"
SECONDS = [2, 5, 8, 7, 5]
LINES = [
    "この数字の前提、どこ？",
    "まず、結果の位置と、表示された項目を見ます。",
    "次に元の条件へ。スパン長と吊り荷を見返します。",
    "条件と結果の並びを、今、画面で検討しています。",
    "条件を探しやすい画面へ。最終判断は専門家に。",
]
spec = importlib.util.spec_from_file_location("issue5_narration", VIDEO / "render-narrated-videos.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

with tempfile.TemporaryDirectory(prefix="sns-issue5-20261003-") as temp:
    work = Path(temp)
    wavs = []
    for index, (seconds, line) in enumerate(zip(SECONDS, LINES, strict=True), 1):
        wav = work / f"scene-{index}.wav"
        speed = 1.07
        spoken = module.synthesize(line, wav, speed)
        while spoken > seconds - 0.28 and speed < 1.35:
            speed = min(1.35, round(speed * spoken / (seconds - 0.35), 2))
            spoken = module.synthesize(line, wav, speed)
        if spoken > seconds - 0.28:
            raise RuntimeError(f"Scene {index} is {spoken:.2f}s, longer than {seconds}s")
        print(f"Scene {index}: {spoken:.2f}/{seconds}s, speed {speed:.2f}", flush=True)
        wavs.append(wav)
    subprocess.run(["node", str(VIDEO / "render-videos.cjs"), f"--id={ID}",
                    f"--output-dir={work}", "--output-suffix=-base"], check=True)
    args = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(work / f"{ID}-base.mp4")]
    for wav in wavs:
        args.extend(["-i", str(wav)])
    filters = [f"[{i}:a]adelay=120:all=1,aresample=48000,apad,atrim=0:{seconds},asetpts=PTS-STARTPTS[a{i}]"
               for i, seconds in enumerate(SECONDS, 1)]
    filters.append("".join(f"[a{i}]" for i in range(1, 6)) +
                   "concat=n=5:v=0:a=1,loudnorm=I=-16:LRA=11:TP=-1.5[outa]")
    args.extend(["-filter_complex", ";".join(filters), "-map", "0:v", "-map", "[outa]",
                 "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
                 "-movflags", "+faststart", "-t", str(sum(SECONDS)),
                 str(HERE / f"{ID}-narrated.mp4")])
    subprocess.run(args, check=True)
print("Created October 3 narrated review video")
subprocess.run([sys.executable, str(HERE.parents[3] / "scripts" / "check-video-audio.py"),
                str(HERE / f"{ID}-narrated.mp4"), "--report",
                str(HERE.parents[3] / "scripts" / "audio-check-20261003.json")], check=True)
