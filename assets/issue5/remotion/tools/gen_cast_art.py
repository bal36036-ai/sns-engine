"""げんばアプリ工房の現場キャラクター（黒シュナの仲間）の絵を、Codexの組み込み画像生成で作る。
2026-10-08 ばる「他のキャラも作って複数人の現場での動画みたいにしたい」→ 役：現場監督・設計/事務所・新人、動物：犬だけ（犬種を変える）。
- 画風の見本：職人黒シュナ/_gen/reference.png（黒シュナ16個）と、主役の全身（職人黒シュナ/poses/s1_1-1.png）。
- 2×2のシート（4ポーズ）を作り、緑背景を抜いて1ポーズずつの透過PNG（<キャラ>/poses/）に分ける。
- Codexがファイルをコピーできなかったときは、~/.codex/generated_images/<スレッド>/ から取り出す。
- 仕組みは LINE絵文字/gen_art.py と同じ（codex_thread.run_turn。ChatGPTの利用枠を使う。追加の支払いなし）。
使い方：python gen_cast_art.py <キャラ> <シート番号…>   例：python gen_cast_art.py kantoku 1 2
"""
import glob, os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
LINE = os.path.abspath(os.path.join(HERE, "..", "..", "LINE絵文字"))
sys.path.insert(0, LINE)
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding="utf-8")
    except Exception: pass

MODEL = os.environ.get("LINE_EMOJI_CODEX_MODEL", "gpt-6.1-sol")
GENIMG = os.path.join(os.path.expanduser("~"), ".codex", "generated_images")

CAST = {
    "kantoku": {
        "folder": "現場監督_柴犬",
        "who": "a Shiba Inu dog (red-tan coat with cream cheeks, chest and belly, upright pointed ears, curled tail) who is the site supervisor",
        "outfit": "a WHITE hard hat with a thin chin strap, a light grey work jacket and grey work pants, a plain yellow armband on the left upper arm (no text), a small pen in the chest pocket",
        "sheets": {
            1: ["standing facing the viewer, calm confident closed-mouth smile, paws at its sides",
                "standing facing the viewer, mouth open as if talking, one front paw raised as if explaining",
                "standing facing the viewer, troubled face, eyebrows down, a blue sweat drop, one paw on the back of its head",
                "standing facing the viewer, surprised face, mouth open, ears up"],
            2: ["standing, holding a clipboard in one paw and checking it with a pen, serious face",
                "standing, pointing forward to the right with one paw, giving instructions, mouth open",
                "standing, nodding with eyes closed and a satisfied smile, giving a thumbs-up",
                "standing, looking at a wristwatch on its wrist, slightly impatient face"],
        },
    },
    "sekkei": {
        "folder": "設計_トイプードル",
        "who": "an apricot (light orange-brown) Toy Poodle dog with curly fluffy fur who is the structural designer from the office",
        "outfit": "round thin black glasses, a WHITE hard hat with a thin chin strap, a light blue collared shirt and a dark navy work vest, beige work pants",
        "sheets": {
            1: ["standing facing the viewer, gentle closed-mouth smile, paws at its sides",
                "standing facing the viewer, mouth open as if talking, one front paw raised with a finger-like gesture as if explaining",
                "standing facing the viewer, thinking, one paw adjusting its glasses, serious face",
                "standing facing the viewer, troubled face, a blue sweat drop, both paws together"],
            2: ["standing, holding an open grey laptop computer in both paws and looking at the screen",
                "standing, holding a rolled-up white blueprint drawing under one arm, smiling",
                "standing, holding an open white blueprint drawing with both paws and showing it to the viewer (the drawing has only simple blue lines, no text)",
                "standing, happy, one paw raised, eyes closed with a big smile"],
        },
    },
    "shinjin": {
        "folder": "新人_コーギー",
        "who": "a young Pembroke Welsh Corgi puppy (orange and white coat, big upright ears, short legs) who is the new worker in the first year",
        "outfit": "a yellow hard hat with a small green-and-yellow chevron beginner sticker on the front (no text), brand-new light khaki work clothes that are a little too big (sleeves slightly long), white work gloves",
        "sheets": {
            1: ["standing facing the viewer, eager bright smile, paws at its sides",
                "standing facing the viewer, mouth open as if asking a question, one paw raised high like raising a hand",
                "standing facing the viewer, confused face, head tilted, a question mark symbol above its head",
                "standing facing the viewer, very surprised, mouth wide open, ears straight up"],
            2: ["standing, carrying one long grey steel bar with both paws, struggling a little, sweat drop",
                "standing, bowing politely with paws together in front",
                "standing, writing in a small notebook with a pencil, serious face",
                "standing, very happy, jumping a little with both paws raised"],
        },
    },
}

STYLE = """Rules for the image:
- Background: flat pure green (#00FF00) only. No shadow, gradient, floor or scenery.
- Do not use green anywhere on the dog, clothes or props (except the small beginner sticker if described).
- NO white outline / sticker border around the illustrations.
- Leave wide empty gaps between the 4 illustrations; they must not overlap or touch.
- No text, numbers, logos or speech bubbles (a small sweat drop or a question mark symbol is fine).
- FULL BODY: the dog stands upright on its hind legs like a person, exactly like the main character in reference_cast.png. Same head-to-body proportion, same size and scale in all 4 cells.
- Same painterly, soft, realistic fur art style as reference.png and reference_cast.png (those show a black schnauzer; do NOT draw a schnauzer, draw the dog described below)."""


def prompt(key, n, work, out):
    c = CAST[key]
    lines = "\n".join(f"{i}. {p}" for i, p in enumerate(c["sheets"][n], 1))
    return (f"【げんばアプリ工房】現場キャラ {c['folder']}：シート{n}の絵を作る（gen_cast_art.py）\n\n"
            f"The folder {work} has reference.png (a character sheet showing the art style) and reference_cast.png (the main character, a craftsman dog, full body). "
            "Use the built-in image_gen tool.\n"
            f"Steps: (1) Load {work}\\reference.png and {work}\\reference_cast.png with view_image. (2) With image_gen, draw ONE new image: "
            f"a 2x2 sheet (4 illustrations) of ONE NEW character: {c['who']}. The same character in all 4 cells. "
            f"(3) Copy the generated image into {work} as {out}. (4) Finish by printing the output path and anything that failed. "
            "Do not create, edit or delete files anywhere else.\n\n"
            f"Outfit: {c['outfit']}. No logos, no text, no badges with letters.\n\n" + STYLE +
            "\n\nThe 4 illustrations (left to right, top to bottom):\n" + lines + "\n")


def split(path, dest, prefix):
    import intake
    from PIL import Image
    import numpy as np
    a = intake.remove_bg(Image.open(path))
    dil = max(6, int(min(a.shape[:2]) * 0.012))
    boxes = intake.order(intake.groups(a[..., 3] > 40, dil))
    if len(boxes) != 4: return len(boxes)
    os.makedirs(dest, exist_ok=True)
    for i, sl in enumerate(boxes, 1):
        ys, xs = np.where(a[sl][..., 3] > 10)
        sl = (slice(sl[0].start + ys.min(), sl[0].start + ys.max() + 1), slice(sl[1].start + xs.min(), sl[1].start + xs.max() + 1))
        Image.fromarray(a[sl]).save(os.path.join(dest, f"{prefix}-{i}.png"))
    return 4


def main():
    key = sys.argv[1]
    nums = [int(a) for a in sys.argv[2:]] or list(CAST[key]["sheets"])
    c = CAST[key]
    base = os.path.join(HERE, c["folder"])
    work = os.path.join(base, "_gen")
    os.makedirs(work, exist_ok=True)
    shuna = os.path.join(HERE, "職人黒シュナ")
    shutil.copy(os.path.join(shuna, "_gen", "reference.png"), os.path.join(work, "reference.png"))
    shutil.copy(os.path.join(shuna, "poses", "s1_1-1.png"), os.path.join(work, "reference_cast.png"))
    import codex_thread
    for n in nums:
        out = f"sheet{n}.png"
        pr = prompt(key, n, work, out)
        open(os.path.join(work, f"prompt{n}.txt"), "w", encoding="utf-8").write(pr)
        for t in (1, 2):
            tgt = os.path.join(work, out)
            if os.path.exists(tgt): os.remove(tgt)
            print(f"{c['folder']} シート{n}: 生成中（{t}回目）…", flush=True)
            ok, msg, tid, log = codex_thread.run_turn(work, pr, MODEL, name=f"【げんばアプリ工房】{c['folder']} シート{n}", timeout=900, effort="high")
            open(os.path.join(work, f"log{n}_{t}.txt"), "w", encoding="utf-8").write(f"ok={ok} thread={tid}\n{msg}\n---\n{log}")
            if not os.path.exists(tgt):  # Codexがコピーできなかったときは、生成画像の保存先から取り出す
                found = sorted(glob.glob(os.path.join(GENIMG, str(tid), "*.png")), key=os.path.getmtime)
                if found: shutil.copy(found[-1], tgt)
            if not os.path.exists(tgt): print("  → 画像ができませんでした"); continue
            shutil.copy(tgt, os.path.join(work, f"raw{n}_{t}.png"))
            k = split(tgt, os.path.join(base, "poses"), f"s{n}")
            if k == 4: print(f"  → 4ポーズに分けました（poses/s{n}-1〜4.png）"); break
            print(f"  → 分割NG：{k}個")
    print("完了")


if __name__ == "__main__":
    main()
