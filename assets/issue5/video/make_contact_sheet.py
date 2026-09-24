"""Eight short videos: opening and ending frames for GitHub review."""

from pathlib import Path
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
for position, video_id in enumerate(IDS):
    for offset, frame_index in enumerate((1, 5)):
        source = FRAMES / f"{video_id}-{frame_index}.png"
        with Image.open(source) as frame:
            thumbnail = frame.convert("RGB").resize((360, 640), Image.Resampling.LANCZOS)
        column = position % 2 * 2 + offset
        row = position // 2
        sheet.paste(thumbnail, (column * 360, row * 640))

out = ROOT / "contact_sheet.jpg"
sheet.save(out, quality=90, subsampling=0)
print(out)
