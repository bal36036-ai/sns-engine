"""Issue #5 続き（stage27バッチ）Instagram 下書き画像を生成する。

既存 build_carousels.py の関数（font/wrap/text_block/rule/rounded/real_screen_card/make_slide）を
再利用し、画像・投稿内容だけをこのファイルで新規定義する。既存の POSTS・REAL_SCREENS・
02260924〜0930 の画像は一切変更しない（別名で書き出す）。
"""

from pathlib import Path

import build_carousels as base

ROOT = Path(__file__).resolve().parent
base.SOURCE = ROOT.parent / "media2" / "source"  # v2の実画面クロップはここ

POSTS = {
    "20261004": {
        "app": "ハリナビ", "topic": "条件を確認してから結果へ", "accent": base.TEAL,
        "slides": [
            ("結果を見る前に、\n条件はそろってる？", "荷重・スパン・支持条件を順に確認してから結果を見る流れです。", "question"),
            ("まず、吊り荷の条件", "現在入力されている吊り荷の質量を確認します。", "real:harinavi-load-card.png"),
            ("次に、スパンの条件", "梁のスパン長を確認します。", "real:harinavi-span-card.png"),
            ("そして、支持条件", "単純支持・両端固定・片持ちのどれかを選びます。", "real:harinavi-support-card.png"),
            ("前提 → 結果の順で確認", "一次照査を補助する画面です。最終判断は専門家が行います。", "safety"),
        ],
    },
}

REAL_SCREENS = {}  # このv2では real: プレフィックス方式を使うため未使用


def icon(draw, kind, accent):
    if kind.startswith("real:"):
        name = kind.split(":", 1)[1]
        left, top, right, bottom = 92, 690, 988, 1110
        base.rounded(draw, (left, top, right, bottom), base.WHITE, base.LINE, 22, 2)
        draw.text((left + 30, top + 25), "実アプリ画面 / 動作確認用の例", font=base.font(24, True), fill=accent)
        path = base.SOURCE / name
        if not path.is_file():
            raise FileNotFoundError(path)
        from PIL import Image
        with Image.open(path) as source:
            source = source.convert("RGB")
            max_width, max_height = right - left - 60, bottom - top - 110
            scale = min(max_width / source.width, max_height / source.height, 2.2)
            w, h = round(source.width * scale), round(source.height * scale)
            screen = source.resize((w, h), Image.Resampling.LANCZOS)
        x = left + (right - left - w) // 2
        y = top + 75 + (max_height - h) // 2
        draw.image = None  # no-op, PIL Image passed via base.icon's caller image var isn't accessible here
        return ("paste", screen, x, y, w, h)
    return base.icon(draw, kind, accent)


def make_slide(date, cfg, index, item):
    title, sub, motif = item
    accent = cfg["accent"]
    from PIL import Image, ImageDraw
    im = Image.new("RGB", base.SIZE, base.PAPER)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 22, 1350), fill=accent)
    d.text((88, 72), "げんばアプリ工房", font=base.font(31), fill=base.NAVY)
    d.text((88, 120), cfg["app"], font=base.font(24), fill=accent)
    d.text((770, 80), cfg["topic"], font=base.font(24), fill=base.MUTED)
    base.rule(d, 88, 169, 988, 169, base.LINE, 2)
    d.text((88, 222), f"{index:02d} / 05", font=base.font(34), fill=accent)
    longest = max(map(len, title.split("\n")))
    title_font = base.font(50 if longest > 16 else (57 if longest > 13 else 67), True)
    end = base.text_block(d, (88, 300), title, title_font, base.NAVY, 900, 18)
    base.text_block(d, (91, end + 48), sub, base.font(29), base.MUTED, 885, 11)

    result = icon(d, motif, accent)
    if isinstance(result, tuple) and result[0] == "paste":
        _, screen, x, y, w, h = result
        im.paste(screen, (x, y))
        d.rounded_rectangle((x - 3, y - 3, x + w + 3, y + h + 3), radius=9, outline=base.LINE, width=3)
        d.text((92 + 30, 690 + 55), "色枠は見る場所を示す注釈です", font=base.font(20), fill=base.MUTED)

    base.rule(d, 88, 1205, 988, 1205, base.LINE, 2)
    d.text((88, 1234), f"{date[:4]}.{date[4:6]}.{date[6:]}  ·  {cfg['app']}", font=base.font(24), fill=base.MUTED)
    d.text((842, 1230), f"{index} / 5", font=base.font(30), fill=accent)
    out = ROOT / f"{date}_instagram_{index:02d}-v2.png"
    im.save(out, optimize=True)
    return out


if __name__ == "__main__":
    files = [make_slide(date, cfg, i, slide)
             for date, cfg in POSTS.items()
             for i, slide in enumerate(cfg["slides"], 1)]
    print(f"created {len(files)} PNG files:")
    for f in files:
        print(" ", f.name)
