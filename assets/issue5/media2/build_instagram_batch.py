"""stage27の本文に合わせたInstagram画像（各5枚）を、構成データ spec-media.json から作る。

- 既存 instagram/build_carousels.py の描画関数（font/text_block/rule/rounded/icon）を再利用する。
- 実画面は media2/source（capture-source-v2.cjs で現行版 kiridori_v65 / harinavi_v57 から取得）だけを使う。
- 画像に日付・媒体名は入れない（予定が繰り延べられても投稿日とずれないように）。
- 出力：media2/instagram/<投稿ID>_instagram_0N.png

モチーフ（各スライドの3要素目）:
  real:<file>                         実画面1枚
  pair:<fileA>|<labelA>|<fileB>|<labelB>  実画面2枚を上下に（比較）
  ask:<text>                          大きな「？」と一言（説明図）
  labels:<A>|<B>|<C>                  3つの箱（説明図）
  memo:<見出し>|<行1>|<行2>...        手書きメモ風（説明用の架空例）
  close:<大きい一言>|<補足>            まとめ（説明図）
使い方：python build_instagram_batch.py [投稿ID ...]
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "instagram"))
import build_carousels as base  # noqa: E402

SOURCE = HERE / "source"
OUT = HERE / "instagram"
OUT.mkdir(exist_ok=True)
SPEC = json.loads((HERE / "spec-media.json").read_text(encoding="utf-8"))
ACCENT = {"キリドリ": base.ORANGE, "ハリナビ": base.TEAL}
CARD = (92, 640, 988, 1150)


def card(draw, label):
    base.rounded(draw, CARD, base.WHITE, base.LINE, 22, 2)
    draw.text((CARD[0] + 30, CARD[1] + 22), label, font=base.font(24), fill=base.MUTED)


def paste_screen(im, draw, name, box, accent, label=None):
    path = SOURCE / name
    if not path.is_file():
        raise FileNotFoundError(path)
    left, top, right, bottom = box
    if label:
        draw.text((left, top), label, font=base.font(23, True), fill=base.NAVY)
        top += 36
    with Image.open(path) as src:
        src = src.convert("RGB")
        scale = min((right - left) / src.width, (bottom - top) / src.height, 2.0)
        w, h = round(src.width * scale), round(src.height * scale)
        screen = src.resize((w, h), Image.Resampling.LANCZOS)
    x = left + (right - left - w) // 2
    y = top + (bottom - top - h) // 2
    im.paste(screen, (x, y))
    draw.rounded_rectangle((x - 3, y - 3, x + w + 3, y + h + 3), radius=9, outline=accent, width=4)


def motif(im, draw, spec, accent):
    kind, _, arg = spec.partition(":")
    parts = arg.split("|") if arg else []
    if kind == "real":
        base.rounded(draw, CARD, base.WHITE, base.LINE, 22, 2)
        draw.text((CARD[0] + 30, CARD[1] + 22), "実アプリ画面 / 動作確認用の例", font=base.font(26, True), fill=accent)
        paste_screen(im, draw, parts[0], (CARD[0] + 34, CARD[1] + 80, CARD[2] - 34, CARD[3] - 70), accent)
        draw.text((CARD[0] + 30, CARD[3] - 50), "画面の数値は架空条件による動作確認例", font=base.font(21), fill=base.MUTED)
    elif kind == "pair":
        base.rounded(draw, CARD, base.WHITE, base.LINE, 22, 2)
        draw.text((CARD[0] + 30, CARD[1] + 22), "実アプリ画面 / 同じ入力の動作確認例", font=base.font(26, True), fill=accent)
        mid = (CARD[1] + 80 + CARD[3] - 60) // 2
        paste_screen(im, draw, parts[0], (CARD[0] + 34, CARD[1] + 76, CARD[2] - 34, mid - 10), accent, parts[1])
        paste_screen(im, draw, parts[2], (CARD[0] + 34, mid + 10, CARD[2] - 34, CARD[3] - 56), accent, parts[3])
        draw.text((CARD[0] + 30, CARD[3] - 46), "画面の数値は架空条件による動作確認例", font=base.font(21), fill=base.MUTED)
    elif kind == "ask":
        card(draw, "説明図 / 画面表示ではありません")
        draw.text((470, 700), "?", font=base.font(190), fill=accent)
        base.text_block(draw, (170, 960), parts[0], base.font(40), base.NAVY, 740, 12)
    elif kind == "labels":
        card(draw, "説明図 / 画面表示ではありません")
        n = len(parts)
        width = (CARD[2] - CARD[0] - 100 - 30 * (n - 1)) // n
        for i, label in enumerate(parts):
            x = CARD[0] + 50 + i * (width + 30)
            base.rounded(draw, (x, 820, x + width, 960), base.PAPER, base.LINE, 14, 2)
            fnt = base.font(34 if len(label) <= 5 else 28)
            tw = draw.textlength(label, font=fnt)
            draw.text((x + (width - tw) / 2, 866), label, font=fnt, fill=base.NAVY)
            if i < n - 1:
                draw.text((x + width + 4, 866), "→", font=base.font(26), fill=accent)
        base.rule(draw, 180, 1030, 900, 1030, accent, 4)
    elif kind == "memo":
        card(draw, "説明図 / 画面表示ではありません")
        base.rounded(draw, (225, 715, 855, 1110), base.PAPER, base.LINE, 6, 2)
        draw.text((265, 745), "説明用の架空例", font=base.font(26), fill=accent)
        draw.text((265, 790), parts[0], font=base.font(36, True), fill=base.NAVY)
        for i, line in enumerate(parts[1:]):
            y = 860 + i * 68
            draw.text((265, y), line, font=base.font(31), fill=base.NAVY)
            base.rule(draw, 265, y + 52, 815, y + 52)
    elif kind == "close":
        card(draw, "説明図 / 画面表示ではありません")
        draw.text((170, 750), "今回の要点", font=base.font(32), fill=base.MUTED)
        end = base.text_block(draw, (170, 810), parts[0], base.font(50, True), base.NAVY, 740, 14)
        base.rule(draw, 170, end + 24, 910, end + 24, accent, 5)
        if len(parts) > 1:
            base.text_block(draw, (170, end + 54), parts[1], base.font(34), accent, 740, 10)
    else:
        raise ValueError(f"unknown motif: {spec}")


def make_slide(post_id, cfg, index, slide):
    title, sub, spec = slide
    accent = ACCENT[cfg["app"]]
    im = Image.new("RGB", base.SIZE, base.PAPER)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 22, 1350), fill=accent)
    d.text((88, 72), "げんばアプリ工房", font=base.font(31), fill=base.NAVY)
    d.text((88, 120), cfg["app"], font=base.font(24), fill=accent)
    topic_font = base.font(24)
    d.text((988 - d.textlength(cfg["topic"], font=topic_font), 80), cfg["topic"], font=topic_font, fill=base.MUTED)
    base.rule(d, 88, 169, 988, 169, base.LINE, 2)
    d.text((88, 222), f"{index:02d} / {len(cfg['slides']):02d}", font=base.font(34), fill=accent)
    longest = max(map(len, title.split("\n")))
    title_font = base.font(50 if longest > 16 else (57 if longest > 13 else 67), True)
    end = base.text_block(d, (88, 290), title, title_font, base.NAVY, 900, 18)
    base.text_block(d, (91, end + 30), sub, base.font(29), base.MUTED, 885, 11)
    motif(im, d, spec, accent)
    base.rule(d, 88, 1205, 988, 1205, base.LINE, 2)
    d.text((88, 1234), f"げんばアプリ工房  ·  {cfg['app']}", font=base.font(24), fill=base.MUTED)
    d.text((842, 1230), f"{index} / {len(cfg['slides'])}", font=base.font(30), fill=accent)
    out = OUT / f"{post_id}_instagram_{index:02d}.png"
    im.save(out, optimize=True)
    return out


if __name__ == "__main__":
    wanted = set(sys.argv[1:])
    posts = {k: v for k, v in SPEC["instagram"].items() if not wanted or k in wanted}
    made = [make_slide(pid, cfg, i, s) for pid, cfg in posts.items() for i, s in enumerate(cfg["slides"], 1)]
    for pid, cfg in posts.items():
        slides = [OUT / f"{pid}_instagram_{i:02d}.png" for i in range(1, len(cfg["slides"]) + 1)]
        sheet = Image.new("RGB", (1500, 375), base.WHITE)
        for n, p in enumerate(slides):
            with Image.open(p) as s:
                sheet.paste(s.resize((300, 375), Image.Resampling.LANCZOS), (n * 300, 0))
        sheet.save(OUT / f"{pid}_contact.jpg", quality=88)
    print(f"created {len(made)} PNG files for {len(posts)} posts")
