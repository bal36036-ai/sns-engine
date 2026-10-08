"""各場面の中ほど（と最後近く）のフレームを静止画にして、1枚の確認用シートにする。使い方：python tools/sheet.py v1 [出力png]"""
import json, subprocess, sys
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parent.parent
name = sys.argv[1]
props = json.loads((root / "props" / f"{name}.json").read_text(encoding="utf-8"))
(root / "out" / "stills").mkdir(parents=True, exist_ok=True)
frames, acc = [], 0
for s in props["scenes"]:
    frames.append(acc + s["frames"] - 30)  # 場面の終わり近く（枠・字幕が出そろった状態）
    acc += s["frames"]
files = []
for f in frames:
    out = root / "out" / "stills" / f"{name}-{f}.png"
    subprocess.run(["npx", "remotion", "still", "SpecVideo", str(out), f"--props=props/{name}.json", f"--frame={f}", "--log=error"], cwd=root, shell=True, check=True)
    files.append(out)
ims = [Image.open(f).convert("RGB").resize((540, 540)) for f in files]
cols = 3
rows = (len(ims) + cols - 1) // cols
sh = Image.new("RGB", (540 * cols, 540 * rows), "white")
for i, im in enumerate(ims):
    sh.paste(im, ((i % cols) * 540, (i // cols) * 540))
sh.save(sys.argv[2] if len(sys.argv) > 2 else root / "out" / f"{name}-sheet.png")
