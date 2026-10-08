"""案3の改善版（2026-10-09 ChatGPT修正依頼：人物と動作のつながりを自然に）用の、表情の差分の絵を Codex の画像生成で作る。
元の絵：シーン/op3_bg.png。構図・図面・机・もう一方の人物は変えず、片方の表情と目線だけを変えてもらう。
出力：シーン/op3v_<名前>.png（Codexがコピーできなかったときは ~/.codex/generated_images/<スレッド>/ から取り出す）
使い方：python gen_op3_variants.py [名前…]
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
SAME = ("Redraw the SAME image (base image: op3_bg.png): exactly the same composition, camera, framing, art style, table, blueprint drawing, magnets, hats, clothes, background and the same position and size of both characters' heads and bodies. "
        "Change ONLY what is described below; everything else must stay identical. NO text, NO letters, NO numbers.")
JOBS = {
    "p_notice": SAME + " CHANGE: the apricot toy poodle (right side) now looks DOWN toward the middle of the blueprint with raised eyebrows and a tiny open mouth, as if just noticing something ('oh'). The corgi (left) stays exactly the same.",
    "p_sorry": SAME + " CHANGE: the apricot toy poodle (right side) now turns his eyes toward the corgi (to his left) with a small embarrassed, apologetic smile. The corgi (left) stays exactly the same.",
    "c_relief": SAME + " CHANGE: the corgi puppy (left) now looks over toward the poodle with a relieved, happy smile and bright eyes, keeping his hand on his chin. The poodle (right) stays exactly the same.",
}


def main():
    import codex_thread
    os.makedirs(WORK, exist_ok=True)
    for name in (sys.argv[1:] or list(JOBS)):
        out = f"op3v_{name}.png"; tgt = os.path.join(WORK, out)
        if os.path.exists(tgt): os.remove(tgt)
        pr = (f"【げんばアプリ工房】動画の絵「{name}」を作る（gen_op3_variants.py）\n\n"
              f"The folder {WORK} has op3_bg.png (the base image) and reference.png / reference_cast.png (art style). Load op3_bg.png with view_image, then use the built-in image_gen tool.\n\n"
              + JOBS[name] +
              f"\n\nThen copy the generated image into {WORK} as {out}, and finish by printing the output path and anything that failed. Do not create, edit or delete files anywhere else.\n")
        print(f"{name}: 生成中…", flush=True)
        ok, msg, tid, log = codex_thread.run_turn(WORK, pr, MODEL, name=f"【げんばアプリ工房】動画の絵 op3 {name}", timeout=900, effort="high")
        open(os.path.join(WORK, f"log_op3v_{name}.txt"), "w", encoding="utf-8").write(f"ok={ok} thread={tid}\n{msg}\n---\n{log}")
        if not os.path.exists(tgt):
            found = sorted(glob.glob(os.path.join(GENIMG, str(tid), "*.png")), key=os.path.getmtime)
            if found: shutil.copy(found[-1], tgt)
        print("  →", "できました" if os.path.exists(tgt) else "できませんでした", flush=True)


if __name__ == "__main__":
    main()
