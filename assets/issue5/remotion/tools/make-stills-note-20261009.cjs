// 2026-10-09 note記事「切りしろって、何？」用の図（ばる「noteね」。Threadsのコメントで「図にして、あらためて投稿します」と約束した説明）。
// 6mの定尺材から1.5mの部材を切る例（Threadsのクイズ：6mの定尺材から、1.5mの部材は何本？切りしろ3mm。答え：3本、4本には6.009m必要）。
// 切りしろは見やすいように太く描く（説明図に明記）。数字は計算で出した値：1.5×4＋0.003×3＝6.009m、6.000−0.003×3−1.5×3＝1.491m。
// 出力：out/note-20261009/*.png（1280×670のヘッダー＋図2枚）
// 使い方：node tools/make-stills-note-20261009.cjs
const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("C:/新しいフォルダー/OneDrive/AI作成/SNS集客/エンジン/node_modules/puppeteer-core");
const OUT = path.join(__dirname, "..", "out", "note-20261009");
fs.mkdirSync(OUT, { recursive: true });
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:#F8F4EC;font-family:'Noto Sans JP','Yu Gothic','Meiryo',sans-serif;color:#1F2D3D;position:relative;overflow:hidden}
.bar{position:absolute;left:0;top:0;bottom:0;width:22px;background:#D9622B}
.wrap{padding:44px 56px 0 64px}
h1{font-size:54px;line-height:1.3;font-weight:900}
h1 em{font-style:normal;color:#D9622B}
.sub{font-size:28px;font-weight:700;color:#5F6B76;margin-top:12px;line-height:1.5}
.foot{position:absolute;left:64px;right:56px;bottom:26px;font-size:24px;font-weight:700;color:#5F6B76;display:flex;justify-content:space-between}
.track{position:relative;height:96px;border:3px solid #1F2D3D;border-radius:8px;background:#E5DDCE;display:flex;overflow:hidden}
.part{height:100%;background:#5B6B7B;color:#fff;font-size:32px;font-weight:900;display:flex;align-items:center;justify-content:center;border-right:0}
.kerf{width:14px;height:100%;background:#D9622B;flex:none}
.rest{height:100%;background:repeating-linear-gradient(45deg,#E8D9BE,#E8D9BE 8px,#F8F4EC 8px,#F8F4EC 16px);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:#5F6B76}
.lab{font-size:32px;font-weight:800;margin:26px 0 10px}
.lab small{font-size:26px;color:#5F6B76;font-weight:700}
.note{font-size:26px;font-weight:700;color:#5F6B76;margin-top:16px;line-height:1.5}
.note b{color:#D9622B}
.box{margin-top:22px;border-radius:14px;background:#fff;border:2px solid #D9D2C5;padding:18px 24px;font-size:32px;font-weight:800;line-height:1.5}
.box .ng{color:#C0392B}
`;
const page = (w, h, body, foot = "") => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}body{width:${w}px;height:${h}px}</style></head><body><div class="bar"></div><div class="wrap">${body}</div>${foot}</body></html>`;
const FOOT = `<div class="foot"><span>げんばアプリ工房</span><span>説明図（画面表示ではありません）</span></div>`;
// 6,000mm を 1000px 幅で描く。1.5m=250px。切りしろ（本当は3mm）は見やすいように14pxで描く
const W6 = 1000;
const P = 250;

const pages = {
  "00-header": page(1280, 670, `
<div style="height:540px;display:flex;flex-direction:column;justify-content:center">
<h1>切りしろって、<em>何？</em></h1>
<div class="sub" style="font-size:36px;margin-top:22px">6mの材料から、1.5mを何本取れる？<br>答え合わせを、図でやり直します</div></div>`, `<div class="foot"><span>げんばアプリ工房｜開発中の道具の話</span><span>@genba_apps</span></div>`),

  "01-fig-4pieces": page(1280, 640, `
<h1 style="font-size:44px">4本取ろうとすると、<em>9mm足りない</em></h1>
<div class="lab">6,000mmの材料 <small>（1.5m×4本ほしい）</small></div>
<div class="track" style="width:${W6}px">
 <div class="part" style="width:${P}px">1.5m</div><div class="kerf"></div>
 <div class="part" style="width:${P}px">1.5m</div><div class="kerf"></div>
 <div class="part" style="width:${P}px">1.5m</div><div class="kerf"></div>
 <div class="part" style="width:${P - 42}px;background:#8A94A0">1.5m</div>
 <div style="width:0;border-left:6px dashed #C0392B;height:130px;margin-top:-17px"></div>
</div>
<div class="note">オレンジの線 ＝ 切るたびに消える、刃の厚み分（切りしろ）。ここでは<b>1回3mm</b>。図では見やすいように、切りしろも不足分も大きく描いています。</div>
<div class="box">1.5m×4本＝6.000m ＋ 切りしろ 3回×3mm＝0.009m<br>→ <span class="ng">6.009m が必要。6mでは9mm足りない</span></div>`, FOOT),

  "02-fig-3pieces": page(1280, 640, `
<h1 style="font-size:44px">3本なら取れて、<em>1.491m</em>残る</h1>
<div class="lab">6,000mmの材料 <small>（1.5m×3本）</small></div>
<div class="track" style="width:${W6}px">
 <div class="part" style="width:${P}px">1.5m</div><div class="kerf"></div>
 <div class="part" style="width:${P}px">1.5m</div><div class="kerf"></div>
 <div class="part" style="width:${P}px">1.5m</div><div class="kerf"></div>
 <div class="rest" style="width:${W6 - 3 * P - 3 * 14}px">残り 1.491m</div>
</div>
<div class="note">切る回数は<b>3回</b>（部材を3本切り離すため）。切りしろは3回分で 9mm。</div>
<div class="box">6.000m − 1.5m×3本（4.500m）− 切りしろ 0.009m ＝ <b>1.491m</b></div>`, FOOT),
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
  try {
    const pg = await browser.newPage();
    for (const [name, html] of Object.entries(pages)) {
      const m = html.match(/body\{width:(\d+)px;height:(\d+)px\}/);
      await pg.setViewport({ width: +m[1], height: +m[2], deviceScaleFactor: 1 });
      await pg.setContent(html, { waitUntil: "load" });
      await new Promise((r) => setTimeout(r, 250));
      await pg.screenshot({ path: path.join(OUT, `${name}.png`), clip: { x: 0, y: 0, width: +m[1], height: +m[2] } });
      console.log("作成:", name);
    }
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
