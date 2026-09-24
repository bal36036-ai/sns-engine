"""Create the October 2 review-only YouTube Shorts video with local Nemo voice."""

import importlib.util
import subprocess
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
VIDEO = HERE.parents[1] / "video"
ID = "20261002-youtube-kiridori"
SECONDS = [2, 5, 8, 8, 4]
LINES = [
    "この一本に、何が入る？",
    "まず、必要な部材の長さと本数を入力します。",
    "六メートル材の一本目には、二千五百ミリの部材が二本。残りは九百九十ミリです。",
    "ほかの材料も、並びと残る長さを図で確認できます。",
    "入力条件と切り出し案を、見比べてください。",
]
spec = importlib.util.spec_from_file_location("issue5_narration", VIDEO / "render-narrated-videos.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

with tempfile.TemporaryDirectory(prefix="sns-issue5-20261002-") as temp:
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
print("Created narrated review video")
