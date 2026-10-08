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
}


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
    ENTER_END = 50
    t = ENTER_END + 6
    lines, starts = [], []
    for i, (who, text, voice, poses) in enumerate(sk["lines"]):
        c = CAST[who]
        d, mouth = synth(voice, out / f"line-{i}.wav", c["voice"], c["pitch"])
        frames = max(55, math.ceil((LEAD / FPS + d + TAIL) * FPS))
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
        h = H[who]
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
    props = {"actors": actors, "rigs": rigs, "sizes": SIZES, "lines": lines, "bg": "scene/bg_workshop.png", "bgm": "bgm-pop-long.wav", "bgmVolume": 0.26,
             "credit": "げんばアプリ工房｜音声：VOICEVOX Nemo", "total": total}
    (ROOT / "props" / f"{name}.json").write_text(json.dumps(props, ensure_ascii=False), encoding="utf-8")
    print(f"{name}「{sk['title']}」: {total / FPS:.1f}秒")


if __name__ == "__main__":
    for n in ([int(a) for a in sys.argv[1:]] or list(SKITS)):
        build(n)
