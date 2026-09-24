"""Measure existing narration; no synthesis, uploads, or subjective listening claims."""
import array
import json
import math
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
manifest = json.loads((ROOT / "narration.json").read_text(encoding="utf-8"))
RATE = 16000
WINDOW = 320  # 20 ms


def db(value):
    return 20 * math.log10(max(value, 1e-10))


results = []
for video in manifest["videos"]:
    raw = subprocess.check_output([
        "ffmpeg", "-v", "error", "-i", str(ROOT / f'{video["id"]}-narrated.mp4'),
        "-vn", "-ac", "1", "-ar", str(RATE), "-f", "s16le", "-"
    ])
    samples = array.array("h", raw)
    scenes = []
    start = 0
    for seconds, line in zip(video["seconds"], video["lines"], strict=True):
        clip = samples[round(start * RATE):round((start + seconds) * RATE)]
        windows = []
        for position in range(0, len(clip), WINDOW):
            values = clip[position:position + WINDOW]
            rms = math.sqrt(sum(v * v for v in values) / len(values)) / 32768
            windows.append((position / RATE, db(rms)))
        active = [(time, level) for time, level in windows if level > -42]
        if not active:
            raise RuntimeError(f'{video["id"]}: scene at {start}s has no detected speech')
        leading = active[0][0]
        trailing = max(0, seconds - active[-1][0] - 0.02)
        active_rms = 10 * math.log10(sum(10 ** (level / 10) for _, level in active) / len(active))
        peak = db(max(abs(v) for v in clip) / 32768)
        scenes.append({"start": start, "seconds": seconds, "script": line,
            "speech_start_offset": round(leading, 3), "end_silence_seconds": round(trailing, 3),
            "active_rms_dbfs": round(active_rms, 2), "peak_dbfs": round(peak, 2),
            "clipped_samples": sum(abs(v) >= 32767 for v in clip)})
        start += seconds
    results.append({"id": video["id"], "scenes": scenes,
        "scene_active_rms_range_db": round(max(s["active_rms_dbfs"] for s in scenes) - min(s["active_rms_dbfs"] for s in scenes), 2)})

result = {
    "scope": "decoded waveform measurements only; not a perceptual or pronunciation review",
    "speech_detection_threshold_dbfs": -42,
    "window_seconds": 0.02,
    "voice": manifest["voice"], "speaker_id": manifest["speaker_id"],
    "subjective_listening": "not_performed_no_audio_perception_tool",
    "videos": results
}
(ROOT / "audio-review.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
for video in results:
    print(video["id"], "RMS range", video["scene_active_rms_range_db"],
          "start", [s["speech_start_offset"] for s in video["scenes"]],
          "end", [s["end_silence_seconds"] for s in video["scenes"]],
          "clipped", sum(s["clipped_samples"] for s in video["scenes"]))
