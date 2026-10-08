"""Veo台本集の5本（2026-10-08）を、こちらの仕組み（WorkScene：AIで描いた絵＋口パク＋VOICEVOX＋加工場の背景）で作るための props を書く。
ばる「制限かかったからとりあえずClaudeでやりましょう」。台本：SNS集客/キャラクター/Veo/Veo台本集_20261008.md
- 声：VOICEVOX Nemo（キャラごとの声は make_cast_skit.py の CAST）。読みはひらがな（切りしろ＝きりしろ）。端材は「ハザイ」とカタカナ（ひらがなの「はざい」は「わざい」と読まれた。Whisperで確認）。
- 最後の問いかけも、キャラがしゃべる。
使い方：VOICEVOX Nemo を起動してから  python tools/make_skit_batch.py [番号…]   → props/skit-<番号>.json
"""
import glob
import json
import math
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_cast_skit import CAST, synth  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
LEAD = 8
TAIL = 0.45
chara = ROOT / "public" / "chara"
SIZES = {str(Path(f).relative_to(chara)).replace("\\", "/"): list(Image.open(f).size) for f in glob.glob(str(chara / "**" / "*.png"), recursive=True)}
L_X, R_X = 340, 730
H = {"shuna": 460, "kantoku": 440, "sekkei": 420, "shinjin": 360}
MEASURE = [f"actions/shuna_measure-{i}.png" for i in (1, 2, 3, 4)]
WALK = [f"actions/kantoku_walk-{i}.png" for i in (1, 2, 3, 4)]

# 台本：actors は登場のしかた、lines は (話す人, 吹き出し, 読み, その間の全員の絵)
SKITS = {
    1: dict(title="端材の長さ、分からない",
            enter={"shinjin": ("slide", "shinjin/s2-1.png", L_X)},
            fixed={"shuna": R_X},
            work={"shuna": True},
            lines=[("shinjin", "この端材、\n何ミリですか？", "この、ハザイ、なんミリですか？", {"shinjin": "shinjin/s1-1", "shuna": "table"}),
                   ("shuna", "…測ってみないと、\n分からないね", "…はかってみないと、わからないね", {"shinjin": "shinjin/s1-3", "shuna": "shuna/t-3"}),
                   ("shuna", "みなさんは、端材の長さ、\nどこに残していますか？", "みなさんは、ハザイの、ながさ、どこに、のこしてますか？", {"shinjin": "shinjin/s1-1", "shuna": "shuna/t-1"})]),
    2: dict(title="図面の赤字、どれが最新？",
            enter={"sekkei": ("slide", "sekkei/s2-2.png", L_X)},
            fixed={"kantoku": R_X},
            lines=[("sekkei", "ここ、寸法が\n変わりました！", "ここ、すんぽうが、かわりました！", {"sekkei": "sekkei/s2-3", "kantoku": "kantoku/s1-1"}),
                   ("kantoku", "えっ、どれが最新？", "えっ、どれが、さいしん？", {"sekkei": "sekkei/s2-3", "kantoku": "kantoku/s1-3"}),
                   ("sekkei", "いま使う数字、\nみなさんはどう確かめていますか？", "いま、つかう、すうじ、みなさんは、どう、たしかめてますか？", {"sekkei": "sekkei/s1-1", "kantoku": "kantoku/s1-1"})]),
    3: dict(title="寸法と数量がバラバラ",
            enter={"shuna": ("slide", "s2_1-1.png", R_X)},
            fixed={"shinjin": L_X},
            lines=[("shinjin", "寸法は図面で、\n数量はこっちのメモで…", "すんぽうは、ずめんで、すうりょうは、こっちの、メモで…", {"shinjin": "shinjin/s2-3", "shuna": "shuna/s1_1-1"}),
                   ("shuna", "そろえるだけで、\nひと仕事だよね", "そろえるだけで、ひとしごとだよね", {"shinjin": "shinjin/s1-1", "shuna": "shuna/s1_1-1"}),
                   ("shuna", "切る前の準備、\n地味に時間かかりませんか？", "きるまえの、じゅんび、じみに、じかん、かかりませんか？", {"shinjin": "shinjin/s1-1", "shuna": "shuna/s1_1-4"})]),
    4: dict(title="自分のメモの印、なんだっけ",
            enter={"sekkei": ("slide", "sekkei/s1-3.png", L_X)},
            fixed={"shuna": R_X},
            work={"shuna": True},
            lines=[("sekkei", "このメモの、\nこの印って何ですか？", "このメモの、このしるしって、なんですか？", {"sekkei": "sekkei/s1-1", "shuna": "table"}),
                   ("shuna", "えーっと…書いたときは、\n分かってたんだけど", "えーっと…かいたときは、わかってたんだけど", {"sekkei": "sekkei/s1-4", "shuna": "shuna/t-2"}),
                   ("shuna", "自分のメモ、伝わらなかったこと\nありませんか？", "じぶんの、メモ、つたわらなかったこと、ありませんか？", {"sekkei": "sekkei/s1-1", "shuna": "shuna/t-1"})]),
    5: dict(title="切りしろ、入れた？",
            enter={"kantoku": ("walk", None, L_X)},
            fixed={"shinjin": R_X},
            lines=[("kantoku", "切りしろ、\nちゃんと見てる？", "きりしろ、ちゃんと、みてる？", {"kantoku": "kantoku/s1-1", "shinjin": "shinjin/s1-1"}),
                   ("shinjin", "…切りしろ？", "…きりしろ？", {"kantoku": "kantoku/s1-3", "shinjin": "shinjin/s1-3"}),
                   ("kantoku", "みなさんは、切りしろ（刃幅）、\nいくつで見ていますか？", "みなさんは、きりしろ、いくつで、みてますか？", {"kantoku": "kantoku/s1-1", "shinjin": "shinjin/s1-1"})]),
    # 10/26〜11/8分（ChatGPT台本 S1・S2、Issue #5 2026-10-08。ばる承認）
    6: dict(title="「戻したよ」。どこに？",
            enter={"shinjin": ("slide", "shinjin/s2-1.png", L_X)},
            fixed={"shuna": R_X},
            work={"shuna": True},
            lines=[("shinjin", "あの道具、\nどこに戻しました？", "あの、どうぐ、どこに、もどしました？", {"shinjin": "shinjin/s1-1", "shuna": "table"}),
                   ("shuna", "いつもの…あ、\n決めてなかったね", "いつもの…あ、きめてなかったね", {"shinjin": "shinjin/s1-3", "shuna": "shuna/t-2"}),
                   ("shuna", "みなさんは、道具の戻し場所、\nどう決めていますか？", "みなさんは、どうぐの、もどしばしょ、どう、きめてますか？", {"shinjin": "shinjin/s1-1", "shuna": "shuna/t-1"})]),
    7: dict(title="終わったけど、伝わってる？",
            enter={"kantoku": ("walk", None, L_X)},
            fixed={"shuna": R_X},
            work={"shuna": True},
            lines=[("kantoku", "こっちの作業、\nもう終わりました？", "こっちの、さぎょう、もう、おわりました？", {"kantoku": "kantoku/s1-1", "shuna": "table"}),
                   ("shuna", "終わったよ。\n伝えるの、忘れてた", "おわったよ。つたえるの、わすれてた", {"kantoku": "kantoku/s1-3", "shuna": "shuna/t-2"}),
                   ("shuna", "みなさんは、作業が終わった合図、\nどうしていますか？", "みなさんは、さぎょうが、おわった、あいず、どうしてますか？", {"kantoku": "kantoku/s1-1", "shuna": "shuna/t-1"})]),
    # 11/5 ハリナビ（2026-10-09 ばる「会話劇と同じ見た目」「現場のハリが何トン持つとかそういうのがいいかな」）。
    # 「何トンまで大丈夫」とは言わない（一次照査の補助まで。参考最大荷重は投稿で使わない）。2tを吊るときの照査を、実画面で見せる。
    8: dict(title="この梁、何トンまで吊れる？", credit="げんばアプリ工房｜キャラクターの絵：AIで作成／音声：VOICEVOX Nemo",
            enter={"kantoku": ("walk", None, L_X)},
            fixed={"sekkei": R_X},
            lines=[("kantoku", "この梁、\n何トンまで吊れる？", "このはり、なんトンまで、つれる？", {"kantoku": "kantoku/s1-1", "sekkei": "sekkei/s1-1"}),
                   ("sekkei", "梁の大きさと長さ、\n支え方で変わるんです", "はりの、おおきさと、ながさ、ささえかたで、かわるんです。", {"kantoku": "kantoku/s1-3", "sekkei": "sekkei/s2-3"}),
                   ("kantoku", "じゃあ、\n2t吊るなら？", "じゃあ、にトン、つるなら？", {"kantoku": "kantoku/s1-1", "sekkei": "sekkei/s2-3"}),
                   ("sekkei", "ハリナビに条件を入れて、\n確かめます", "ハリナビに、じょうけんをいれて、たしかめます。どうさかくにんようのれいです。", {"kantoku": "kantoku/s1-1", "sekkei": "sekkei/s1-1"},
                    dict(items=[("input-load.png", 680), ("input-span.png", 680), ("input-steel.png", 680), ("input-support-simple.png", 680)])),
                   ("sekkei", "曲げとたわみを、\n許容値と比べます", "まげと、たわみを、きょようちと、くらべます。", {"kantoku": "kantoku/s1-1", "sekkei": "sekkei/s1-1"},
                    dict(items=[("check1-simple.png", 820, [{"x": 0.0, "y": 0.36, "w": 0.46, "h": 0.30, "at": 14}]), ("check2-simple.png", 820, [{"x": 0.0, "y": 0.36, "w": 0.46, "h": 0.30, "at": 30}])])),
                   ("kantoku", "数字で見ると、\n分かりやすいね", "かずじでみると、わかりやすいね。", {"kantoku": "kantoku/s1-1", "sekkei": "sekkei/s1-1"}),
                   ("sekkei", "判定に入っていない項目も、\n画面で確認します", "はんていに、はいっていない、こうもくも、がめんで、かくにんします。", {"kantoku": "kantoku/s1-1", "sekkei": "sekkei/s1-4"},
                    dict(items=[("judgement-simple.png", 820), ("unevaluated.png", 820)])),
                   ("sekkei", "一次照査の補助です。\n最終判断は専門家。", "いちじしょうさの、ほじょです。さいしゅうはんだんは、せんもんかです。", {"kantoku": "kantoku/s1-1", "sekkei": "sekkei/s2-3"})]),
    # 案3の後半（口が動く場面）。前半は make_opening.py の s3a（手元の寄り）。ChatGPT台本 3つ目の問いかけ。
    9: dict(title="見たい数字、そこ。（後半）", enter_end=0, scale=1.45,
            enter={},
            fixed={"sekkei": R_X, "shinjin": L_X},
            lines=[("sekkei", "見たいところ、ちょうど\n隠れてたこと、ありますか？", "みたいところ、ちょうど、かくれてたこと、ありますか？", {"sekkei": "sekkei/s2-3", "shinjin": "shinjin/s1-1"})]),
    # 案2の後半（口が動く場面＋キリドリの実入力欄）。前半は make_opening.py の op2b（手元の寄り）。ChatGPT台本の2〜5つ目。
    10: dict(title="待って、それB。（後半）", enter_end=0, scale=1.3, credit="げんばアプリ工房｜キャラクターの絵：AIで作成／音声：VOICEVOX Nemo",
             enter={},
             fixed={"shuna": R_X, "shinjin": L_X},
             lines=[("shinjin", "形は同じでも、\n長さが違うんですね", "かたちは、おなじでも、ながさが、ちがうんですね。", {"shinjin": "shinjin/s1-3", "shuna": "shuna/s1_1-1"}),
                    ("shuna", "名前と長さを、\n組で確かめよう", "なまえと、ながさを、くみで、たしかめよう。", {"shinjin": "shinjin/s1-1", "shuna": "shuna/s1_1-1"}),
                    ("shuna", "入力した行を、\n見返します", "どうさかくにんようの、れいです。ぶざいエーは、にせんごひゃくミリ。ぶざいビーは、せんはっぴゃくミリ。にゅうりょくした、ぎょうを、みかえします。", {"shinjin": "shinjin/s1-1", "shuna": "shuna/s1_1-4"},
                     dict(note="キリドリの実際の画面（動作確認用の例）", foot="部材A 2,500mm／部材B 1,800mm",
                          items=[dict(dir="screens", file="parts.png", w=820, crop=(0, 0.1, 1, 0.42), marks=[dict(x=0.0, y=0.27, w=1.0, h=0.27, at=70), dict(x=0.0, y=0.64, w=1.0, h=0.27, at=120)])])),
                    ("shuna", "似ていても、\n同じとは限らないね", "にていても、おなじとは、かぎらないね。", {"shinjin": "shinjin/s1-3", "shuna": "shuna/s1_1-1"})]),
    # 案1の後半（口が動く場面）。前半は make_opening.py の s1a（部材置き場の寄り）。ChatGPT台本の3つ目の問いかけ。
    11: dict(title="先に出すの、いちばん下。（後半）", enter_end=0, scale=1.4,
             enter={},
             fixed={"kantoku": L_X, "shuna": R_X},
             lines=[("shuna", "出す順番と置く順番、\nどう合わせていますか？", "だすじゅんばんと、おくじゅんばん、どう、あわせてますか？", {"kantoku": "kantoku/s1-1", "shuna": "shuna/s1_1-1"})]),
    # 案2の短縮版（2026-10-09 バズりの見方：実画面のナレーションが長いと離脱しやすい、が仮説。22.8秒→約15秒）。10 から「名前と長さを…」の台詞を外し、画面の読み上げを短くした。
    12: dict(title="待って、それB。（後半・短縮版）", enter_end=0, scale=1.3, credit="げんばアプリ工房｜キャラクターの絵：AIで作成／音声：VOICEVOX Nemo",
             enter={},
             fixed={"shuna": R_X, "shinjin": L_X},
             lines=[("shinjin", "形は同じでも、\n長さが違うんですね", "かたちは、おなじでも、ながさが、ちがうんですね。", {"shinjin": "shinjin/s1-3", "shuna": "shuna/s1_1-1"}),
                    ("shuna", "画面でも、\n名前と長さを組で", "どうさかくにんようのれいです。エーは、にせんごひゃく。ビーは、せんはっぴゃく。", {"shinjin": "shinjin/s1-1", "shuna": "shuna/s1_1-4"},
                     dict(note="キリドリの実際の画面（動作確認用の例）", foot="部材A 2,500mm／部材B 1,800mm",
                          items=[dict(dir="screens", file="parts.png", w=820, crop=(0, 0.1, 1, 0.42), marks=[dict(x=0.0, y=0.27, w=1.0, h=0.27, at=50), dict(x=0.0, y=0.64, w=1.0, h=0.27, at=95)])])),
                    ("shuna", "似ていても、\n同じとは限らないね", "にていても、おなじとは、かぎらないね。", {"shinjin": "shinjin/s1-3", "shuna": "shuna/s1_1-1"})]),
    # 案4の代案の後半（口が動く場面）。前半は make_opening.py の s4a（手元の寄り）。最後は問いかけではなく、気づきの一言（ChatGPT代案）。
    13: dict(title="同じ輪郭、穴は逆。（後半）", enter_end=0, scale=1.4,
             enter={},
             fixed={"shinjin": L_X, "shuna": R_X},
             lines=[("shinjin", "外側しか、\n見てなかった。", "そとがわ、しか、みてなかった。", {"shinjin": "shinjin/s1-3", "shuna": "shuna/s1_1-1"})]),
}
INSERT_NOTE = "ハリナビの実際の画面（動作確認用の例）"
INSERT_FOOT = "一次照査の補助です。最終判断は専門家。"


def rig(name):
    r = json.loads((ROOT / "public" / "rig" / name / "rig.json").read_text(encoding="utf-8"))
    r.pop("align", None)
    r["dir"] = f"rig/{name}"
    return r


def build(no):
    sk = SKITS[no]
    name = f"skit-{no}"
    out = ROOT / "public" / "audio" / name
    out.mkdir(parents=True, exist_ok=True)
    ENTER_END = sk.get("enter_end", 50)
    t = ENTER_END + 6
    lines, starts = [], []
    for i, ln0 in enumerate(sk["lines"]):
        who, text, voice, poses = ln0[:4]
        c = CAST[who]
        d, mouth = synth(voice, out / f"line-{i}.wav", c["voice"], c["pitch"])
        frames = max(135 if len(ln0) > 4 else 55, math.ceil((LEAD / FPS + d + TAIL) * FPS))  # 画面を見せる台詞は4.5秒以上
        lines.append({"start": t, "speaker": who, "text": text, "voice": f"{name}/line-{i}.wav", "lead": LEAD, "mouth": mouth, "frames": frames})
        starts.append(t)
        t += frames + 4
        print(f"{name} {i + 1} {c['name']}: {d:.2f}秒", flush=True)
    total = t + 26
    ids = list(sk["enter"]) + list(sk["fixed"])
    actors = {}
    for who in ids:
        c = CAST[who]
        x = sk["enter"][who][2] if who in sk["enter"] else sk["fixed"][who]
        tracks = []
        h = round(H[who] * sk.get("scale", 1))
        if who in sk["enter"]:
            kind, file, _ = sk["enter"][who]
            if kind == "walk":
                tracks.append({"kind": "cycle", "start": 0, "end": ENTER_END, "files": WALK, "fps": 8, "x0": -200, "x1": x, "height": h, "bob": 8})
            else:
                tracks.append({"kind": "cycle", "start": 0, "end": ENTER_END, "files": [file], "fps": 1, "x0": -220, "x1": x, "height": h, "bob": 10})
        # 場面ごとの絵（作業台の黒シュナは "table" ＝ 作業のコマ）
        for i, ln in enumerate(lines):
            pose = sk["lines"][i][3][who]
            s0 = 0 if (i == 0 and who not in sk["enter"]) else ln["start"] if i else ENTER_END
            e0 = lines[i + 1]["start"] if i + 1 < len(lines) else total
            if i == 0 and who in sk["enter"]:
                s0 = ENTER_END
            if pose == "table":
                tracks.append({"kind": "cycle", "start": s0, "end": e0, "files": MEASURE, "fps": 4, "height": h})
            else:
                hh = h - (10 if pose.startswith("shuna/t-") else 0)
                tracks.append({"kind": "rig", "start": s0, "end": e0, "rig": pose, "height": hh, "tilt": -5 if i == 2 and who == ln["speaker"] else 0})
        actors[who] = {"name": c["name"], "color": c["color"], "x": x, "tracks": tracks}
    rigs = {}
    for a in actors.values():
        for tr in a["tracks"]:
            if tr["kind"] == "rig" and tr["rig"] not in rigs:
                rigs[tr["rig"]] = rig(tr["rig"])
    inserts = []
    for i, ln0 in enumerate(sk["lines"]):
        if len(ln0) < 5:
            continue
        nxt_has = i + 1 < len(lines) and len(sk["lines"][i + 1]) > 4  # 続けて画面を見せるときは、枠を消さずに重ねて切り替える
        end = (lines[i + 1]["start"] + (12 if nxt_has else -2)) if i + 1 < len(lines) else total - 10
        prev_has = i > 0 and len(sk["lines"][i - 1]) > 4
        items = []
        for it in ln0[4]["items"]:
            if isinstance(it, dict):  # キリドリなど：{"file", "w", "dir", "crop", "marks"}
                d, f, w = it.get("dir", "screens-h"), it["file"], it["w"]
                sw, sh = Image.open(ROOT / "public" / d / f).size
                e = {"dir": d, "file": f, "srcW": sw, "srcH": sh, "width": w, "marks": it.get("marks", [])}
                if "crop" in it:
                    e["crop"] = dict(zip("xywh", it["crop"]))
                items.append(e)
                continue
            f, w = it[0], it[1]
            sw, sh = Image.open(ROOT / "public" / "screens-h" / f).size
            items.append({"dir": "screens-h", "file": f, "srcW": sw, "srcH": sh, "width": w, "marks": it[2] if len(it) > 2 else []})
        inserts.append({"start": lines[i]["start"] + (0 if prev_has else 4), "end": end, "note": ln0[4].get("note", INSERT_NOTE), "foot": ln0[4].get("foot", INSERT_FOOT), "items": items})
    props = {"actors": actors, "rigs": rigs, "sizes": SIZES, "lines": lines, "bg": "scene/bg_workshop.png", "bgm": "bgm-pop-long.wav", "bgmVolume": 0.26,
             "credit": sk.get("credit", "げんばアプリ工房｜音声：VOICEVOX Nemo"), "total": total, **({"inserts": inserts} if inserts else {})}
    (ROOT / "props" / f"{name}.json").write_text(json.dumps(props, ensure_ascii=False), encoding="utf-8")
    print(f"{name}「{sk['title']}」: {total / FPS:.1f}秒")


if __name__ == "__main__":
    for n in ([int(a) for a in sys.argv[1:]] or list(SKITS)):
        build(n)
