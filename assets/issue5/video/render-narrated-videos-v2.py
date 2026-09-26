"""Build the seven -v2 September videos (tester-guidance removal, 2026-09-26) with local VOICEVOX Nemo narration.

Reads narration-v2.json and render-videos-v2.cjs. Never overwrites the original -narrated.mp4 files.

Run a locally started official Nemo engine at 127.0.0.1:50121 first.
No external voice service, BGM, or posting API is used.
"""

import json
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
import wave
from pathlib import Path


HERE = Path(__file__).resolve().parent
ENDPOINT = "http://127.0.0.1:50121"
VOICE = 10005
MANIFEST = json.loads((HERE / "narration-v2.json").read_text(encoding="utf-8"))


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        raise RuntimeError("VOICEVOX Nemo Engine redirected outside its local endpoint")


OPENER = urllib.request.build_opener(NoRedirect)


def api(path: str, data=None, content_type=None):
    req = urllib.request.Request(ENDPOINT + path, data=data, method="POST" if data is not None else "GET")
    if content_type:
        req.add_header("Content-Type", content_type)
    with OPENER.open(req, timeout=60) as response:
        return response.read()


def duration(wav_path: Path) -> float:
    with wave.open(str(wav_path), "rb") as wav:
        return wav.getnframes() / wav.getframerate()


def synthesize(text: str, wav_path: Path, speed: float):
    query_path = "/audio_query?" + urllib.parse.urlencode({"text": text, "speaker": VOICE})
    query = json.loads(api(query_path, b"").decode("utf-8"))
    query["speedScale"] = speed
    query["intonationScale"] = 1.08
    query["prePhonemeLength"] = 0.05
    query["postPhonemeLength"] = 0.08
    encoded = json.dumps(query, ensure_ascii=False).encode("utf-8")
    audio = api(f"/synthesis?speaker={VOICE}", encoded, "application/json")
    wav_path.write_bytes(audio)
    return duration(wav_path)


def make_voice(video: dict, work: Path):
    inputs = []
    for index, (seconds, line) in enumerate(zip(video["seconds"], video["lines"], strict=True), 1):
        wav_path = work / f'{video["id"]}-{index}.wav'
        speed = 1.07
        spoken = synthesize(line, wav_path, speed)
        while spoken > seconds - 0.28 and speed < 1.35:
            speed = min(1.35, round(speed * spoken / (seconds - 0.35), 2))
            spoken = synthesize(line, wav_path, speed)
        if spoken > seconds - 0.28:
            raise RuntimeError(f'{video["id"]} scene {index}: {spoken:.2f}s voice exceeds {seconds}s scene. Shorten the line.')
        print(f'{video["id"]} {index}: {spoken:.2f}/{seconds}s speed={speed:.2f} {line}', flush=True)
        inputs.append(wav_path)
    return inputs


def render_visuals(work: Path, selected: str | None):
    args = [
        "node", str(HERE / "render-videos-v2.cjs"), f"--output-dir={work}",
        "--output-suffix=-narrated-base-v2"
    ]
    if selected:
        args.append(f"--id={selected}")
    subprocess.run(args, check=True, cwd=HERE.parent.parent.parent)


def mux(video: dict, inputs: list[Path], work: Path):
    base = work / f'{video["id"]}-narrated-base-v2.mp4'
    output = HERE / f'{video["id"]}-narrated-v2.mp4'
    args = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(base)]
    for wav_path in inputs:
        args.extend(["-i", str(wav_path)])
    filters = []
    for index, seconds in enumerate(video["seconds"], 1):
        filters.append(
            f"[{index}:a]adelay=120:all=1,aresample=48000,"
            f"apad,atrim=0:{seconds},asetpts=PTS-STARTPTS[a{index}]"
        )
    joined = "".join(f"[a{i}]" for i in range(1, len(inputs) + 1))
    filters.append(f"{joined}concat=n={len(inputs)}:v=0:a=1,loudnorm=I=-16:LRA=11:TP=-1.5[outa]")
    args.extend([
        "-filter_complex", ";".join(filters), "-map", "0:v", "-map", "[outa]",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
        "-movflags", "+faststart", "-t", str(sum(video["seconds"])), str(output)
    ])
    subprocess.run(args, check=True)
    print(f"created {output.name} ({output.stat().st_size} bytes)", flush=True)


def main():
    if MANIFEST["speaker_id"] != VOICE:
        raise RuntimeError("Narration manifest and requested speaker differ")
    speakers = json.loads(api("/speakers").decode("utf-8"))
    available = {style["id"] for person in speakers for style in person["styles"]}
    if VOICE not in available:
        raise RuntimeError("VOICEVOX Nemo speaker 10005 is unavailable")
    if len(MANIFEST["videos"]) != 7:
        raise RuntimeError("Expected exactly seven -v2 videos")
    selected = next((arg[5:] for arg in sys.argv[1:] if arg.startswith("--id=")), None)
    videos = [video for video in MANIFEST["videos"] if selected is None or video["id"] == selected]
    if not videos:
        raise RuntimeError(f"Unknown video id: {selected}")
    with tempfile.TemporaryDirectory(prefix="sns-issue5-narrated-") as temp_dir:
        work = Path(temp_dir)
        voices = {video["id"]: make_voice(video, work) for video in videos}
        if "--voice-only" in sys.argv:
            return
        render_visuals(work, selected)
        for video in videos:
            mux(video, voices[video["id"]], work)


if __name__ == "__main__":
    main()
