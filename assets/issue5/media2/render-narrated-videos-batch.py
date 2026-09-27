"""spec-media.json の動画を、ローカルの VOICEVOX Nemo の読み上げ付きで書き出す。

- 読み上げ台本は spec の "lines"、場面秒数は "slides" の1要素目。
- 読み間違えやすい専門用語は、台本側をひらがなで書く（画面の文字は漢字のまま）。
- 声・話速・抑揚などの設定は 9月分（video/render-narrated-videos-v2.py）と同じ。
- 出力：media2/out/<投稿ID>-narrated.mp4
127.0.0.1:50121 で公式の VOICEVOX Nemo を起動してから実行する。外部の音声サービス・BGM・投稿APIは使わない。
使い方：python render-narrated-videos-batch.py [--id=<投稿ID> ...]
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
OUT = HERE / "out"
ENDPOINT = "http://127.0.0.1:50121"
VOICE = 10005
SPEC = json.loads((HERE / "spec-media.json").read_text(encoding="utf-8"))


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        raise RuntimeError("VOICEVOX Nemo Engine redirected outside its local endpoint")


OPENER = urllib.request.build_opener(NoRedirect)


def api(path, data=None, content_type=None):
    req = urllib.request.Request(ENDPOINT + path, data=data, method="POST" if data is not None else "GET")
    if content_type:
        req.add_header("Content-Type", content_type)
    with OPENER.open(req, timeout=60) as response:
        return response.read()


def duration(wav_path):
    with wave.open(str(wav_path), "rb") as wav:
        return wav.getnframes() / wav.getframerate()


def synthesize(text, wav_path, speed):
    query = json.loads(api("/audio_query?" + urllib.parse.urlencode({"text": text, "speaker": VOICE}), b"").decode("utf-8"))
    query.update({"speedScale": speed, "intonationScale": 1.08, "prePhonemeLength": 0.05, "postPhonemeLength": 0.08})
    wav_path.write_bytes(api(f"/synthesis?speaker={VOICE}", json.dumps(query, ensure_ascii=False).encode("utf-8"), "application/json"))
    return duration(wav_path)


def make_voice(video, work):
    seconds = [s[0] for s in video["slides"]]
    if len(seconds) != len(video["lines"]):
        raise RuntimeError(f'{video["id"]}: 場面数と台本の行数が違う')
    inputs = []
    for index, (sec, line) in enumerate(zip(seconds, video["lines"]), 1):
        wav_path = work / f'{video["id"]}-{index}.wav'
        speed = 1.07
        spoken = synthesize(line, wav_path, speed)
        while spoken > sec - 0.28 and speed < 1.35:
            speed = min(1.35, round(speed * spoken / (sec - 0.35), 2))
            spoken = synthesize(line, wav_path, speed)
        if spoken > sec - 0.28:
            raise RuntimeError(f'{video["id"]} scene {index}: {spoken:.2f}s voice exceeds {sec}s scene. Shorten the line.')
        print(f'{video["id"]} {index}: {spoken:.2f}/{sec}s speed={speed:.2f}', flush=True)
        inputs.append(wav_path)
    return inputs


def mux(video, inputs, base):
    seconds = [s[0] for s in video["slides"]]
    output = OUT / f'{video["id"]}-narrated.mp4'
    args = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(base)]
    for wav_path in inputs:
        args += ["-i", str(wav_path)]
    filters = [f"[{i}:a]adelay=120:all=1,aresample=48000,apad,atrim=0:{sec},asetpts=PTS-STARTPTS[a{i}]" for i, sec in enumerate(seconds, 1)]
    filters.append("".join(f"[a{i}]" for i in range(1, len(inputs) + 1)) + f"concat=n={len(inputs)}:v=0:a=1,loudnorm=I=-16:LRA=11:TP=-1.5[outa]")
    args += ["-filter_complex", ";".join(filters), "-map", "0:v", "-map", "[outa]", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
             "-ar", "48000", "-movflags", "+faststart", "-t", str(sum(seconds)), str(output)]
    subprocess.run(args, check=True)
    print(f"created {output.name} ({output.stat().st_size} bytes)", flush=True)


def main():
    speakers = json.loads(api("/speakers").decode("utf-8"))
    if VOICE not in {s["id"] for p in speakers for s in p["styles"]}:
        raise RuntimeError("VOICEVOX Nemo speaker 10005 is unavailable")
    selected = [a[5:] for a in sys.argv[1:] if a.startswith("--id=")]
    videos = [v for v in SPEC["videos"] if not selected or v["id"] in selected]
    if not videos:
        raise RuntimeError("no videos selected")
    OUT.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="sns-media2-narrated-") as temp_dir:
        work = Path(temp_dir)
        voices = {v["id"]: make_voice(v, work) for v in videos}
        args = ["node", str(HERE / "render-videos-batch.cjs"), f"--output-dir={work}"] + [f"--id={v['id']}" for v in videos]
        subprocess.run(args, check=True, cwd=HERE.parent.parent.parent)
        for v in videos:
            mux(v, voices[v["id"]], work / f'{v["id"]}-base.mp4')


if __name__ == "__main__":
    main()
