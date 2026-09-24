"""Issue #5 初週 Instagram 下書き画像を再生成する。

実画面を模した表示・未確認の計算結果は使わない。図は説明図と表示する。
Python Pillow と Windows の Noto Sans JP を使用する。
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
SIZE = (1080, 1350)
NAVY = "#19313d"
ORANGE = "#d76426"
TEAL = "#267f79"
PAPER = "#f8f5ee"
WHITE = "#fffdf9"
MUTED = "#60717a"
LINE = "#cbd2cf"
FONT = Path("C:/Windows/Fonts/NotoSansJP-VF.ttf")

POSTS = {
    "20260924": {
        "app": "キリドリ", "topic": "材料取りの二つの作業", "accent": ORANGE,
        "slides": [
            ("材料の長さを拾いながら、\n切り方まで考えていませんか？", "数える作業と、組み合わせる作業。頭の中で同時に進みがちです。", "ruler"),
            ("まず、必要な部材を数える", "長さと本数を一度書き出す。ここが計画の出発点です。", "list"),
            ("次に、定尺へ組み合わせる", "どの材料から、どの部材を切るか。条件を見ながら考えます。", "bars"),
            ("入力条件と切り出し案を\n図で見返す", "キリドリでは、条件を入れて切り出し案を確認できます。", "flow"),
            ("頭の中だけで追わず、\nあとで見返せる形に", "次の投稿では、切り出し案の見方を紹介します。保存しておいてください。", "save"),
        ],
    },
    "20260927": {
        "app": "ハリナビ", "topic": "梁の一次照査", "accent": TEAL,
        "slides": [
            ("梁の検討、結果の数字だけで\n終わらせないために", "どんな条件で確かめたか。結果と一緒にたどることが大切です。", "beam"),
            ("まず、入力した条件を見る", "梁の検討に使った条件を確認します。", "conditions"),
            ("次に、確認項目と結果を見る", "どの項目を見た結果なのか、順に確かめます。", "checks"),
            ("ハリナビは\n一次照査の作業を補助", "条件と結果を見返すための道具として作っています。", "flow"),
            ("条件と結果を\nセットで確認", "安全の最終判断は、現場の条件を確認した専門家が行います。", "safety"),
        ],
    },
    "20260928": {
        "app": "キリドリ", "topic": "紙メモと計画画面", "accent": ORANGE,
        "slides": [
            ("紙のメモと計画画面、\n並べてみる", "同じ材料取りでも、見る目的は少し違います。", "split"),
            ("紙のメモで\n長さと本数を拾う", "現場で書き留めた必要部材を、まず整理します。", "memo"),
            ("メモした条件を入力する", "定尺と必要な部材。切り方を考えるための条件をそろえます。", "conditions"),
            ("切り出し案を図で見る", "入力した条件から、材料ごとの切り方を確かめます。", "bars"),
            ("拾う → 組み合わせる", "紙と画面の役割を見返せるように、この投稿を保存。", "save"),
        ],
    },
    "20260929": {
        "app": "ハリナビ", "topic": "数字の読み方", "accent": TEAL,
        "slides": [
            ("この数字、\nどこから読めばいい？", "専門的な結果ほど、読む順番があると見返しやすくなります。", "question"),
            ("最初に、入力した条件", "どんな前提で計算したかを確認します。", "conditions"),
            ("次に、確認した項目", "何を確かめた数字なのかを追います。", "checks"),
            ("結果は条件とセットで読む", "数字だけを切り離さず、元の条件に戻れるように。", "flow"),
            ("条件 → 項目 → 結果", "この順番を、あとで見返せるよう保存。最終判断は専門家へ。", "safety"),
        ],
    },
    "20260930": {
        "app": "キリドリ", "topic": "材料取りの入力", "accent": ORANGE,
        "slides": [
            ("材料取り計画、\n最初に何を入れる？", "結果を見る前に、切る条件をそろえるところから。", "ruler"),
            ("1　使う定尺の長さ", "どの長さの材料から切り出すかを入力します。", "stock"),
            ("2　必要な部材の\n長さと本数", "作りたい部材の条件を入力します。", "list"),
            ("3　刃幅などの条件", "切るときのロスも確かめてから、結果へ進みます。", "kerf"),
            ("条件をそろえて、\n切り出し案を見る", "入力項目を見返せるよう保存。次は結果画面の見方へ。", "save"),
        ],
    },
}


def font(px: int, bold: bool = False):
    f = ImageFont.truetype(str(FONT), px, index=0)
    f.set_variation_by_axes([700 if bold else 470])
    return f


def wrap(draw, text, fnt, max_width):
    lines = []
    for paragraph in text.split("\n"):
        line = ""
        for ch in paragraph:
            if draw.textbbox((0, 0), line + ch, font=fnt)[2] > max_width and line:
                lines.append(line)
                line = ch
            else:
                line += ch
        lines.append(line)
    return lines


def text_block(draw, xy, text, fnt, fill, width, gap=15):
    x, y = xy
    for line in wrap(draw, text, fnt, width):
        draw.text((x, y), line, font=fnt, fill=fill, stroke_width=0)
        y += fnt.size + gap
    return y


def rule(draw, x1, y1, x2, y2, color=LINE, width=3):
    draw.line((x1, y1, x2, y2), fill=color, width=width)


def rounded(draw, box, fill, outline=None, radius=18, width=3):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def icon(draw, kind, accent):
    """中央の説明図。どの描画もアプリ画面・計算結果の再現ではない。"""
    left, top, right, bottom = 92, 690, 988, 1110
    rounded(draw, (left, top, right, bottom), WHITE, LINE, 22, 2)
    draw.text((left + 30, top + 25), "説明図 / 画面表示ではありません", font=font(24), fill=MUTED)
    if kind in ("ruler", "stock"):
        y = 880
        rule(draw, 175, y, 900, y, NAVY, 12)
        for i in range(11):
            x = 175 + i * 72
            rule(draw, x, y - (52 if i % 2 == 0 else 34), x, y + 8, NAVY, 4)
        draw.text((175, 950), "定尺の長さを確認", font=font(39), fill=NAVY)
    elif kind == "list":
        for i, label in enumerate(["部材の長さ", "必要な本数", "入力条件を確認"]):
            y = 785 + i * 95
            rounded(draw, (160, y, 920, y + 66), PAPER, None, 10)
            draw.ellipse((180, y + 19, 208, y + 47), fill=accent)
            draw.text((235, y + 10), label, font=font(39), fill=NAVY)
    elif kind == "bars":
        draw.text((160, 780), "一本の材料", font=font(36), fill=NAVY)
        rounded(draw, (160, 850, 920, 950), PAPER, NAVY, 12, 3)
        draw.rectangle((162, 852, 490, 948), fill=accent)
        draw.rectangle((495, 852, 760, 948), fill=TEAL)
        draw.text((240, 865), "部材 A", font=font(35), fill=WHITE)
        draw.text((555, 865), "部材 B", font=font(35), fill=WHITE)
        draw.text((780, 972), "残り", font=font(30), fill=MUTED)
    elif kind == "flow":
        labels = ["入力条件", "確認項目", "結果"]
        for i, label in enumerate(labels):
            x = 130 + i * 300
            rounded(draw, (x, 835, x + 230, 950), PAPER, accent, 14, 3)
            draw.text((x + 26, 865), label, font=font(35), fill=NAVY)
            if i < 2:
                draw.text((x + 245, 862), "→", font=font(54), fill=accent)
    elif kind == "save":
        for i, label in enumerate(["条件を確認", "結果を見返す", "次の投稿へ"]):
            y = 788 + i * 96
            draw.text((165, y), f"0{i+1}", font=font(35), fill=accent)
            draw.text((270, y), label, font=font(40), fill=NAVY)
            rule(draw, 160, y + 62, 910, y + 62)
    elif kind == "beam":
        draw.polygon([(220, 835), (870, 835), (870, 865), (220, 865)], fill=NAVY)
        draw.polygon([(510, 865), (580, 865), (580, 1000), (510, 1000)], fill=NAVY)
        draw.polygon([(220, 1000), (870, 1000), (870, 1030), (220, 1030)], fill=NAVY)
        draw.text((300, 755), "入力した条件 → 確認した結果", font=font(34), fill=accent)
    elif kind in ("conditions", "checks"):
        labels = ["前提条件", "対象項目", "確認"] if kind == "conditions" else ["確認項目", "結果", "元の条件"]
        for i, label in enumerate(labels):
            x = 155 + i * 280
            rounded(draw, (x, 820, x + 220, 960), PAPER, LINE, 14, 2)
            draw.text((x + 22, 863), label, font=font(34), fill=NAVY)
        rule(draw, 180, 1015, 900, 1015, accent, 4)
    elif kind == "safety":
        draw.text((175, 780), "確認の順番", font=font(32), fill=MUTED)
        draw.text((175, 845), "条件 → 項目 → 結果", font=font(52), fill=NAVY)
        rule(draw, 175, 930, 910, 930, accent, 5)
        draw.text((175, 970), "最終判断は専門家へ", font=font(37), fill=accent)
    elif kind == "split":
        rounded(draw, (145, 795, 495, 995), PAPER, LINE, 12, 2)
        rounded(draw, (585, 795, 935, 995), PAPER, LINE, 12, 2)
        draw.text((245, 845), "紙メモ", font=font(41), fill=NAVY)
        draw.text((625, 845), "計画の図", font=font(41), fill=NAVY)
        draw.text((517, 856), "→", font=font(45), fill=accent)
    elif kind == "memo":
        rounded(draw, (235, 760, 845, 1040), PAPER, LINE, 6, 2)
        for i, line in enumerate(["説明用の架空例", "部材 A　1,200 mm × 2本", "部材 B　800 mm × 1本"]):
            draw.text((275, 805 + 75 * i), line, font=font(32 if i else 28), fill=NAVY if i else accent)
            if i:
                rule(draw, 275, 865 + 75 * i, 805, 865 + 75 * i)
    elif kind == "question":
        draw.text((390, 745), "?", font=font(180), fill=accent)
        draw.text((245, 975), "読む順番をたどる", font=font(41), fill=NAVY)
    elif kind == "kerf":
        rounded(draw, (160, 835, 910, 960), PAPER, LINE, 10, 2)
        draw.rectangle((162, 837, 500, 958), fill=TEAL)
        draw.rectangle((516, 837, 908, 958), fill=ORANGE)
        draw.text((465, 770), "刃幅", font=font(38), fill=NAVY)
        rule(draw, 503, 823, 503, 982, NAVY, 3)
        rule(draw, 513, 823, 513, 982, NAVY, 3)


def make_slide(date, cfg, index, item):
    title, sub, motif = item
    accent = cfg["accent"]
    im = Image.new("RGB", SIZE, PAPER)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 22, 1350), fill=accent)
    d.text((88, 72), "げんばアプリ工房", font=font(31), fill=NAVY)
    d.text((88, 120), cfg["app"], font=font(24), fill=accent)
    d.text((770, 80), cfg["topic"], font=font(24), fill=MUTED)
    rule(d, 88, 169, 988, 169, LINE, 2)
    d.text((88, 222), f"{index:02d} / 05", font=font(34), fill=accent)
    longest = max(map(len, title.split("\n")))
    title_font = font(50 if longest > 16 else (57 if longest > 13 else 67), True)
    end = text_block(d, (88, 300), title, title_font, NAVY, 900, 18)
    text_block(d, (91, end + 48), sub, font(29), MUTED, 885, 11)
    icon(d, motif, accent)
    rule(d, 88, 1205, 988, 1205, LINE, 2)
    d.text((88, 1234), f"{date[:4]}.{date[4:6]}.{date[6:]}  ·  {cfg['app']}", font=font(24), fill=MUTED)
    d.text((842, 1230), f"{index} / 5", font=font(30), fill=accent)
    out = ROOT / f"{date}_instagram_{index:02d}.png"
    im.save(out, optimize=True)
    return out


if __name__ == "__main__":
    files = [make_slide(date, cfg, i, slide)
             for date, cfg in POSTS.items()
             for i, slide in enumerate(cfg["slides"], 1)]
    print(f"created {len(files)} PNG files in {ROOT}")
