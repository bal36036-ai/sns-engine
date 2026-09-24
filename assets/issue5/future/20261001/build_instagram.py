"""Render the October 1 Instagram draft with the verified Harinavi screenshots."""

import importlib.util
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
SHARED = HERE.parents[1] / "instagram" / "build_carousels.py"
spec = importlib.util.spec_from_file_location("issue5_carousels", SHARED)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.ROOT = HERE
module.REAL_SCREENS["20261001"] = {
    3: [("harinavi-span-card.png", "スパン長 3,000mm の入力画面", None, None),
        ("harinavi-load-card.png", "吊り荷 2t の入力画面", None, None)],
    4: [("harinavi-check-card.png", "曲げ応力の結果表示", None, None)],
}
post = {
    "app": "ハリナビ", "topic": "梁の確認", "accent": module.TEAL,
    "slides": [
        ("梁の確認、結果を見る前に\n何をそろえる？", "まず元の条件から。数字だけを切り離さずに見ます。", "question"),
        ("入力前に材料・寸法などを確認", "どの条件で確かめるか、先に整理します。", "conditions"),
        ("画面に入れた条件を見返す", "実画面の例：スパン長 3,000mm、吊り荷 2t。", "conditions"),
        ("条件と結果をセットで読む", "同じ例の曲げ応力の結果です。", "checks"),
        ("まず条件、その次に結果。\n順番をそろえる", "ハリナビは一次照査の補助。最終判断は専門家へ。", "safety"),
    ],
}
files = [module.make_slide("20261001", post, i, slide)
         for i, slide in enumerate(post["slides"], 1)]
sheet = Image.new("RGB", (1500, 375), module.WHITE)
for index, path in enumerate(files):
    with Image.open(path) as slide:
        sheet.paste(slide.resize((300, 375), Image.Resampling.LANCZOS), (index * 300, 0))
sheet.save(HERE / "20261001-instagram-contact.jpg", quality=90)
print("Created", len(files), "slides and contact sheet")
