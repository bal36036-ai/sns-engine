"""動作のコマ（作業する・歩く）を、Codex の画像生成で4コマずつ作る（パラパラ漫画のように切り替えて動かす）。
2026-10-08 ばる「作業中の動きとかできないの？作業してるところに他のキャラが歩いてきて喋るとか？」
画風・キャラの見本：各キャラの poses/。ChatGPTの利用枠を使う（追加の支払いなし）。
出力：<キャラ>/actions/<動作>-1〜4.png（透過PNG）。シートは <キャラ>/_act/
使い方：python gen_action_art.py <動作名…>
"""
import glob, os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "..", "LINE絵文字")))
sys.path.insert(0, HERE)
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding="utf-8")
    except Exception: pass
from gen_cast_art import split, STYLE  # noqa: E402

MODEL = os.environ.get("LINE_EMOJI_CODEX_MODEL", "gpt-6.1-sol")
GENIMG = os.path.join(os.path.expanduser("~"), ".codex", "generated_images")

ACTIONS = {
    "shuna_measure": {
        "folder": "職人黒シュナ", "ref": "s1_1-1.png",
        "who": "the craftsman dog in reference_cast.png (black-and-silver miniature schnauzer, yellow hard hat, navy work jacket, orange safety vest, white towel)",
        "scene": "standing upright behind a small waist-high grey steel work table, seen in 3/4 view facing to the right; a long grey square steel bar lies on the table",
        "frames": [
            "holding a yellow tape measure, hooking the end of the tape on the left end of the steel bar",
            "pulling the yellow tape out along the steel bar toward the right, looking down at the tape",
            "holding the tape at the right side and marking the steel bar with a pencil in the other paw",
            "looking closely at the pencil mark with a focused face, the tape retracted in its paw",
        ],
    },
    "shuna_table": {
        "folder": "職人黒シュナ", "ref": "s1_1-1.png",
        "who": "the craftsman dog in reference_cast.png (black-and-silver miniature schnauzer, yellow hard hat, navy work jacket, orange safety vest, white towel)",
        "scene": "standing upright behind the SAME small waist-high grey steel work table as in reference_table.png, with the same grey square steel bar and yellow tape measure lying on the table",
        "frames": [
            "facing the viewer, calm closed-mouth face, both paws resting on the table",
            "facing the viewer, troubled face, eyebrows down, a blue sweat drop, one paw scratching the side of its helmet",
            "facing the viewer, head tilted, one paw on its chin, thinking",
            "turned toward the left side, surprised face, mouth open, ears up",
        ],
    },
    "kantoku_walk": {
        "folder": "現場監督_柴犬", "ref": "s1-1.png",
        "who": "the site supervisor dog in reference_cast.png (Shiba Inu, WHITE hard hat, light grey work jacket and pants, yellow armband on the left arm, barefoot like the reference)",
        "scene": "walking to the RIGHT, side view, holding a clipboard in one paw, a 4-frame walk cycle",
        "frames": [
            "walk cycle frame 1: left leg forward touching the ground, right leg back, arms swinging opposite",
            "walk cycle frame 2: legs passing under the body, body slightly higher",
            "walk cycle frame 3: right leg forward touching the ground, left leg back, arms swinging opposite",
            "walk cycle frame 4: legs passing under the body, body slightly higher",
        ],
    },
}


def main():
    import codex_thread
    for key in (sys.argv[1:] or list(ACTIONS)):
        a = ACTIONS[key]
        base = os.path.join(HERE, a["folder"])
        work = os.path.join(base, "_act"); os.makedirs(work, exist_ok=True)
        shutil.copy(os.path.join(HERE, "職人黒シュナ", "_gen", "reference.png"), os.path.join(work, "reference.png"))
        shutil.copy(os.path.join(base, "poses", a["ref"]), os.path.join(work, "reference_cast.png"))
        table = os.path.join(base, "actions", "shuna_measure-1.png")
        if key == "shuna_table" and os.path.exists(table): shutil.copy(table, os.path.join(work, "reference_table.png"))
        out = f"{key}.png"; tgt = os.path.join(work, out)
        lines = "\n".join(f"{i}. {f}" for i, f in enumerate(a["frames"], 1))
        pr = (f"【げんばアプリ工房】動作のコマ「{key}」を作る（gen_action_art.py）\n\n"
              f"The folder {work} has reference.png (art style) and reference_cast.png (the character). Load both with view_image, then use the built-in image_gen tool.\n"
              f"Draw ONE image: a 2x2 sheet of 4 ANIMATION FRAMES of {a['who']}, {a['scene']}.\n"
              "These are consecutive frames of one short animation: keep the character, the props, the camera angle, the position inside each cell and the size EXACTLY the same in all 4 frames; only the arms, legs and small head movements change.\n\n"
              + STYLE.replace("like the main character in reference_cast.png", "like reference_cast.png") +
              "\n\nThe 4 frames (left to right, top to bottom):\n" + lines +
              f"\n\nThen copy the generated image into {work} as {out}, and finish by printing the output path and anything that failed. Do not create, edit or delete files anywhere else.\n")
        open(os.path.join(work, f"prompt_{key}.txt"), "w", encoding="utf-8").write(pr)
        for t in (1, 2):
            if os.path.exists(tgt): os.remove(tgt)
            print(f"{key}: 生成中（{t}回目）…", flush=True)
            ok, msg, tid, log = codex_thread.run_turn(work, pr, MODEL, name=f"【げんばアプリ工房】動作のコマ {key}", timeout=900, effort="high")
            open(os.path.join(work, f"log_{key}_{t}.txt"), "w", encoding="utf-8").write(f"ok={ok} thread={tid}\n{msg}\n---\n{log}")
            if not os.path.exists(tgt):
                found = sorted(glob.glob(os.path.join(GENIMG, str(tid), "*.png")), key=os.path.getmtime)
                if found: shutil.copy(found[-1], tgt)
            if not os.path.exists(tgt): print("  → 画像ができませんでした"); continue
            shutil.copy(tgt, os.path.join(work, f"raw_{key}_{t}.png"))
            k = split(tgt, os.path.join(base, "actions"), key)
            if k == 4: print(f"  → 4コマに分けました（actions/{key}-1〜4.png）", flush=True); break
            print(f"  → 分割NG：{k}個", flush=True)


if __name__ == "__main__":
    main()
