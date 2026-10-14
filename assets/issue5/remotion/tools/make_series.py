"""連載『クロの鉄骨工房』の1話ぶん（約60秒）の props を書く。台本は SNS集客/キャラクター/連載_クロの鉄骨工房_設計.md。
- 4匹がずっと同じ位置に立ち、カメラが話す人に寄る（寄り・引きで画面を変える）。登場は、歩いて来る・すべり込む。
- 声：VOICEVOX Nemo（キャラごとの声は make_cast_skit.py の CAST）。読みはひらがな。端材は「ハザイ」、小数はカタカナ（イッテンゴ）。
- 画面（キリドリ）は public/screens/ の実画面。数字は撮った画面の文字だけ（動作確認用の例）。
使い方：VOICEVOX Nemo を起動してから  python tools/make_series.py [話の番号…]   → props/series-<番号>.json
"""
import json
import math
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_cast_skit import CAST, synth  # noqa: E402
from make_skit_batch import FPS, LEAD, ROOT, SIZES, TAIL, WALK, rig  # noqa: E402

NAMES = {"shuna": "クロ", "kantoku": "シバ監督", "sekkei": "モカ", "shinjin": "ムギ"}
X = {"shinjin": 170, "kantoku": 430, "sekkei": 680, "shuna": 910}
HEIGHT = {"shuna": 430, "kantoku": 410, "sekkei": 390, "shinjin": 340}
ORDER = ["shinjin", "kantoku", "sekkei", "shuna"]  # 奥から手前の順（あとの子が上に描かれる）
DEFAULT = {"shuna": "shuna/s1_1-1", "kantoku": "kantoku/s1-1", "sekkei": "sekkei/s1-1", "shinjin": "shinjin/s1-1"}
CREDIT = "架空のキャラクターの会話｜絵：AIで作成｜音声：VOICEVOX Nemo｜げんばアプリ工房"
NOTE = "キリドリの実際の画面（動作確認用の例）"
GAP = 4
PRE = 34  # 登場の歩き・すべり込みに使う、しゃべらない間
NEXT_FRAMES = 78
HOLD = 66

# present：start＝最初からいる／("enter", 何番目の台詞の前に, "walk"|"slide")＝そのとき現れる
EPISODES = {
    1: dict(
        title="端材の山", badge="クロの鉄骨工房 第1話", pile=dict(x=560, start=0, end=640), pile_open=True, hook="長さ不明の端材、\n30本", next="次回\n6mから、4本は取れない？",
        present={"shinjin": "start", "shuna": "start", "kantoku": (3, "walk"), "sekkei": (8, "slide")},
        acting={
            0: {"shuna": "act:shuna_act-2"},
            1: {"shuna": "act:shuna_act-2"},
            2: {"shinjin": "act:shinjin_act-2", "shuna": "act:shuna_act-2"},
            3: {"kantoku": "act:kantoku_act-2"},
            7: {"kantoku": "act:kantoku_act-3"},
            8: {"kantoku": "act:kantoku_act-3"},
            9: {"shinjin": "act:shinjin_act-2"},
            10: {"sekkei": "act:sekkei_act-2"},
            11: {"sekkei": "act:sekkei_act-2"},
            12: {"kantoku": "act:kantoku_act-4", "sekkei": "act:sekkei_act-3"},
            13: {"shuna": "act:shuna_act-4", "kantoku": "act:kantoku_act-4"},
            14: {"shinjin": "act:shinjin_act-4", "shuna": "act:shuna_act-4"},
            15: {"shuna": "act:shuna_act-3"},
            16: {"shuna": "act:shuna_act-3"},
        },
        lines=[
            ("shinjin", "クロさん！\nこの端材の山、\n全部で何ミリですか！？", "クロさん！このハザイの山、ぜんぶで、なんミリですか！？", {"shinjin": "shinjin/s1-3"}, dict(wide=True)),
            ("shuna", "…さあな", "…さあな", {"shinjin": "shinjin/s1-3"}, {}),
            ("shinjin", "さあな！？", "さあな！？", {"shinjin": "shinjin/s1-3", "shuna": "shuna/s1_1-3"}, {}),
            ("kantoku", "おーい！\nその端材、あした使うぞ！", "おーい！そのハザイ、あした、つかうぞ！", {}, dict(wide=True)),
            ("shinjin", "長さが、\n分からないんです！", "ながさが、わからないんです！", {"shinjin": "shinjin/s1-3", "kantoku": "kantoku/s1-3"}, {}),
            ("shuna", "測れば分かる", "はかれば、わかる", {}, {}),
            ("shinjin", "三十本\nありますよ！？", "さんじゅっぽん、ありますよ！？", {"shinjin": "shinjin/s1-3", "kantoku": "kantoku/s1-3"}, dict(wide=True)),
            ("kantoku", "三十本…\nあしたまでに…", "さんじゅっぽん…あしたまでに…", {"kantoku": "kantoku/s1-3", "shinjin": "shinjin/s1-3"}, {}),
            ("sekkei", "この30本は、まず測りましょう。\n次からは、切る前に残りの長さを計算して、\n端材に書いておけます。", "このさんじゅっぽんは、まず、はかりましょう。つぎからは、きるまえに、のこりの、ながさを、けいさんして、ハザイに、かいておけます。", {}, dict(wide=True)),
            ("shinjin", "書いておくんですね！", "かいておくんですね！", {"shinjin": "shinjin/s1-3"}, {}),
            ("sekkei", "キリドリで切り出し図を作ると、\n一本ずつの残りが出ます", "キリドリで、きりだしずを、つくると、いっぽんずつの、のこりが、でます。どうさかくにんようの、れいです。", {"sekkei": "sekkei/s2-3"},
             dict(insert=dict(note="キリドリの実際の画面｜定尺6,000mm・刃幅5mm・部材6本", foot="切り出し図で、残りの長さを先に計算（動作確認用の例）", items=[
                 dict(dir="screens", file="stock1-auto.png", w=860, marks=[dict(x=0.86, y=0.36, w=0.13, h=0.34, at=40)]),
                 dict(dir="screens", file="stock2-auto.png", w=860, marks=[dict(x=0.86, y=0.36, w=0.13, h=0.34, at=70)])]))),
            ("sekkei", "この例では、2本で\n合計端材は970mmです", "この、れいでは、にほんで、ごうけいハザイは、きゅうひゃくななじゅうミリです。", {"sekkei": "sekkei/s1-1"},
             dict(insert=dict(note="キリドリの実際の画面｜定尺6,000mm・刃幅5mm・部材6本", foot="切り出し図で、残りの長さを先に計算（動作確認用の例）", items=[
                 dict(dir="screens", file="summary-auto.png", w=860, marks=[dict(x=0.0, y=0.68, w=0.5, h=0.3, at=20)])]))),
            ("kantoku", "次から、\n切る前に分かるのか！", "つぎから、きるまえに、わかるのか！", {"kantoku": "kantoku/s1-1"}, dict(wide=True)),
            ("shuna", "…悪くない", "…わるくない", {}, {}),
            ("shinjin", "クロさんが、\nほめた！", "クロさんが、ほめた！", {"shinjin": "shinjin/s1-1"}, dict(wide=True)),
            ("shinjin", "クロさん、\nその手帳、なんですか？", "クロさん、その、てちょう、なんですか？", {"shinjin": "shinjin/s1-3"}, dict(wide=True)),
            ("shuna", "…なんでもない", "…なんでもない", {"shuna": "shuna/s1_1-3"}, dict(closeup=True)),
        ],
    ),
    2: dict(
        title="6mから4本は取れない", badge="クロの鉄骨工房 第2話", caption_lines={6: "例：刃幅3mmの場合"}, hook="6mから1.5mを\n4本。取れる？", next="次回\n並べ順で、材料が1本減る！？",
        present={"shinjin": "start", "shuna": "start", "kantoku": (3, "walk"), "sekkei": (6, "slide")},
        acting={
            0: {"shuna": "act:shuna_act-2"},
            5: {"shinjin": "act:shinjin_act-3"},
            6: {"sekkei": "act:sekkei_act-4"},
            7: {"shinjin": "act:shinjin_act-2"},
            8: {"kantoku": "act:kantoku_act-3", "shinjin": "act:shinjin_act-2"},
            9: {"sekkei": "act:sekkei_act-2"},
            10: {"sekkei": "act:sekkei_act-2"},
            12: {"sekkei": "act:sekkei_act-3"},
            13: {"shinjin": "act:shinjin_act-4", "shuna": "act:shuna_act-2", "kantoku": "act:kantoku_act-4"},
            14: {"shuna": "act:shuna_act-2"},
        },
        lines=[
            ("shinjin", "6mあれば、\n1.5mが4本、楽勝ですよね！", "ろくメートルあれば、イッテンゴメートルが、よんほん、らくしょうですよね！", {"shinjin": "shinjin/s1-1"}, dict(wide=True)),
            ("shuna", "…足りない", "…たりない", {"shuna": "shuna/s1_1-3"}, {}),
            ("shinjin", "えっ！？\n4かける1.5は、6ですよ！？", "えっ！？よんかけるイッテンゴは、ろくですよ！？", {"shinjin": "shinjin/s1-3"}, {}),
            ("kantoku", "6mきっかりだぞ？", "ろくメートル、きっかりだぞ？", {"kantoku": "kantoku/s1-3"}, dict(wide=True)),
            ("shuna", "切るたびに、刃の厚みの分だけ\n材料が消える", "きるたびに、ハの、あつみの、ぶんだけ、ざいりょうが、きえる", {}, {}),
            ("shinjin", "刃の厚み…ですか？", "ハの、あつみ…ですか？", {"shinjin": "shinjin/s1-3"}, {}),
            ("sekkei", "刃の厚み3mmで、3回切ると9mm。\n6mでは足りません", "ハの、あつみ、さんミリで、さんかい、きると、きゅうミリ。ろくメートルでは、たりません。", {"sekkei": "sekkei/s2-3"}, dict(wide=True)),
            ("shinjin", "9mm！\nそれだけで！？", "きゅうミリ！それだけで！？", {"shinjin": "shinjin/s1-3"}, {}),
            ("kantoku", "9mmで、\n4本目が取れないのか！", "きゅうミリで、よんほんめが、とれないのか！", {"kantoku": "kantoku/s1-3"}, {}),
            ("sekkei", "ここからは、別の動作確認例です。\n刃幅5mmで見てみます", "ここからは、べつの、どうさかくにんの、れいです。きりしろ、ごミリで、みてみます。", {"sekkei": "sekkei/s1-1"},
             dict(insert=dict(note="キリドリの実際の画面｜別の動作確認例", foot="さっきの3mmの例とは、別の条件です", items=[
                 dict(dir="screens", file="conditions.png", w=860, marks=[dict(x=0.52, y=0.4, w=0.46, h=0.5, at=40)])]))),
            ("sekkei", "切りしろを入れると、\n刃幅ロスも別に数えます", "きりしろを、いれると、はばロスも、べつに、かぞえます。", {"sekkei": "sekkei/s1-1"},
             dict(insert=dict(note="キリドリの実際の画面｜上：刃幅0mm／下：刃幅5mm", foot="別の動作確認例：刃幅5mm・実切断6回・刃幅ロス30mm", items=[
                 dict(dir="screens", file="summary-kerf0.png", w=780, crop=(0, 0.36, 1, 0.64), marks=[dict(x=0.0, y=0.02, w=0.5, h=0.46, at=20), dict(x=0.5, y=0.52, w=0.5, h=0.46, at=40)]),
                 dict(dir="screens", file="summary-auto.png", w=780, crop=(0, 0.36, 1, 0.64), marks=[dict(x=0.0, y=0.02, w=0.5, h=0.46, at=60), dict(x=0.5, y=0.52, w=0.5, h=0.46, at=80)])]))),
            ("shinjin", "入れ忘れると、条件が\n変わっちゃうんですね", "いれわすれると、じょうけんが、かわっちゃうんですね", {"shinjin": "shinjin/s1-3"}, dict(wide=True)),
            ("shuna", "だから俺は、\nまず、刃を見る", "だから、おれは、まず、はを、みる", {"shuna": "shuna/s1_1-1"}, {}),
            ("shinjin", "クロさん、\nかっこいい…！", "クロさん、かっこいい…！", {"shinjin": "shinjin/s1-1"}, dict(wide=True)),
            ("kantoku", "あしたの材料、3本で\n足りるか見ておいてくれ", "あしたの、ざいりょう、さんぼんで、たりるか、みておいてくれ", {"kantoku": "kantoku/s1-1"}, {}),
        ],
    ),
}


def voice(text, path, speaker, pitch):
    """声を作る。同じ読み・同じ声で作った wav があれば、作り直さずに使う（VOICEVOX を起動しなくてよい）。"""
    import wave

    import numpy as np

    tag = path.with_suffix(".txt")
    key = f"{speaker}|{pitch}|{text}"
    if not (path.exists() and tag.exists() and tag.read_text(encoding="utf-8") == key):
        d, mouth = synth(text, path, speaker, pitch)
        tag.write_text(key, encoding="utf-8")
        return d, mouth
    with wave.open(str(path), "rb") as w:
        sr = w.getframerate()
        a = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(float) / 32768
    step = sr // FPS
    rms = np.array([np.sqrt(np.mean(a[i:i + step] ** 2)) for i in range(0, len(a) - step + 1, step)])
    m = np.clip(rms / (np.percentile(rms[rms > 0], 90) if (rms > 0).any() else 1), 0, 1)
    m = np.where(m < 0.12, 0, m)
    return len(a) / sr, [round(float(v) * (0.75 if i % 2 else 1.0), 3) for i, v in enumerate(m)]


def build(no):
    ep = EPISODES[no]
    name = f"series-{no}"
    out = ROOT / "public" / "audio" / name
    out.mkdir(parents=True, exist_ok=True)
    pres = ep["present"]
    lines, pre_of = [], {}
    t = 6
    for i, (who, text, voice_text, poses, opt) in enumerate(ep["lines"]):
        enter_here = [a for a, v in pres.items() if v != "start" and v[0] == i]
        if enter_here:
            pre_of[i] = t
            t += PRE
        c = CAST[who]
        d, mouth = voice(voice_text, out / f"line-{i}.wav", c["voice"], c["pitch"])
        has_ins = "insert" in opt
        frames = max(135 if has_ins else 50, math.ceil((LEAD / FPS + d + TAIL) * FPS))
        lines.append({"start": t, "speaker": who, "text": text, "voice": f"{name}/line-{i}.wav", "lead": LEAD, "mouth": mouth, "frames": frames})
        print(f"{name} {i + 1:2d} {NAMES[who]}: {d:.2f}秒", flush=True)
        t += frames + GAP
    total = t + HOLD
    # 画面の寄り引き：話す人を画面の中央へ。wide の台詞と、画面を見せる台詞は引き
    cuts = []
    for i, ln in enumerate(lines):
        opt = ep["lines"][i][4]
        s = ln["start"]
        e = lines[i + 1]["start"] if i + 1 < len(lines) else total
        if i + 1 in pre_of:
            e = pre_of[i + 1]
        if i == 0 and ep.get("pile_open"):
            # 冒頭：端材の山へ寄って始め、引いて2人を見せる
            mid = min(e, s + 66)
            cuts.append({"start": s, "end": mid, "z0": 1.75, "z1": 1.2, "ox": ep["pile"]["x"], "oy": 1015, "pile": True})
            cuts.append({"start": mid, "end": e, "z0": 1.0, "z1": 1.05, "ox": 540, "oy": 1015})
        elif opt.get("closeup"):
            # クロの手元（手帳）へ、大きく寄る
            cuts.append({"start": s, "end": e, "z0": 1.6, "z1": 2.05, "ox": X[ln["speaker"]], "oy": 850, "close": True})
        elif opt.get("wide") or "insert" in opt:
            cuts.append({"start": s, "end": e, "z0": 1.0, "z1": 1.05, "ox": 540, "oy": 1015})
        else:
            z0, z1 = 1.38, 1.5
            ox = (540 - X[ln["speaker"]] * z0) / (1 - z0)
            ox = max(0, min(1080, ox))  # 画面の外の暗い所が映らないように、基点は画面の中に収める
            cuts.append({"start": s, "end": e, "z0": z0, "z1": z1, "ox": round(ox), "oy": 1015})
        if i in pre_of:  # 登場の間は引き
            cuts.append({"start": pre_of[i], "end": ln["start"], "z0": 1.0, "z1": 1.0, "ox": 540, "oy": 1015})
    cuts = [c for c in cuts if c["end"] > c["start"]]
    # 同じ時間の重なりは、あとのものを優先して整理
    cuts.sort(key=lambda c: (c["start"], -c["end"]))
    fixed, last = [], 0
    for c in cuts:
        if c["start"] < last:
            if c["end"] <= last:
                continue
            c = {**c, "start": last}
        fixed.append(c)
        last = c["end"]
    cuts = fixed

    actors = {}
    for who in ORDER:
        c = CAST[who]
        v = pres[who]
        tracks = []
        h = HEIGHT[who]
        if v == "start":
            begin = 0
        else:
            idx, kind = v
            begin = lines[idx]["start"]
            if kind == "walk":
                tracks.append({"kind": "cycle", "start": pre_of[idx], "end": begin, "files": WALK, "fps": 8, "x0": -200, "x1": X[who], "height": h, "bob": 8})
            else:
                tracks.append({"kind": "cycle", "start": pre_of[idx], "end": begin, "files": ["sekkei/s2-2.png"], "fps": 1, "x0": 1300, "x1": X[who], "height": h, "bob": 10})
        for i, ln in enumerate(lines):
            s0 = max(0 if i == 0 else ln["start"], begin)
            e0 = lines[i + 1]["start"] if i + 1 < len(lines) else total
            if e0 <= s0:
                continue
            pose = {**ep["lines"][i][3], **ep.get("acting", {}).get(i, {})}.get(who, DEFAULT[who])
            if pose.startswith("act:"):
                # 演技ポーズ（口は動かない1枚の絵）。大きさは、同じシートの1コマ目（基準の立ち姿）に合わせる
                act = pose[4:]
                file, ref = f"actions/{act}.png", f"actions/{act.rsplit('-', 1)[0]}-1.png"
                hh = round(h * SIZES[file][1] / SIZES[ref][1])
                tracks.append({"kind": "cycle", "start": s0, "end": e0, "files": [file], "fps": 1, "height": hh})
            else:
                tracks.append({"kind": "rig", "start": s0, "end": e0, "rig": pose, "height": h})
        # 登場の間（しゃべらない間）：すでにいる子は、直前の絵のまま（すき間をふさぐ）
        tracks.sort(key=lambda k: (k["start"], 0 if k["kind"] == "cycle" else 1))
        for a, b in zip(tracks, tracks[1:]):
            if a["end"] < b["start"] and (a["kind"] == "rig" or "x0" not in a):
                a["end"] = b["start"]
        actors[who] = {"name": NAMES[who], "color": CAST[who]["color"], "x": X[who], "tracks": tracks}

    rigs = {}
    for a in actors.values():
        for tr in a["tracks"]:
            if tr["kind"] == "rig" and tr["rig"] not in rigs:
                rigs[tr["rig"]] = rig(tr["rig"])

    inserts = []
    for i, (who, text, _voice, poses, opt) in enumerate(ep["lines"]):
        if "insert" not in opt:
            continue
        ins = opt["insert"]
        nxt_has = i + 1 < len(lines) and "insert" in ep["lines"][i + 1][4]
        prev_has = i > 0 and "insert" in ep["lines"][i - 1][4]
        end = (lines[i + 1]["start"] + (12 if nxt_has else -2)) if i + 1 < len(lines) else total - 10
        items = []
        for it in ins["items"]:
            sw, sh = Image.open(ROOT / "public" / it["dir"] / it["file"]).size
            e = {"dir": it["dir"], "file": it["file"], "srcW": sw, "srcH": sh, "width": it["w"], "marks": it.get("marks", [])}
            if "crop" in it:
                e["crop"] = dict(zip("xywh", it["crop"]))
            items.append(e)
        inserts.append({"start": lines[i]["start"] + (0 if prev_has else 4), "end": end, "note": ins["note"], "foot": ins["foot"], "items": items})

    props = {"actors": actors, "rigs": rigs, "sizes": SIZES, "lines": lines, "bg": "scene/bg_workshop.png", "bgm": "bgm-pop-long.wav", "bgmVolume": 0.24,
             "credit": CREDIT, "total": total, "cuts": cuts,
             **({"pile": ep["pile"]} if "pile" in ep else {}),
             **({"captions": [{"start": lines[i]["start"], "end": lines[i]["start"] + lines[i]["frames"], "text": tx} for i, tx in ep["caption_lines"].items()]} if "caption_lines" in ep else {}), "hook": {"text": ep["hook"], "frames": 50}, "badge": ep["badge"], "next": {"text": ep["next"], "frames": NEXT_FRAMES},
             **({"inserts": inserts} if inserts else {})}
    (ROOT / "props" / f"{name}.json").write_text(json.dumps(props, ensure_ascii=False), encoding="utf-8")
    print(f"{name}「{ep['title']}」: {total / FPS:.1f}秒", flush=True)


if __name__ == "__main__":
    for n in [int(a) for a in sys.argv[1:]] or list(EPISODES):
        build(n)
