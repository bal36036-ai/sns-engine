"""Crop verified app screenshots to the result areas used in short videos."""

from pathlib import Path
from PIL import Image

SOURCE = Path(__file__).resolve().parent / "source"
CROPS = [
    ("kiridori-results-card.png", (0, 240, 516, 731), "kiridori-stocks.png", (516, 731)),
    ("harinavi-results.png", (10, 400, 530, 960), "harinavi-results-focus.png", (540, 960)),
]

for filename, region, output, expected in CROPS:
    with Image.open(SOURCE / filename) as screen:
        if screen.size != expected:
            raise ValueError(f"{filename}: expected {expected}, got {screen.size}; inspect current UI first")
        screen.crop(region).save(SOURCE / output)
    print(output)
