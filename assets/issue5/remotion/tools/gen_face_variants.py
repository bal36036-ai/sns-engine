"""口パク・まばたき用に、同じ絵の「口を開けた顔」「目を閉じた顔」を Codex の画像生成（編集）で作る。
2026-10-08 ばる「もっと自然な動きで作れないの？」→ 体はそのままで、口と目の部分だけ差し替えて動かす試作。
- 元の絵：_face/base.png（poses/s1_1-1.png を緑の背景にのせ、2倍に拡大したもの）
- 出力：_face/<名前>.png（Codexがコピーできなかったときは ~/.codex/generated_images/<スレッド>/ から取り出す）
使い方：python gen_face_variants.py [名前…]
"""
import glob, os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "..", "..", "LINE絵文字")))
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding="utf-8")
    except Exception: pass
MODEL = os.environ.get("LINE_EMOJI_CODEX_MODEL", "gpt-6.1-sol")
GENIMG = os.path.join(os.path.expanduser("~"), ".codex", "generated_images")
WORK = os.path.join(HERE, "_face")

VARIANTS = {
    "mouth_half": "the mouth is HALF OPEN as if in the middle of saying a word (small open mouth, a little tongue visible)",
    "mouth_open": "the mouth is WIDE OPEN as if saying 'ah' while talking (tongue visible)",
    "eyes_closed": "both eyes are gently CLOSED as in the middle of a blink (curved eyelid lines), mouth closed in the same smile",
}


def prompt(key, out):
    return (f"【げんばアプリ工房】職人黒シュナ：顔の差分「{key}」を作る（gen_face_variants.py）\n\n"
            f"Use the built-in image_gen tool to EDIT the image {WORK}\\base.png (load it with view_image first and pass it to image_gen as the image to edit).\n"
            "Make an image that is IDENTICAL to base.png: same canvas size, same pure green (#00FF00) background, same dog, same pose, same position, "
            "same scale, same helmet, same clothes, same lighting, same art style. Change ONLY the face: " + VARIANTS[key] + ".\n"
            "Do not move, resize, crop or redraw anything else. No text.\n"
            f"Then copy the generated image into {WORK} as {out}, and finish by printing the output path and anything that failed. "
            "Do not create, edit or delete files anywhere else.\n")


def main():
    import codex_thread
    keys = sys.argv[1:] or list(VARIANTS)
    for k in keys:
        out = f"{k}.png"; tgt = os.path.join(WORK, out)
        if os.path.exists(tgt): os.remove(tgt)
        pr = prompt(k, out)
        print(f"{k}: 生成中…", flush=True)
        ok, msg, tid, log = codex_thread.run_turn(WORK, pr, MODEL, name=f"【げんばアプリ工房】黒シュナ 顔の差分 {k}", timeout=900, effort="high")
        open(os.path.join(WORK, f"log_{k}.txt"), "w", encoding="utf-8").write(f"ok={ok} thread={tid}\n{msg}\n---\n{log}")
        if not os.path.exists(tgt):
            found = sorted(glob.glob(os.path.join(GENIMG, str(tid), "*.png")), key=os.path.getmtime)
            if found: shutil.copy(found[-1], tgt)
        print("  →", "できました" if os.path.exists(tgt) else "できませんでした")


if __name__ == "__main__":
    main()
