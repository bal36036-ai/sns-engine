"""会話劇の「手元の寄り」から始める場面（Opening）の props を作る。2026-10-09 ChatGPT企画 案1〜3（Issue #5）。ばる「Claudeに任せる」。
絵：public/scene/op/（SNS集客/キャラクター/gen_opening_art.py → prep_opening_art.py）。声：VOICEVOX Nemo（make_cast_skit.py の CAST の声）。
座標は 1080×1080 の画面の画素。layers の x, y は切り抜きの中心。
長い版は、寄りの場面（Opening）→ 口が動く場面（WorkScene、make_skit_batch.py）の順に作って、build_short.sh でつなぎ、BGMを重ねる。
使い方：VOICEVOX Nemo を起動してから  python tools/make_opening.py [名前…]  → props/<名前>.json
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_cast_skit import CAST, synth  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CREDIT = "げんばアプリ工房｜キャラクターの絵：AIで作成／音声：VOICEVOX Nemo"
BOX_TOP = dict(left=430, right=40, top=474)  # 案2：吹き出しを上に（メモの上）

OPS = {
    # 案2（試作）：Bの札の横に、新人がAのメモを置きかける → 黒シュナの指が入って止める
    "op2": dict(bg="scene/op/op2_bg.png", zoom=[1.0, 1.05], label="作業台", min=75,
                layers=[
                    dict(file="scene/op/op2_memo.png", width=620, keys=[
                        dict(at=0, pose=dict(x=-260, y=790, rot=-4)), dict(at=20, pose=dict(x=540, y=765, rot=-2)),
                        dict(at=30, pose=dict(x=520, y=770, rot=-2)), dict(at=75, pose=dict(x=512, y=772, rot=-2))]),
                    dict(file="scene/op/op2_point.png", width=640, keys=[
                        dict(at=0, pose=dict(x=1500, y=760, rot=-14)), dict(at=10, pose=dict(x=1500, y=760, rot=-14)),
                        dict(at=24, pose=dict(x=1070, y=712, rot=-14)), dict(at=75, pose=dict(x=1060, y=714, rot=-14))])],
                texts=[],
                lines=[dict(who="shuna", text="待って、それB。", voice="まって、それ、ビー。", start=14, box=BOX_TOP)]),
    # 案3（試作）：寸法線をなぞる新人の指が、数字を隠しているマグネットの手前で止まる
    "op3": dict(bg="scene/op/op3_bg.png", zoom=[1.0, 1.05], label="作業台", min=75,
                layers=[
                    dict(file="scene/op/op3_magnet.png", width=150, z=20, keys=[dict(at=0, pose=dict(x=540, y=718))]),
                    dict(file="scene/op/op3_paw.png", width=560, z=30, keys=[
                        dict(at=0, pose=dict(x=-200, y=760, rot=0)), dict(at=26, pose=dict(x=180, y=752, rot=0)),
                        dict(at=34, pose=dict(x=175, y=752, rot=0)), dict(at=75, pose=dict(x=175, y=752, rot=0))])],
                texts=[dict(text="3,000", x=540, y=708, size=46, z=10)],
                lines=[dict(who="shinjin", text="ここ、読めない。", voice="ここ、よめない。", start=12)]),
    # 案1（本編の前半）：①監督の指が、最初から下の段の札を指している「先に出すの、これ。」②黒シュナ「……いちばん下だね。」（上の部材は動かさない）。口が動く後半は skit-11
    "s1a": dict(bg="scene/op/op1_bg.png", zoom=[1.0, 1.1], label="部材置き場", min=140,
                layers=[
                    dict(file="scene/op/op1_point.png", width=700, keys=[
                        dict(at=0, pose=dict(x=225, y=870)), dict(at=14, pose=dict(x=225, y=884)), dict(at=24, pose=dict(x=225, y=870)),
                        dict(at=120, pose=dict(x=225, y=870)), dict(at=150, pose=dict(x=-150, y=870))])],
                texts=[],
                lines=[dict(who="kantoku", text="先に出すの、\nこれ。", voice="さきに、だすの、これ。", start=6, size=46, box=dict(left=620, right=30, bottom=60)),
                       dict(who="shuna", text="……いちばん\n下だね。", voice="……いちばん、した、だね。", start=66, size=46, box=dict(left=620, right=30, bottom=60))]),
    # 案4の代案「同じ輪郭、穴は逆。」（前半）：①新人が部材の外周をなぞって「ぴったり。」②黒シュナの指が図の穴を指し、部材の穴へ動く「穴、反対側だよ。」。口が動く後半は skit-13
    "s4a": dict(bg="scene/op/op4_bg.png", zoom=[1.0, 1.06], label="作業台", min=140,
                layers=[
                    dict(file="scene/op/op4_part.png", width=440, z=10, keys=[dict(at=0, pose=dict(x=290, y=650))]),
                    dict(file="scene/op/op4_draw.png", width=440, z=11, keys=[dict(at=0, pose=dict(x=790, y=650))]),
                    dict(file="scene/op/op3_paw.png", width=520, z=30, keys=[
                        dict(at=0, pose=dict(x=-170, y=548)), dict(at=14, pose=dict(x=-30, y=548)), dict(at=34, pose=dict(x=150, y=548)),
                        dict(at=46, pose=dict(x=150, y=560)), dict(at=70, pose=dict(x=-200, y=560))]),
                    dict(file="scene/op/op2_point.png", width=600, z=40, keys=[
                        dict(at=0, pose=dict(x=1500, y=690, rot=-8)), dict(at=44, pose=dict(x=1500, y=690, rot=-8)), dict(at=62, pose=dict(x=1170, y=690, rot=-8)),
                        dict(at=94, pose=dict(x=1170, y=690, rot=-8)), dict(at=116, pose=dict(x=520, y=660, rot=-8)), dict(at=150, pose=dict(x=520, y=660, rot=-8))])],
                texts=[],
                lines=[dict(who="shinjin", text="ぴったり。", voice="ぴったり。", start=14, box=dict(left=70, right=70, bottom=40)),
                       dict(who="shuna", text="穴、反対側だよ。", voice="あな、はんたいがわだよ。", start=66, box=dict(left=70, right=70, bottom=40))]),
    # 案3（本編の前半）：①新人「ここ、読めない。」→ ②設計がマグネットをずらす「……私が隠してた。」。口が動く後半は skit-9（make_skit_batch.py）
    "s3a": dict(bg="scene/op/op3_bg.png", zoom=[1.0, 1.06], label="作業台", min=150,
                layers=[
                    dict(file="scene/op/op3_magnet.png", width=150, z=20, keys=[
                        dict(at=0, pose=dict(x=540, y=718)), dict(at=84, pose=dict(x=540, y=718)), dict(at=112, pose=dict(x=735, y=722, rot=40))]),
                    dict(file="scene/op/op3_paw.png", width=560, z=30, keys=[
                        dict(at=0, pose=dict(x=-200, y=760)), dict(at=26, pose=dict(x=180, y=752)), dict(at=34, pose=dict(x=175, y=752)),
                        dict(at=100, pose=dict(x=175, y=752)), dict(at=130, pose=dict(x=60, y=760))]),
                    dict(file="scene/op/op3_paw2.png", width=560, z=40, keys=[
                        dict(at=0, pose=dict(x=1500, y=722)), dict(at=76, pose=dict(x=1500, y=722)), dict(at=100, pose=dict(x=980, y=724)),
                        dict(at=118, pose=dict(x=930, y=724)), dict(at=140, pose=dict(x=1500, y=722))])],
                texts=[dict(text="3,000", x=540, y=708, size=46, z=10)],
                lines=[dict(who="shinjin", text="ここ、読めない。", voice="ここ、よめない。", start=12),
                       dict(who="sekkei", text="……私が隠してた。", voice="……わたしが、かくしてた。", start=72)]),
}


def s3b():
    """案3の改善版（ChatGPT修正依頼）：腕を肩から伸ばし（袖の端を肩に固定して回す）、新人が数字の場所を目で追う → 指が止まる → 設計が気づいて（表情）腕を伸ばしてマグネットをずらす → 数字が見えたあと、2匹が目を合わせる。
    表情は、元の絵の頭の部分だけを差し替える（public/scene/op/op3p_*.png、prep_op3_variants.py）。"""
    pub = ROOT / "public" / "scene" / "op"
    A_C = (150, 440)  # 新人の肩（画面左側）
    A_P = (600, 445)  # 設計の肩（画面左側）
    layers = [
        dict(file="scene/op/op3_magnet.png", width=150, z=20, keys=[
            dict(at=0, pose=dict(x=540, y=718)), dict(at=86, pose=dict(x=540, y=718)), dict(at=114, pose=dict(x=735, y=722, rot=40))]),
        # 新人の腕：肩 → 寸法線の左 → 真ん中のすき間へなぞって止まる
        dict(file="scene/op/op3_paw.png", width=560, z=30, origin=[0.0, 0.5], noShadow=True, fadeStart=True, keys=[
            dict(at=0, pose=dict(x=A_C[0], y=A_C[1], rot=84, scale=0.3, opacity=0)), dict(at=8, pose=dict(x=A_C[0], y=A_C[1], rot=78, scale=0.5, opacity=1)),
            dict(at=34, pose=dict(x=A_C[0], y=A_C[1], rot=44.5, scale=0.7, opacity=1)), dict(at=120, pose=dict(x=A_C[0], y=A_C[1], rot=44.5, scale=0.7, opacity=1)),
            dict(at=140, pose=dict(x=A_C[0], y=A_C[1], rot=60, scale=0.45, opacity=0))]),
        # 設計の腕：肩から下へ伸ばして、マグネットを右へずらす
        dict(file="scene/op/op3_paw2.png", width=560, z=40, origin=[1.0, 0.5], noShadow=True, fadeStart=True, keys=[
            dict(at=0, pose=dict(x=A_P[0], y=A_P[1], rot=-80, scale=0.3, opacity=0)), dict(at=58, pose=dict(x=A_P[0], y=A_P[1], rot=-80, scale=0.3, opacity=0)),
            dict(at=72, pose=dict(x=A_P[0], y=A_P[1], rot=-77.6, scale=0.5, opacity=1)), dict(at=86, pose=dict(x=A_P[0], y=A_P[1], rot=-77.6, scale=0.5, opacity=1)),
            dict(at=114, pose=dict(x=A_P[0], y=A_P[1], rot=-116, scale=0.55, opacity=1)), dict(at=132, pose=dict(x=A_P[0], y=A_P[1], rot=-100, scale=0.35, opacity=0))]),
    ]
    def patch(name, a, b, c, d):  # a→b で出して、c→d で消す（頭の差分）
        f = pub / f"op3p_{name}.png"
        if f.exists():
            layers.append(dict(file=f"scene/op/op3p_{name}.png", width=1080, z=5, noShadow=True, keys=[
                dict(at=0, pose=dict(x=540, y=540, opacity=0)), dict(at=a, pose=dict(x=540, y=540, opacity=0)), dict(at=b, pose=dict(x=540, y=540, opacity=1)),
                dict(at=c, pose=dict(x=540, y=540, opacity=1)), dict(at=d, pose=dict(x=540, y=540, opacity=0 if d < 9999 else 1))]))
    patch("p_notice", 46, 54, 104, 114)   # 設計が気づく（指のあたりを見て、眉が上がる）
    patch("p_sorry", 108, 118, 9998, 9999)  # 数字が出たあと、新人を見て照れる
    patch("c_relief", 120, 130, 9998, 9999)  # 新人がほっとして設計を見る
    return dict(bg="scene/op/op3_bg.png", zoom=[1.0, 1.04], label="作業台", min=150, layers=layers,
                texts=[dict(text="3,000", x=540, y=708, size=46, z=10)],
                lines=[dict(who="shinjin", text="ここ、読めない。", voice="ここ、よめない。", start=12),
                       dict(who="sekkei", text="……私が隠してた。", voice="……わたしが、かくしてた。", start=72)])


OPS["s3b"] = s3b()


def build(name):
    op = OPS[name]
    out = ROOT / "public" / "audio" / name
    out.mkdir(parents=True, exist_ok=True)
    lines, end = [], 0
    for i, ln in enumerate(op["lines"]):
        c = CAST[ln["who"]]
        d, _ = synth(ln["voice"], out / f"line-{i}.wav", c["voice"], c["pitch"])
        end = max(end, ln["start"] + 6 + round(d * 30))
        lines.append({"start": ln["start"], "name": c["name"], "color": c["color"], "text": ln["text"], "voice": f"{name}/line-{i}.wav", "lead": 6, **({"box": ln["box"]} if "box" in ln else {}), **({"size": ln["size"]} if "size" in ln else {})})
    total = max(op["min"], end + 15)
    props = {"bg": op["bg"], "zoom": op["zoom"], "layers": op["layers"], "texts": op["texts"], "label": op.get("label"), "total": total, "credit": CREDIT, "lines": lines}
    (ROOT / "props" / f"{name}.json").write_text(json.dumps(props, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{name}: 全体 {total / 30:.1f}秒")


if __name__ == "__main__":
    for n in (sys.argv[1:] or list(OPS)):
        build(n)
