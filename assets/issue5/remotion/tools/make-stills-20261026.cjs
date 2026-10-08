// 10/26〜11/8 のThreads・X用の画像（ChatGPT企画、2026-10-08 ばる承認）。作り方は make-stills.cjs と同じ（実画面＝キリドリv66・ハリナビV26.09.064の切り抜き＋文字カード、HTML→PNG）。
// 会話劇の2枚は out/final/skit-6・7 の1コマ（public/stills-src）に「キャラクターの絵：AIで作成」を入れる。出力：out/stills-20261026/*.png
// 使い方：node tools/make-stills-20261026.cjs
// 使い方：node tools/make-stills.cjs
const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("C:/新しいフォルダー/OneDrive/AI作成/SNS集客/エンジン/node_modules/puppeteer-core");
const ROOT = path.join(__dirname, "..");
const PUB = path.join(ROOT, "public");
const OUT = path.join(ROOT, "out", "stills-20261026");
fs.mkdirSync(OUT, { recursive: true });
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const pngSize = (file) => {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};
// 画像の一部（割合）を、幅 width で見せる
const crop = (dir, file, width, c = [0, 0, 1, 1], extra = "") => {
  const p = path.join(PUB, dir, file);
  const { w, h } = pngSize(p);
  const scale = width / (c[2] * w);
  const H = Math.round(c[3] * h * scale);
  const b64 = fs.readFileSync(p).toString("base64");
  return `<div class="shot" style="width:${width}px;height:${H}px;${extra}"><img src="data:image/png;base64,${b64}" style="left:${-c[0] * w * scale}px;top:${-c[1] * h * scale}px;width:${w * scale}px;height:${h * scale}px"></div>`;
};
const K = (f, w, c, e) => crop("screens", f, w, c, e);
const H = (f, w, c, e) => crop("screens-h", f, w, c, e);
const BOTTOM = [0, 0.69, 1, 0.31];
const CELL_STOCKS = [0, 0, 0.49, 0.305];
const CELL_YIELD = [0.505, 0.345, 0.49, 0.305];
const CELL_SCRAP = [0, 0.69, 0.49, 0.30];
const CELL_KERF = [0.505, 0.69, 0.49, 0.30];

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{width:1080px;background:#F8F4EC;font-family:'Noto Sans JP','Yu Gothic','Meiryo',sans-serif;color:#1F2D3D;position:relative;overflow:hidden}
.bar{position:absolute;left:0;top:0;bottom:0;width:22px;background:#D9622B}
.wrap{padding:56px 60px 0 62px}
h1{font-size:62px;line-height:1.25;font-weight:900;letter-spacing:.01em}
h1 em{font-style:normal;color:#D9622B}
.note{font-size:30px;font-weight:700;color:#5F6B76;margin-top:14px;line-height:1.4}
.note b{color:#D9622B}
.shot{position:relative;overflow:hidden;border-radius:16px;border:2px solid #D9D2C5;background:#fff;box-shadow:0 8px 24px rgba(31,45,61,.14)}
.shot img{position:absolute;display:block}
.cols{display:flex;gap:24px;margin-top:18px}
.col{flex:1}
.lab{font-size:40px;font-weight:900;margin:0 0 10px}
.lab small{font-size:28px;color:#5F6B76;font-weight:700}
.stack>*+*{margin-top:10px}
.foot{position:absolute;left:62px;right:60px;bottom:34px;font-size:27px;font-weight:700;color:#5F6B76;display:flex;justify-content:space-between}
.warn{margin-top:16px;padding:14px 20px;border-radius:14px;background:#1F2D3D;color:#fff;font-size:32px;font-weight:800;line-height:1.35}
.tag{display:inline-block;padding:4px 16px;border-radius:999px;background:#D9622B;color:#fff;font-size:28px;font-weight:900;margin-left:12px;vertical-align:middle}
.big{font-size:84px;font-weight:900;line-height:1.3}
`;
const FOOT_K = `<div class="foot"><span>げんばアプリ工房｜キリドリ（開発中）</span><span>動作確認用の例</span></div>`;
const FOOT_H = `<div class="foot"><span>げんばアプリ工房｜ハリナビ（開発中）</span><span>動作確認用の例</span></div>`;
const FOOT_B = `<div class="foot"><span>げんばアプリ工房</span><span>@genba_apps</span></div>`;
const SAFE = `<div class="warn">ハリナビは一次照査の補助です。最終判断は専門家。</div>`;

const page = (h, body, foot, bg) => ({ h, html: `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}body{height:${h}px}</style></head><body><div class="bar"></div><div class="wrap">${body}</div>${foot}</body></html>`, bg });

const pages = {};

// 会話劇の1コマ（out/final/skit-6・7 から取り出した 1080×1080）に「キャラクターの絵：AIで作成」を入れる
const frame = (file) => fs.readFileSync(path.join(PUB, "stills-src", file)).toString("base64");
const skit = (file) => ({ h: 1080, html: `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}body{height:1080px}</style></head><body>
<img src="data:image/png;base64,${frame(file)}" style="position:absolute;left:0;top:0;width:1080px;height:1080px">
<div style="position:absolute;left:24px;top:1012px;padding:6px 16px;border-radius:10px;background:rgba(31,45,61,.78);color:#fff;font-size:24px;font-weight:700">キャラクターの絵：AIで作成</div>
</body></html>` });
pages["20261027-skit"] = skit("skit-6.png");
pages["20261103-skit"] = skit("skit-7.png");

// 10/28 歩留まり91.7%の中身（実画面＋説明図）
pages["20261028-k-yield"] = page(1350, `
<h1>歩留まり91.7%の<em>中身</em></h1>
<div class="note">キリドリの動作確認用の例｜定尺6,000mm・刃幅5mm・並び替えは自動</div>
<div class="cols" style="align-items:flex-start">
 <div class="col"><div class="lab">切り出し図 <small>定尺2本</small></div><div class="stack">${K("stock1-auto.png", 456)}${K("stock2-auto.png", 456)}</div></div>
 <div class="col"><div class="lab">結果</div><div class="stack">${K("summary-auto.png", 456, CELL_STOCKS)}${K("summary-auto.png", 456, CELL_YIELD)}</div></div>
</div>
<div class="note" style="margin-top:26px">説明図（画面表示ではありません）</div>
<div style="margin-top:8px;border-radius:16px;background:#fff;border:2px solid #D9D2C5;padding:24px 28px 20px">
 <div style="font-size:34px;font-weight:800;margin-bottom:12px">使う定尺の合計：6,000mm×2本＝12,000mm</div>
 <div style="display:flex;height:90px;border-radius:12px;overflow:hidden;border:2px solid #1F2D3D">
  <div style="width:91.7%;background:#5B6B7B;color:#fff;font-size:34px;font-weight:900;display:flex;align-items:center;justify-content:center">部材 11,000mm</div>
  <div style="width:8.3%;background:repeating-linear-gradient(45deg,#E8D9BE,#E8D9BE 6px,#F8F4EC 6px,#F8F4EC 12px)"></div>
 </div>
 <div style="font-size:30px;font-weight:700;color:#5F6B76;margin-top:10px">11,000mm ÷ 12,000mm ≒ 91.7%</div>
</div>`, FOOT_K);

// 10/29 入力順と自動（定尺3本→2本、61.1%→91.7%）
pages["20261029-k-compare"] = page(1350, `
<h1>部材は同じ。<br>定尺は<em>3本→2本</em></h1>
<div class="note">キリドリの動作確認用の例｜定尺6,000mm・刃幅5mm・部材 A2,500mm×2／B1,800mm×2／C1,200mm×2</div>
<div class="cols">
 <div class="col"><div class="lab">入力順</div><div class="stack">${K("summary-inputorder.png", 456, CELL_STOCKS)}${K("summary-inputorder.png", 456, CELL_YIELD)}</div></div>
 <div class="col"><div class="lab">自動</div><div class="stack">${K("summary-auto.png", 456, CELL_STOCKS)}${K("summary-auto.png", 456, CELL_YIELD)}</div></div>
</div>
<div class="note" style="margin-top:22px">部材の合計は、どちらも11,000mm。<br>使う定尺の合計が 18,000mm → 12,000mm に変わると、割合も変わります。</div>`, FOOT_K);

// 10/31 引き継ぎ（済んだこと／残っていること）
pages["20261031-card"] = page(1080, `<div style="height:880px;display:flex;flex-direction:column;justify-content:center">
<div class="big" style="font-size:72px">引き継ぎで知りたいのは</div>
<div style="display:flex;gap:28px;margin-top:34px">
 <div style="flex:1;border-radius:18px;background:#fff;border:3px solid #5B6B7B;padding:34px 30px"><div style="font-size:52px;font-weight:900">済んだこと</div><div class="note" style="margin-top:10px">どこまで終わったか</div></div>
 <div style="flex:1;border-radius:18px;background:#fff;border:3px solid #D9622B;padding:34px 30px"><div style="font-size:52px;font-weight:900;color:#D9622B">残っていること</div><div class="note" style="margin-top:10px">何が、どれだけ残っているか</div></div>
</div>
<div class="note" style="font-size:38px;margin-top:34px">残りの作業、どう伝えていますか？</div></div>`, FOOT_B);

// 11/4 ハリナビ：比べる前の入力条件
pages["20261104-h-input"] = page(1350, `
<h1>比べる前に、<em>入力条件</em></h1>
<div class="note">ハリナビの動作確認用の例｜同じ吊り荷・同じスパン・同じ断面で、支持条件だけを変えて比べます</div>
<div class="stack" style="margin-top:18px">${H("input-load.png", 956)}${H("input-span.png", 956)}${H("input-steel.png", 956)}</div>
<div class="cols">
 <div class="col"><div class="lab">単純支持</div>${H("input-support-simple.png", 456)}</div>
 <div class="col"><div class="lab">両端固定</div>${H("input-support-fixed.png", 456)}</div>
</div>
${SAFE}`, FOOT_H);

// 11/5 ハリナビ：たわみ3.419mm／0.85mm（条件つき）
pages["20261105-h-compare"] = page(1350, `
<h1>たわみ3.419mm／0.85mm。<br>変えたのは<em>支え方</em>だけ</h1>
<div class="note">ハリナビの動作確認用の例｜吊り荷2t・スパン3,000mm・H-150×150×7×10</div>
<div class="lab" style="margin-top:22px">単純支持 <small>支持条件だけ変更</small></div>${H("check2-simple.png", 956)}
<div class="lab" style="margin-top:18px">両端固定</div>${H("check2-fixed.png", 956)}
<div class="note" style="margin-top:20px">この数字だけで、現場の支え方は選べません。入力した条件と結果をセットで。</div>
${SAFE}`, FOOT_H);

// 11/6 合計端材970mmの中身（切り出し図の残り 485mm×2本）
pages["20261106-k-scrap"] = page(1350, `
<h1>合計端材970mm。<br>その残りは<em>どこ</em>に？</h1>
<div class="note">キリドリの動作確認用の例｜定尺6,000mm・刃幅5mm・並び替えは自動</div>
<div class="stack" style="margin-top:18px">${K("stock1-auto.png", 956)}${K("stock2-auto.png", 956)}</div>
<div class="cols" style="align-items:center">
 <div class="col">${K("summary-auto.png", 456, CELL_SCRAP)}</div>
 <div class="col"><div class="note" style="margin-top:0">切り出し図では、1本目・2本目に<br><b>残485mm</b>ずつ。</div></div>
</div>`, FOOT_K);

// 11/7 キリドリ：「最適」の表示
pages["20261107-k-optimal"] = page(1350, `
<h1>「<em>最適</em>」と出るのは、<br>どんなとき？</h1>
<div class="note">キリドリの動作確認用の例｜計算方法の説明（実際の画面）</div>
<div style="margin-top:20px">${K("sort-auto.png", 956)}</div>
<div class="note" style="margin-top:24px;font-size:34px">この例の結果では<br>「定尺2本より少なくする組み合わせはありません（計算で確認済み）」</div>
<div style="margin-top:14px;display:flex;justify-content:center">${K("summary-auto.png", 640, CELL_STOCKS)}</div>`, FOOT_K);

// Xの文字カード
const card = (title, sub) => page(1080, `<div style="height:880px;display:flex;flex-direction:column;justify-content:center"><div class="big">${title}</div><div class="note" style="font-size:38px;margin-top:34px">${sub}</div></div>`, FOOT_B);
const em = (t) => `<em style='font-style:normal;color:#D9622B'>${t}</em>`;
pages["20261026-card"] = card(`${em("「道具、どこ？」")}<br>から始まる作業。`, "使い終わった人の「いつもの場所」、次の人にも伝わっていますか？");
pages["20261030-card"] = card(`作業は終わったのに、<br>次の人は${em("待っていた")}。`, "「終わったよ」と伝えるところまでが、ひとつの作業。");
pages["20261101-card"] = card(`道具の場所。<br>完了の合図。<br>${em("残っている作業")}。`, "「自分には分かる」を、次の人にも分かる形へ。");
pages["20261102-card"] = card(`「準備できています」。<br>何が、${em("どこまで")}？`, "材料、道具、必要な情報。作業前の確認、どう共有していますか？");
pages["20261108-card"] = card(`次に見たいのは、<br>${em("どんな場面")}？`, "道具や段取りの会話劇／入力から結果までの実画面");

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", defaultViewport: { width: 1080, height: 1350, deviceScaleFactor: 1 } });
  try {
    const pg = await browser.newPage();
    for (const [name, p] of Object.entries(pages)) {
      await pg.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
      await pg.setContent(p.html, { waitUntil: "load" });
      await new Promise((r) => setTimeout(r, 250));
      let h = p.h;
      if (p.h === 1350) {
        // 中身に合わせて高さを決める（最低1080、最大1350）
        const bottom = await pg.evaluate(() => document.querySelector(".wrap").getBoundingClientRect().bottom);
        h = Math.min(1350, Math.max(1080, Math.ceil(bottom + 110)));
      }
      await pg.setViewport({ width: 1080, height: h, deviceScaleFactor: 1 });
      await pg.evaluate((hh) => (document.body.style.height = hh + "px"), h);
      await pg.screenshot({ path: path.join(OUT, `${name}.png`), clip: { x: 0, y: 0, width: 1080, height: h } });
      console.log("作成:", name);
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
