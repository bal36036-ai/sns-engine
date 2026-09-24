"""Eight short videos: opening and ending frames for GitHub review."""

from pathlib import Path
import json
import subprocess
import tempfile
from PIL import Image

ROOT = Path(__file__).resolve().parent
FRAMES = ROOT / "frames"
IDS = [
    "20260924-tiktok-kiridori",
    "20260925-youtube-harinavi",
    "20260926-tiktok-kiridori",
    "20260927-tiktok-harinavi",
    "20260927-youtube-harinavi",
    "20260928-youtube-kiridori",
    "20260929-tiktok-harinavi",
    "20260930-youtube-kiridori",
]

sheet = Image.new("RGB", (1440, 2560), "#fffdf9")
all_scenes = Image.new("RGB", (1800, 5120), "#fffdf9")
manifest = json.loads((ROOT / "narration.json").read_text(encoding="utf-8"))
with tempfile.TemporaryDirectory(prefix="sns-issue5-review-") as temp:
    for position, video in enumerate(manifest["videos"]):
        start = 0
        for scene, seconds in enumerate(video["seconds"]):
            source = Path(temp) / "frame.png"
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", str(start + 0.5),
                "-i", str(ROOT / f'{video["id"]}-narrated.mp4'), "-frames:v", "1", str(source)], check=True)
            with Image.open(source) as frame:
                thumbnail = frame.convert("RGB").resize((360, 640), Image.Resampling.LANCZOS)
            all_scenes.paste(thumbnail, (scene * 360, position * 640))
            if scene in (0, 4):
                column = position % 2 * 2 + (1 if scene == 4 else 0)
                sheet.paste(thumbnail, (column * 360, position // 2 * 640))
            start += seconds

out = ROOT / "contact_sheet.jpg"
sheet.save(out, quality=90, subsampling=0)
print(out)
all_scenes.save(ROOT / "scenes_review.jpg", quality=90, subsampling=0)
