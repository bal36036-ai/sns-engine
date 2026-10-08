"""動画の質を上げるための絵（加工場の背景、部品に分けたキャラ）を Codex の画像生成で作る。
2026-10-08 ばる「この動画を参考に…このくらいにできますか？」→「無料でいいよ」（参考：2Dのループアニメのような流れと背景の雰囲気）。
画風の見本：職人黒シュナ/_gen/reference.png と 職人黒シュナ/poses/s1_1-1.png。ChatGPTの利用枠を使う（追加の支払いなし）。
出力：シーン/<名前>.png（Codexがコピーできなかったときは ~/.codex/generated_images/<スレッド>/ から取り出す）
使い方：python gen_scene_art.py [名前…]
"""
import glob, os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "..", "LINE絵文字")))
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding="utf-8")
    except Exception: pass
MODEL = os.environ.get("LINE_EMOJI_CODEX_MODEL", "gpt-6.1-sol")
GENIMG = os.path.join(os.path.expanduser("~"), ".codex", "generated_images")
WORK = os.path.join(HERE, "シーン")

JOBS = {
    "bg_workshop": (
        "Draw ONE wide landscape background illustration (3:2) of the inside of a Japanese steel fabrication workshop, for an animated short. "
        "Tall steel-frame building, skylights and side windows with warm late-afternoon sunlight beams and a little dust in the air, "
        "steel H-beams and pipes stacked on racks, a band saw cutting machine on the left, a yellow overhead crane on a rail with a hanging hook, "
        "a rack of cut steel offcuts sorted by length, a work table with a tape measure and a clipboard, concrete floor with yellow safety lines. "
        "Leave a wide empty open floor area across the lower middle so that 4 small characters can stand there. Eye-level camera, gentle depth of field in the far back. "
        "NO people, NO animals, NO text, NO numbers, NO logos, NO signs with letters. "
        "Art style: the same soft painterly, warm, detailed illustration style as reference.png and reference_cast.png (cozy picture-book / 2D animation background)."
    ),
    "parts_shuna": (
        "Draw ONE image on a flat pure green (#00FF00) background (no shadow, no floor): cut-out PUPPET PARTS for animating the dog in reference_cast.png "
        "(same dog, same helmet, same clothes, same art style, same scale as reference_cast.png). Draw these 5 parts separated by wide empty gaps, in one row, none touching:\n"
        "1. the HEAD with the yellow helmet, ears and beard, facing the viewer, cut off just below the chin strap (no neck, no body)\n"
        "2. the BODY WITHOUT ARMS: torso with the orange safety vest, the white towel around the neck, and both legs and feet, facing the viewer (the shoulders end cleanly where arms would attach)\n"
        "3. the LEFT ARM alone (navy sleeve and paw), hanging straight down, from shoulder to paw\n"
        "4. the RIGHT ARM alone (navy sleeve and paw), hanging straight down, from shoulder to paw\n"
        "5. the RIGHT ARM alone, bent at the elbow with the paw raised and open, as if waving\n"
        "Do not use green on the dog. No text, no labels, no outlines."
    ),
}


def main():
    import codex_thread
    os.makedirs(WORK, exist_ok=True)
    shuna = os.path.join(HERE, "職人黒シュナ")
    shutil.copy(os.path.join(shuna, "_gen", "reference.png"), os.path.join(WORK, "reference.png"))
    shutil.copy(os.path.join(shuna, "poses", "s1_1-1.png"), os.path.join(WORK, "reference_cast.png"))
    for name in (sys.argv[1:] or list(JOBS)):
        out = f"{name}.png"; tgt = os.path.join(WORK, out)
        if os.path.exists(tgt): os.remove(tgt)
        pr = (f"【げんばアプリ工房】動画の絵「{name}」を作る（gen_scene_art.py）\n\n"
              f"The folder {WORK} has reference.png and reference_cast.png (art style references). Load both with view_image, then use the built-in image_gen tool.\n\n"
              + JOBS[name] +
              f"\n\nThen copy the generated image into {WORK} as {out}, and finish by printing the output path and anything that failed. Do not create, edit or delete files anywhere else.\n")
        print(f"{name}: 生成中…", flush=True)
        ok, msg, tid, log = codex_thread.run_turn(WORK, pr, MODEL, name=f"【げんばアプリ工房】動画の絵 {name}", timeout=900, effort="high")
        open(os.path.join(WORK, f"log_{name}.txt"), "w", encoding="utf-8").write(f"ok={ok} thread={tid}\n{msg}\n---\n{log}")
        if not os.path.exists(tgt):
            found = sorted(glob.glob(os.path.join(GENIMG, str(tid), "*.png")), key=os.path.getmtime)
            if found: shutil.copy(found[-1], tgt)
        print("  →", "できました" if os.path.exists(tgt) else "できませんでした", flush=True)


if __name__ == "__main__":
    main()
