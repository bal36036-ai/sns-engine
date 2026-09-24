"""Offline Issue #5 video narration gate. No upload or publishing operations."""

import argparse
import array
import ast
from difflib import SequenceMatcher
import json
import math
from pathlib import Path
import re
import subprocess
import sys
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
TERMS = json.loads((Path(__file__).parent / "audio_terms.json").read_text(encoding="utf-8"))
RATE = 16000


def normalize(value):
    value = unicodedata.normalize("NFKC", value).lower()
    for before, after in sorted(TERMS["replacements"].items(), key=lambda item: -len(item[0])):
        value = value.replace(unicodedata.normalize("NFKC", before).lower(), after)
    return re.sub(r"[^\w\u3040-\u30ff\u3400-\u9fff]+", "", value)


def load_script(video):
    video_id = video.name.removesuffix("-narrated.mp4")
    if video.parent == ROOT / "assets/issue5/video":
        data = json.loads((video.parent / "narration.json").read_text(encoding="utf-8"))
        item = next((item for item in data["videos"] if item["id"] == video_id), None)
        if item is None:
            raise ValueError(f"No narration entry: {video_id}")
        return item["seconds"], item["lines"]
    source = video.parent / "render_narrated.py"
    if not source.exists():
        raise ValueError(f"No narration source: {source}")
    values = {}
    for statement in ast.parse(source.read_text(encoding="utf-8")).body:
        if isinstance(statement, ast.Assign):
            for target in statement.targets:
                if isinstance(target, ast.Name) and target.id in ("ID", "SECONDS", "LINES"):
                    values[target.id] = ast.literal_eval(statement.value)
    if values.get("ID") != video_id:
        raise ValueError(f"Video ID differs from narration source: {video_id}")
    return values["SECONDS"], values["LINES"]


def probe(video):
    result = subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format",
                             "-of", "json", str(video)], check=True, capture_output=True)
    return json.loads(result.stdout.decode("utf-8"))


def decode(video):
    result = subprocess.run(["ffmpeg", "-v", "error", "-i", str(video), "-vn", "-ac", "1",
                             "-ar", str(RATE), "-f", "s16le", "-"], check=True, capture_output=True)
    samples = array.array("h")
    samples.frombytes(result.stdout)
    return samples


def measure(samples):
    if not samples:
        return {"active_seconds": 0, "first_active_offset": None, "last_active_end": None,
                "peak_dbfs": -120, "rms_dbfs": -120, "clipped_samples": 0}
    peak = max(abs(value) for value in samples) / 32768
    rms = math.sqrt(sum(value * value for value in samples) / len(samples)) / 32768
    active = [offset for offset in range(0, len(samples), 320)
              if max(abs(value) for value in samples[offset:offset + 320]) > 260]
    return {"active_seconds": round(len(active) * .02, 2),
            "first_active_offset": round(active[0] / RATE, 2) if active else None,
            "last_active_end": round(min(len(samples), active[-1] + 320) / RATE, 2) if active else None,
            "peak_dbfs": round(20 * math.log10(max(peak, 1e-6)), 2),
            "rms_dbfs": round(20 * math.log10(max(rms, 1e-6)), 2),
            "clipped_samples": sum(abs(value) >= 32767 for value in samples)}


def compare(script, transcript):
    expected, actual = normalize(script), normalize(transcript)
    phonetic = []
    for term, aliases in TERMS.get("phonetic_aliases", {}).items():
        for alias in sorted(aliases, key=len, reverse=True):
            token = normalize(alias)
            if normalize(term) in expected and token in actual:
                actual = actual.replace(token, normalize(term))
                phonetic.append(term)
    ratio = SequenceMatcher(None, expected, actual).ratio()
    missing = [term for term in TERMS["critical_terms"] if normalize(term) in expected and normalize(term) not in actual]
    if not actual or ratio < .42 or len(actual) < len(expected) * .65 or missing:
        return "FAIL", ratio, missing, phonetic
    if ratio < .72 or phonetic:
        return "WARN", ratio, missing, phonetic
    return "PASS", ratio, missing, phonetic


def check(video, model):
    seconds, lines = load_script(video)
    if len(seconds) != len(lines) or not seconds:
        raise ValueError("Scene times and lines do not match")
    metadata = probe(video)
    streams = metadata["streams"]
    audio_streams = [stream for stream in streams if stream["codec_type"] == "audio"]
    if not audio_streams:
        return {"video": str(video.relative_to(ROOT)), "status": "FAIL", "reasons": ["No audio stream"]}
    duration = float(metadata["format"]["duration"])
    samples = decode(video)
    reasons = []
    if abs(duration - sum(seconds)) > .15:
        reasons.append(f"Duration {duration:.2f}s differs from script {sum(seconds)}s")
    scenes = []
    offset = 0
    for index, (length, line) in enumerate(zip(seconds, lines, strict=True), 1):
        clip = samples[round(offset * RATE):round((offset + length) * RATE)]
        metrics = measure(clip)
        import numpy as np
        audio = np.asarray(clip, dtype=np.float32) / 32768
        segments, _ = model.transcribe(audio, language="ja", beam_size=5,
                                       vad_filter=False, condition_on_previous_text=False)
        transcript = "".join(segment.text for segment in segments).strip()
        status, similarity, missing, phonetic = compare(line, transcript)
        prompted_transcript = None
        if missing:
            prompted, _ = model.transcribe(audio, language="ja", beam_size=5,
                                           vad_filter=False, condition_on_previous_text=False,
                                           initial_prompt="、".join(TERMS["critical_terms"]))
            prompted_transcript = "".join(segment.text for segment in prompted).strip()
            prompted_status, _, prompted_missing, _ = compare(line, prompted_transcript)
            if not prompted_missing and prompted_status != "FAIL":
                status = "WARN"
        scene_reasons = []
        if metrics["active_seconds"] < .15 or metrics["rms_dbfs"] < -45:
            scene_reasons.append("Silent or nearly silent scene")
        if metrics["clipped_samples"] > 0 or metrics["peak_dbfs"] > -.1:
            scene_reasons.append("Possible audio clipping")
        if metrics["last_active_end"] is not None and metrics["last_active_end"] >= length - .04:
            scene_reasons.append("Audio reaches scene boundary; possible overrun")
        if status == "FAIL":
            scene_reasons.append("Script/transcript mismatch" + (f": {', '.join(missing)}" if missing else ""))
        if scene_reasons:
            reasons.extend(f"Scene {index}: {reason}" for reason in scene_reasons)
        scenes.append({"scene": index, "seconds": length, "script": line, "transcript": transcript,
                       "prompted_transcript": prompted_transcript,
                       "similarity": round(similarity, 3), "status": status, "missing_critical_terms": missing,
                       "phonetic_asr_matches": phonetic,
                       **metrics})
        offset += length
    levels = [scene["rms_dbfs"] for scene in scenes]
    if max(levels) - min(levels) > 6:
        reasons.append("Scene RMS levels differ by more than 6 dB")
    status = "FAIL" if reasons else "WARN" if any(scene["status"] == "WARN" for scene in scenes) else "PASS"
    return {"video": video.relative_to(ROOT).as_posix(), "status": status, "duration_seconds": duration,
            "script_seconds": sum(seconds), "model": "faster-whisper/small, CPU int8, Japanese", "reasons": reasons,
            "scenes": scenes}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("videos", nargs="+", type=Path)
    parser.add_argument("--model", default="small")
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise SystemExit("Install locally: python -m pip install faster-whisper==1.2.1") from exc
    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    reports = [check(video.resolve(), model) for video in args.videos]
    output = {"tool": "check-video-audio.py", "offline_inference": True, "external_api_used": False,
              "model": args.model, "reports": reports}
    serialized = json.dumps(output, ensure_ascii=False, indent=2) + "\n"
    if args.report:
        args.report.write_text(serialized, encoding="utf-8")
    else:
        print(serialized)
    for report in reports:
        print(f'{report["status"]}: {report["video"]}', file=sys.stderr)
    return 1 if any(report["status"] == "FAIL" for report in reports) else 0


if __name__ == "__main__":
    raise SystemExit(main())
