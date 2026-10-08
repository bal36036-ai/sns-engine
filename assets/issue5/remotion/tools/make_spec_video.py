"""2026-10-10以降の動画（V1〜V5）の声と台本データ（props/*.json）を作る。
- 声：ローカルの VOICEVOX Nemo 0.24.0（127.0.0.1:50121）、女声1・ノーマル（speaker 10005）。専門語はひらがなで書く（読み間違い防止）。小数はカタカナで1桁ずつ（「れいてんはち…」は「は」を「わ」と読まれた。2026-10-09）。
- 画面：public/screens（キリドリ v66）・public/screens-h（ハリナビ V26.09.064）の実画面の切り抜き。
- 声の中の「|」は、画面に枠や画像を出す時刻の目印（VOICEVOXの音の長さから時刻を計算する）。
使い方：VOICEVOX Nemo を起動してから  python tools/make_spec_video.py [v1 v2 ...]
"""
import json
import math
import sys
import urllib.parse
import urllib.request
import wave
from pathlib import Path

import numpy as np

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
ENDPOINT = "http://127.0.0.1:50121"
VOICE = 10005
FPS = 30
SPEED = 1.08
LEAD = 14  # 声が始まるまでのフレーム
TAIL = 0.7
KIRI_NOTE = ["キリドリの実際の画面（動作確認用の例）"]
HARI_NOTE = ["ハリナビの実際の画面（動作確認用の例）", "一次照査の補助です。最終判断は専門家。"]


def api(path, data=None, ctype=None):
    req = urllib.request.Request(ENDPOINT + path, data=data, method="POST" if data is not None else "GET")
    if ctype:
        req.add_header("Content-Type", ctype)
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def query(text):
    return json.loads(api("/audio_query?" + urllib.parse.urlencode({"text": text, "speaker": VOICE}), b""))


def seg_seconds(text):
    q = query(text)
    t = 0.0
    for ap in q["accent_phrases"]:
        for m in ap["moras"]:
            t += (m.get("consonant_length") or 0) + (m.get("vowel_length") or 0)
        if ap.get("pause_mora"):
            t += ap["pause_mora"]["vowel_length"]
    return t / SPEED


def synth(text, path):
    q = query(text)
    q.update({"speedScale": SPEED, "intonationScale": 1.08, "prePhonemeLength": 0.05, "postPhonemeLength": 0.08})
    path.write_bytes(api(f"/synthesis?speaker={VOICE}", json.dumps(q, ensure_ascii=False).encode("utf-8"), "application/json"))
    with wave.open(str(path), "rb") as w:
        return w.getnframes() / w.getframerate()


class Img:
    """画面の切り抜き1枚。width は見せる幅（px）。crop は (x, y, w, h) の割合。"""

    def __init__(self, dir_, file, width, crop=None, label=None, appear=None, hide=None, marks=None):
        self.dir, self.file, self.width, self.crop, self.label, self.appear, self.hide, self.marks = dir_, file, width, crop, label, appear, hide, marks or []
        self.srcW, self.srcH = Image.open(PUB / dir_ / file).size
        self.left = self.top = 0

    def height(self):
        c = self.crop or (0, 0, 1, 1)
        return round(c[3] * self.srcH * self.width / (c[2] * self.srcW))


def K(file, width, **kw):
    return Img("screens", file, width, **kw)


def H(file, width, **kw):
    return Img("screens-h", file, width, **kw)


def stack(items, top, gap=16, label_h=50):
    y = top
    for i, it in enumerate(items):
        if it.label:
            y += label_h
        it.top, it.left = y, round((1080 - it.width) / 2)
        y += it.height() + gap
        if it.appear is None:
            it.appear = 10 + i * 14
    return items


def row(items, top, gap=30):
    total = sum(i.width for i in items) + gap * (len(items) - 1)
    x = round((1080 - total) / 2)
    for i, it in enumerate(items):
        it.left, it.top = x, top + (50 if it.label else 0)
        x += it.width + gap
        if it.appear is None:
            it.appear = 10 + i * 12
    return items


def place(it, left, top, appear):
    it.left, it.top, it.appear = left, top, appear
    return it


# 結果まとめ画面（summary-*.png、1032×460）の枠の位置（割合）
M_STOCKS = (0.005, 0.005, 0.49, 0.305)  # 必要定尺本数
M_YIELD = (0.505, 0.345, 0.49, 0.305)  # 歩留まり率
M_SCRAP = (0.005, 0.69, 0.49, 0.30)  # 合計端材
M_KERF = (0.505, 0.69, 0.49, 0.30)  # 刃幅ロス
BOTTOM = (0, 0.69, 1, 0.31)  # まとめの下の段（合計端材・刃幅ロス）
LEFTCOL = (0, 0, 0.49, 1)  # まとめの左の列（必要定尺本数・実切断回数・合計端材）


def mk(m, at):
    return {"x": m[0], "y": m[1], "w": m[2], "h": m[3], "at": at}


# 各場面：headline／voice（|で区切る）／caption／items（cueの番号 or フレームで出す）／min（最短フレーム数）
def scenes_v1():
    s = []
    s.append(dict(headline="同じ部材。端材は？", voice="おなじぶざいでも、のこるたんざいが、かわりました。", caption="同じ部材でも、端材が変わる？", note=KIRI_NOTE, min=110,
                  build=lambda c: stack([K("summary-inputorder.png", 660, crop=M_SCRAP, label="入力順：合計端材"), K("summary-auto.png", 660, crop=M_SCRAP, label="自動：合計端材")], 300, gap=40)))
    s.append(dict(headline="条件は、これだけ", voice="ていじゃくは、ろくせんミリ。きりしろは、ごミリで、くらべます。", caption="定尺6,000mm／刃幅5mm／部材は各2本", note=KIRI_NOTE, min=130,
                  build=lambda c: [place(K("conditions.png", 700), 190, 262, 10), place(K("parts.png", 700, crop=(0, 0, 1, 0.65)), 190, 462, 60)]))

    def result(tag, stocks, mark_a, mark_b):
        def b(c):
            sw = c[0] - 8  # 声で本数を言う少し前に、まとめの画面へ切り替える
            its = []
            for i in range(stocks):
                its.append(place(K(f"stock{i+1}-{tag}.png", 760, ), 160, 262 + i * 236, 10 + i * 12))
                its[-1].hide = sw - 6
            sm = place(K(f"summary-{tag}.png", 900), 90, 290, sw)
            sm.marks = [mk(M_STOCKS, c[0]), mk(M_SCRAP, c[1])]
            return its + [sm]
        return b

    s.append(dict(headline="「入力順」で並べると", voice="にゅうりょくじゅんで、ひとつずつ、わりつけると、|ていじゃくさんぼん。|たんざいのごうけいは、ろくせんきゅうひゃくななじゅうミリ。", caption="入力順：定尺3本／端材6,970mm", note=KIRI_NOTE, min=135, capdelay=lambda c: c[0] + 6, build=result("inputorder", 3, 0, 0)))
    s.append(dict(headline="「自動」で並べると", voice="じどうで、ならべかえて、わりつけると、|ていじゃくにほん。|たんざいは、きゅうひゃくななじゅうミリです。", caption="自動：定尺2本／端材970mm", note=KIRI_NOTE, min=135, capdelay=lambda c: c[0] + 6, build=result("auto", 2, 0, 0)))
    s.append(dict(headline="端材も変わりました", voice="このじょうけんでは、ひつようなほんすうと、たんざいが、こうかわりました。", caption="本数と端材を、セットで確認", note=KIRI_NOTE, min=130,
                  build=lambda c: row([K("summary-inputorder.png", 450, crop=LEFTCOL, label="入力順"), K("summary-auto.png", 450, crop=LEFTCOL, label="自動")], 280, gap=20)))
    return s


def scenes_v2():
    s = []
    s.append(dict(headline="支え方で、たわみは？", voice="このちがいは、ささえかたのせっていです。", caption="たわみ3.4mm／0.85mm。何を変えた？", note=HARI_NOTE, min=110,
                  build=lambda c: stack([H("check2-simple.png", 800, label="単純支持"), H("check2-fixed.png", 800, label="両端固定")], 322)))
    s.append(dict(headline="同じ梁、同じ荷重", voice="おなじはり、おなじかじゅうの、どうさかくにんようのれいです。", caption="吊り荷2t／スパン3,000mm／\nH-150×150×7×10", note=HARI_NOTE, min=130,
                  build=lambda c: stack([H("input-load.png", 800), H("input-span.png", 800), H("input-steel.png", 800)], 330)))
    s.append(dict(headline="単純支持のとき", voice="たんじゅんしじでは、|たわみ、さんてんよんミリ。", caption="単純支持：たわみ3.4mm", note=HARI_NOTE, min=125,
                  build=lambda c: stack([H("input-support-simple.png", 780), H("check2-simple.png", 900, marks=[{"x": 0.0, "y": 0.36, "w": 0.46, "h": 0.30, "at": c[0]}])], 330, gap=24)))
    s.append(dict(headline="両端固定のとき", voice="りょうたんこていでは、|たわみ、レイテンハチゴミリです。", caption="両端固定：たわみ0.85mm", note=HARI_NOTE, min=125,
                  build=lambda c: stack([H("input-support-fixed.png", 780), H("check2-fixed.png", 900, marks=[{"x": 0.0, "y": 0.36, "w": 0.46, "h": 0.30, "at": c[0]}])], 330, gap=24)))
    s.append(dict(headline="支え方の設定を確認", voice="じっさいのささえかたにあうせっていを、かくにんします。いちじしょうさのほじょです。さいしゅうはんだんは、せんもんかです。", caption="一次照査の補助です。\n最終判断は専門家。", note=HARI_NOTE, min=150,
                  build=lambda c: stack([H("check2-simple.png", 780, label="単純支持"), H("check2-fixed.png", 780, label="両端固定")], 322)))
    return s


def scenes_v3():
    s = []
    s.append(dict(headline="切りしろは、どこへ？", voice="きりしろをいれると、どのかずじが、かわるでしょう。", caption="切りしろ分、どこに出る？", note=KIRI_NOTE, min=110,
                  build=lambda c: stack([K("summary-kerf0.png", 900, crop=BOTTOM, label="刃幅0mm（比較用）"), K("summary-auto.png", 900, crop=BOTTOM, label="刃幅5mm")], 280, gap=30)))
    s.append(dict(headline="切りしろだけ変えます", voice="ぶざいと、ていじゃくと、ならべかたは、おなじ。きりしろだけを、かえます。", caption="0mmは比較用の設定です", note=KIRI_NOTE, min=130,
                  build=lambda c: stack([K("conditions-kerf0.png", 740, label="刃幅0mm（比較用）"), K("conditions.png", 740, label="刃幅5mm")], 270, gap=22)))

    def res(tag, a, b):
        def f(c):
            sm = place(K(f"summary-{tag}.png", 900), 90, 300, 10)
            sm.marks = [mk(M_KERF, c[0]), mk(M_SCRAP, c[1])]
            return [sm]
        return f

    s.append(dict(headline="刃幅0mmのとき", voice="ゼロミリでは、|きりしろのロスは、ゼロ。|たんざいは、せんミリ。", caption="刃幅ロス0mm／端材1,000mm", note=KIRI_NOTE, min=125, build=res("kerf0", 0, 0)))
    s.append(dict(headline="刃幅5mmのとき", voice="ごミリでは、|きりしろのロスは、さんじゅうミリ。|たんざいは、きゅうひゃくななじゅうミリです。", caption="刃幅ロス30mm／端材970mm", note=KIRI_NOTE, min=125, build=res("auto", 0, 0)))
    s.append(dict(headline="ロスも端材も見る", voice="きりしろでつかうながさも、ふくめて、けっかをかくにんします。", caption="刃幅ロスと端材、両方を見る", note=KIRI_NOTE, min=120,
                  build=lambda c: stack([K("summary-kerf0.png", 860, crop=BOTTOM, label="刃幅0mm"), K("summary-auto.png", 860, crop=BOTTOM, label="刃幅5mm")], 290, gap=30)))
    return s


def scenes_v4():
    s = []

    def s1(c):
        p = place(K("parts.png", 640), 220, 290, 10)
        p.marks = [{"x": 0.765, "y": 0.21, "w": 0.13, "h": 0.12, "at": c[0]}]
        return [p]

    s.append(dict(headline="追加です。どうなる？", voice="ぶざいがついか。|ぜんたいは、どうかわるでしょう。", caption="部材Aの数量は、今は2本", note=KIRI_NOTE, min=125, build=s1))

    def s2(c):
        sm = place(K("summary-auto.png", 900), 90, 300, 10)
        sm.marks = [mk(M_STOCKS, c[0]), mk(M_YIELD, c[1])]
        return [sm]

    s.append(dict(headline="変更前は、定尺2本", voice="どうさかくにんようのれいです。|へんこうまえは、ていじゃくにほん。|ぶどまりは、きゅうじゅういってんななパーセント。", caption="A2,500mm×2／定尺2本／歩留まり91.7%", note=KIRI_NOTE, min=140, build=s2))

    def s3(c):
        its = stack([K("parts.png", 640, crop=(0, 0.12, 1, 0.38), label="変更前"), K("parts-qty4.png", 640, crop=(0, 0.12, 1, 0.38), label="変更後")], 290, gap=22)
        its[1].marks = [{"x": 0.765, "y": 0.24, "w": 0.13, "h": 0.30, "at": c[0]}]
        return its

    s.append(dict(headline="Aの数量だけ、2→4", voice="にせんごひゃくミリのぶざいだけ、|にほんから、よんほんに。", caption="変えるのはAの数量だけ", note=KIRI_NOTE, min=130, build=s3))

    def s4(c):
        sm = place(K("summary-qty4.png", 900), 90, 300, 10)
        sm.marks = [mk(M_STOCKS, c[0]), mk(M_YIELD, c[1])]
        return [sm]

    s.append(dict(headline="変更後は、定尺3本", voice="けっかは、|ていじゃくさんぼん。|ぶどまりは、はちじゅうはってんきゅうパーセント。", caption="定尺3本／歩留まり88.9%", note=KIRI_NOTE, min=135, build=s4))
    s.append(dict(headline="数量を変えたら全体も", voice="すうりょうをなおしたあと、ぜんたいのけっかも、みかえします。", caption="数量を変えたら、全体も見直す", note=KIRI_NOTE, min=125,
                  build=lambda c: [place(K("parts-qty4.png", 700, crop=(0, 0.12, 1, 0.2)), 190, 280, 10), place(K("summary-qty4.png", 760), 160, 280 + 106 + 22, 24)]))
    return s


def scenes_v5():
    s = []
    s.append(dict(headline="「OK」はどこまで？", voice="このオーケーは、どこまでのはんていでしょうか。", caption="OKと、対象外の表示を並べて見る", note=HARI_NOTE, min=110,
                  build=lambda c: stack([H("judgement-simple.png", 760), H("unevaluated.png", 760)], 322)))
    s.append(dict(headline="計算した項目の判定", voice="にゅうりょくして、けいさんしたこうもくについての、はんていです。", caption="入力・計算済みの項目についての判定", note=HARI_NOTE, min=140,
                  build=lambda c: stack([H("check1-simple.png", 620), H("check2-simple.png", 620), H("check4-simple.png", 620)], 322, gap=12)))

    def s3(c):
        u = place(H("unevaluated.png", 900), 90, 330, 10)
        u.marks = [{"x": 0.01, "y": 0.22, "w": 0.98, "h": 0.46, "at": LEAD + 6}, {"x": 0.01, "y": 0.69, "w": 0.98, "h": 0.30, "at": c[0]}]
        return [u]

    s.append(dict(headline="判定に含まれない項目", voice="つかれづよさ、よこざくつ、いたのきょくぶざくつ。|はんていにふくまれないこうもくも、ひょうじします。", caption="判定に含まれない項目も、画面に表示", note=HARI_NOTE, min=150, build=s3))
    s.append(dict(headline="結果と範囲をセットで", voice="けっかと、はんていのはんいを、セットでかくにんします。いちじしょうさのほじょです。さいしゅうはんだんは、せんもんかです。", caption="一次照査の補助です。\n最終判断は専門家。", note=HARI_NOTE, min=150,
                  build=lambda c: stack([H("judgement-simple.png", 760), H("unevaluated.png", 760)], 322)))
    return s


# 10/26〜11/8分（ChatGPT企画 A1・A2、Issue #5 2026-10-08。ばる承認）
def scenes_v6():
    s = []

    def s1(c):
        sm = place(K("summary-auto.png", 900), 90, 300, 10)
        sm.marks = [mk(M_YIELD, LEAD + 4)]
        return [sm]

    s.append(dict(headline="91.7%は、何の割合？", voice="このきゅうじゅういってんななパーセント、なんのわりあいでしょう。", caption="歩留まり91.7%。何の割合？", note=KIRI_NOTE, min=110, build=s1))
    s.append(dict(headline="部材の合計は？", voice="どうさかくにんようのれいです。|ぶざいは、にせんごひゃく、せんはっぴゃく、せんにひゃくミリを、にほんずつ。|ごうけいは、いちまんせんミリ。", caption="部材の合計 11,000mm", note=KIRI_NOTE, min=150,
                  build=lambda c: [place(K("conditions.png", 700), 190, 262, 10), place(K("parts.png", 700, crop=(0, 0, 1, 0.65)), 190, 462, c[0])]))

    def s3(c):
        its = [place(K("stock1-auto.png", 760), 160, 262, 10), place(K("stock2-auto.png", 760), 160, 498, 22)]
        sm = place(K("summary-auto.png", 900), 90, 300, c[0] - 8)
        for it in its:
            it.hide = c[0] - 14
        sm.marks = [mk(M_STOCKS, c[0]), mk(M_YIELD, c[1])]
        return its + [sm]

    s.append(dict(headline="自動で並べると", voice="じどうでは、ろくせんミリのていじゃくを、|にほん。|ぜんたいは、いちまんにせんミリです。", caption="定尺6,000mm×2本＝12,000mm", note=KIRI_NOTE, min=140, capdelay=lambda c: c[1], build=s3))

    def s4(c):
        sm = place(K("summary-inputorder.png", 900), 90, 300, 10)
        sm.marks = [mk(M_STOCKS, c[0]), mk(M_YIELD, c[1])]
        return [sm]

    s.append(dict(headline="入力順で並べると", voice="おなじぶざいでも、にゅうりょくじゅんでは、|ていじゃくさんぼん。|ぶどまりは、ろくじゅういってんいちパーセント。", caption="入力順：定尺3本／61.1%", note=KIRI_NOTE, min=140, capdelay=lambda c: c[0] + 6, build=s4))
    s.append(dict(headline="割合と、元の長さ", voice="ぶざいはおなじ。つかうていじゃくがかわると、このわりあいもかわります。ぶどまりと、もとのながさを、セットでかくにんします。", caption="11,000mm ÷ 12,000mm ≒ 91.7%\n11,000mm ÷ 18,000mm ≒ 61.1%", note=KIRI_NOTE, min=170,
                  build=lambda c: row([K("summary-inputorder.png", 450, crop=LEFTCOL, label="入力順"), K("summary-auto.png", 450, crop=LEFTCOL, label="自動")], 280, gap=20)))
    return s


DIAG_NOTE = ["説明図（曲がりは大きく描いています）", "一次照査の補助です。最終判断は専門家。"]


def scenes_v7():
    """11/5 ハリナビ：梁が曲がるアニメの説明図＋実画面（2026-10-09 ばる「アニメーションで作ってよ」→「梁が曲がるアニメ図」）。"""
    s = []
    s.append(dict(headline="支え方で変わる？", voice="おなじはりに、おなじにもつ。ささえかたで、まがりかたは、かわるでしょうか。", caption="同じ梁、同じ荷物。\n支え方で変わる？", note=DIAG_NOTE, min=150,
                  diagram={"mode": "both", "start": 8}, build=lambda c: []))

    def s2(c):
        its = stack([H("input-load.png", 800), H("input-span.png", 800), H("input-steel.png", 800)], 330)
        for it, at in zip(its, [10] + c):
            it.appear = at
        return its

    s.append(dict(headline="同じ荷重・長さ・断面", voice="どうさかくにんようのれいです。つりには、にトン。|スパンは、さんぜんミリ。|だんめんも、おなじです。", caption="吊り荷2t／スパン3,000mm／\nH-150×150×7×10", note=HARI_NOTE, min=150, build=s2))
    s.append(dict(headline="単純支持", voice="たんじゅんしじは、はしが、くるっとまわれる、ささえかた。|まんなかが、さがります。", caption="端は回れる。\n真ん中が下がる", note=DIAG_NOTE, min=150,
                  diagram={"mode": "simple", "start": 8}, build=lambda c: []))
    s.append(dict(headline="両端固定", voice="りょうたんこていは、はしが、まわらないように、とめるささえかた。|たんじゅんしじより、さがりかたは、ちいさくなります。", caption="端は回らない。\n下がり方は小さい", note=DIAG_NOTE, min=160,
                  diagram={"mode": "fixed", "start": 8}, build=lambda c: []))

    def s6(c):
        its = stack([H("check2-simple.png", 800, label="単純支持"), H("check2-fixed.png", 800, label="両端固定")], 322)
        for it in its:
            it.marks = [{"x": 0.0, "y": 0.36, "w": 0.46, "h": 0.30, "at": c[0]}]
        return its

    s.append(dict(headline="ハリナビの計算では", voice="ハリナビのけいさんでは、|たわみ、サンテンヨンイチキュウミリと、レイテンハチゴミリでした。", caption="たわみ 3.419mm／0.85mm", note=HARI_NOTE, min=150, capdelay=lambda c: c[0] + 4, build=s6))
    s.append(dict(headline="実際の支え方は？", voice="ちいさいかずじをえらぶまえに、じっさいのささえかたに、あうせっていか、かくにんします。いちじしょうさのほじょです。さいしゅうはんだんは、せんもんかです。", caption="一次照査の補助です。\n最終判断は専門家。", note=HARI_NOTE, min=170,
                  build=lambda c: stack([H("input-support-simple.png", 780, label="単純支持"), H("input-support-fixed.png", 780, label="両端固定")], 322, gap=24)))
    return s


# 案内役のキャラクター（2026-10-09 ばる「ハリナビの動画もキャラクターいれようよ！」）。
# 声はそのキャラの声で読み、口パクは声の大きさから作る。画面の切り抜きは左側（x 50〜740）に寄せ、右下にキャラを立たせる。
GUIDES = {
    "v7": dict(voice=10004, rigs=["sekkei/s2-3", "sekkei/s1-1", "sekkei/s1-4"], poses=["sekkei/s2-3", "sekkei/s1-1", "sekkei/s1-1", "sekkei/s1-1", "sekkei/s1-1", "sekkei/s1-4"],
               x=885, feetY=1050, height=440, captionRight=330),
}
AREA = (50, 740)


def fit_left(items):
    """画面の切り抜きを、左側の枠（AREA）に収まるよう縮めて寄せる（縦の並びも同じ割合で詰める）。"""
    if not items:
        return items
    l0 = min(i.left for i in items)
    r0 = max(i.left + i.width for i in items)
    t0 = min(i.top for i in items)
    span = AREA[1] - AREA[0]
    k = min(1.0, span / (r0 - l0))
    pad = (span - (r0 - l0) * k) / 2
    for i in items:
        i.left = round(AREA[0] + pad + (i.left - l0) * k)
        i.top = round(t0 + (i.top - t0) * k)
        i.width = round(i.width * k)
    return items


def mouth_env(path):
    with wave.open(str(path), "rb") as w:
        sr = w.getframerate()
        a = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(float) / 32768
    step = sr // FPS
    rms = np.array([np.sqrt(np.mean(a[i:i + step] ** 2)) for i in range(0, len(a) - step + 1, step)])
    m = np.clip(rms / (np.percentile(rms[rms > 0], 90) if (rms > 0).any() else 1), 0, 1)
    m = np.where(m < 0.12, 0, m)
    return [round(float(v) * (0.75 if i % 2 else 1.0), 3) for i, v in enumerate(m)]


def rig(name):
    r = json.loads((PUB / "rig" / name / "rig.json").read_text(encoding="utf-8"))
    r.pop("align", None)
    r["dir"] = f"rig/{name}"
    return r


VIDEOS = {"v1": scenes_v1, "v2": scenes_v2, "v3": scenes_v3, "v4": scenes_v4, "v5": scenes_v5, "v6": scenes_v6, "v7": scenes_v7}


def build(name):
    global VOICE
    guide = GUIDES.get(name)
    VOICE = guide["voice"] if guide else 10005
    out = PUB / "audio" / name
    out.mkdir(parents=True, exist_ok=True)
    scenes = []
    for i, sc in enumerate(VIDEOS[name]()):
        segs = sc["voice"].split("|")
        d = synth("".join(segs), out / f"voice-{i}.wav")
        starts, t = [], 0.05  # 先頭の無音（prePhonemeLength）
        for seg in segs[:-1]:
            t += seg_seconds(seg)
            starts.append(t)
        cues = [LEAD + round(x * FPS) - 3 for x in starts]  # 声が言い始める少し前
        frames = max(sc["min"], math.ceil((LEAD / FPS + d + TAIL) * FPS))
        items = sc["build"](cues)
        if guide:
            fit_left(items)
        note = sc["note"]
        accent = len(note) > 1
        scenes.append({
            "headline": sc["headline"], "note": note, "noteTop": 208, "noteAccentLast": accent, "caption": sc["caption"],
            "captionDelay": min(frames - 40, sc["capdelay"](cues) if "capdelay" in sc else 40),
            "frames": frames, "lead": LEAD, "voice": f"{name}/voice-{i}.wav",
            **({"pose": guide["poses"][i], "mouth": mouth_env(out / f"voice-{i}.wav")} if guide else {}),
            **({"diagram": sc["diagram"]} if "diagram" in sc else {}),
            "items": [
                {"dir": it.dir, "file": it.file, "srcW": it.srcW, "srcH": it.srcH, **({"crop": {"x": it.crop[0], "y": it.crop[1], "w": it.crop[2], "h": it.crop[3]}} if it.crop else {}),
                 "left": it.left, "top": it.top, "width": it.width, "appear": it.appear, **({"hide": it.hide} if it.hide is not None else {}),
                 **({"label": it.label} if it.label else {}), "marks": it.marks}
                for it in items
            ],
        })
        print(f"{name} 場面{i + 1}: 声 {d:.2f}秒 → {frames}フレーム cues={cues}", flush=True)
    total = sum(s["frames"] for s in scenes)
    props = {"scenes": scenes, "bgm": "bgm-pop-long.wav", "bgmVolume": 0.37}
    if guide:
        props["guide"] = {k: guide[k] for k in ("x", "feetY", "height", "captionRight")} | {"rigs": {r: rig(r) for r in guide["rigs"]}}
    (ROOT / "props").mkdir(exist_ok=True)
    (ROOT / "props" / f"{name}.json").write_text(json.dumps(props, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{name}: 合計 {total}フレーム（{total / FPS:.1f}秒）")


if __name__ == "__main__":
    for n in (sys.argv[1:] or list(VIDEOS)):
        build(n)
