"""会話劇の「最初の2秒」の試作（Opening）の props を作る。2026-10-09 ChatGPT企画 案2「待って、それB。」・案3「ここ、読めない。」。
絵：public/scene/op/（SNS集客/キャラクター/gen_opening_art.py → prep_opening_art.py）。声：VOICEVOX Nemo（make_cast_skit.py の CAST の声）。
座標は 1080×1080 の画面の画素。layers の x, y は切り抜きの中心。
使い方：VOICEVOX Nemo を起動してから  python tools/make_opening.py [op2 op3]  → props/op2.json など
"""
import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_cast_skit import CAST, synth  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CREDIT = "げんばアプリ工房｜キャラクターの絵：AIで作成／音声：VOICEVOX Nemo"


def wsize(file, width):
    w, h = Image.open(ROOT / "public" / file).size
    return width, round(h * width / w)


OPS = {
    # 案2：Bの札の横に、新人がAのメモを置きかける → 黒シュナの指が入って止める
    "op2": dict(bg="scene/op/op2_bg.png", zoom=[1.0, 1.05], label="作業台",
                layers=[
                    dict(file="scene/op/op2_memo.png", width=620, keys=[
                        dict(at=0, pose=dict(x=-260, y=790, rot=-4)),
                        dict(at=20, pose=dict(x=540, y=765, rot=-2)),
                        dict(at=30, pose=dict(x=520, y=770, rot=-2)),
                        dict(at=75, pose=dict(x=512, y=772, rot=-2))]),
                    dict(file="scene/op/op2_point.png", width=640, keys=[
                        dict(at=0, pose=dict(x=1500, y=760, rot=-14)),
                        dict(at=10, pose=dict(x=1500, y=760, rot=-14)),
                        dict(at=24, pose=dict(x=1070, y=712, rot=-14)),
                        dict(at=75, pose=dict(x=1060, y=714, rot=-14))])],
                texts=[],
                line=dict(who="shuna", text="待って、それB。", voice="まって、それ、ビー。", start=14, box=dict(left=430, right=40, top=474))),
    # 案3：寸法線をなぞる新人の指が、数字を隠しているマグネットの手前で止まる
    "op3": dict(bg="scene/op/op3_bg.png", zoom=[1.0, 1.05], label="作業台",
                layers=[
                    dict(file="scene/op/op3_magnet.png", width=150, z=20, keys=[dict(at=0, pose=dict(x=540, y=718))]),
                    dict(file="scene/op/op3_paw.png", width=560, z=30, keys=[
                        dict(at=0, pose=dict(x=-200, y=760, rot=0)),
                        dict(at=26, pose=dict(x=180, y=752, rot=0)),
                        dict(at=34, pose=dict(x=175, y=752, rot=0)),
                        dict(at=75, pose=dict(x=175, y=752, rot=0))])],
                texts=[dict(text="3,000", x=540, y=708, size=46, z=10)],
                line=dict(who="shinjin", text="ここ、読めない。", voice="ここ、よめない。", start=12)),
}


def build(name):
    op = OPS[name]
    out = ROOT / "public" / "audio" / name
    out.mkdir(parents=True, exist_ok=True)
    ln = op["line"]
    c = CAST[ln["who"]]
    d, _ = synth(ln["voice"], out / "line-0.wav", c["voice"], c["pitch"])
    total = max(75, ln["start"] + 6 + round(d * 30) + 15)
    props = {"bg": op["bg"], "zoom": op["zoom"], "layers": op["layers"], "texts": op["texts"], "label": op.get("label"), "total": total, "credit": CREDIT,
             "lines": [{"start": ln["start"], "name": c["name"], "color": c["color"], "text": ln["text"], "voice": f"{name}/line-0.wav", "lead": 6, **({"box": ln["box"]} if "box" in ln else {})}]}
    (ROOT / "props" / f"{name}.json").write_text(json.dumps(props, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{name}: 声 {d:.2f}秒、全体 {total / 30:.1f}秒")


if __name__ == "__main__":
    for n in (sys.argv[1:] or list(OPS)):
        build(n)
