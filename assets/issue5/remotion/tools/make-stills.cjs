// 10/12〜10/25 のThreads・X用の画像を作る。実画面（public/screens＝キリドリv66、public/screens-h＝ハリナビV26.09.064）の切り抜きと、
// 文字だけのカード（あるある投稿用）を、HTMLからPNGにする。数字はすべて撮影済みの実画面から。説明図には「説明図／画面表示ではありません」を入れる。
// 出力：out/stills-final/*.png
// 使い方：node tools/make-stills.cjs
const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("C:/新しいフォルダー/OneDrive/AI作成/SNS集客/エンジン/node_modules/puppeteer-core");
const ROOT = path.join(__dirname, "..");
const PUB = path.join(ROOT, "public");
const OUT = path.join(ROOT, "out", "stills-final");
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

// 10/13 K1：入力順 と 自動（条件・切り出し図・数字）
pages["20261013-k1-compare"] = page(1350, `
<h1>同じ部材。<em>端材</em>はどう変わる？</h1>
<div class="note">キリドリの動作確認用の例｜定尺6,000mm・刃幅5mm・部材 A2,500mm×2／B1,800mm×2／C1,200mm×2</div>
<div class="cols">
 <div class="col"><div class="lab">入力順 <small>定尺3本</small></div><div class="stack">${K("stock1-inputorder.png", 456)}${K("stock2-inputorder.png", 456)}${K("stock3-inputorder.png", 456)}${K("summary-inputorder.png", 456, CELL_STOCKS)}${K("summary-inputorder.png", 456, CELL_SCRAP)}</div></div>
 <div class="col"><div class="lab">自動 <small>定尺2本</small></div><div class="stack">${K("stock1-auto.png", 456)}${K("stock2-auto.png", 456)}${K("summary-auto.png", 456, CELL_STOCKS)}${K("summary-auto.png", 456, CELL_SCRAP)}</div></div>
</div>`, FOOT_K);

// 10/15 H1：単純支持と両端固定
pages["20261015-h1-support"] = page(1350, `
<h1>支え方の設定で、<em>たわみ</em>は？</h1>
<div class="note">ハリナビの動作確認用の例｜吊り荷2t・スパン3,000mm・H-150×150×7×10。変えたのは支持条件だけ</div>
<div class="cols">
 <div class="col"><div class="lab">単純支持</div><div class="stack">${H("input-support-simple.png", 456)}${H("check1-simple.png", 456)}${H("check2-simple.png", 456)}</div></div>
 <div class="col"><div class="lab">両端固定</div><div class="stack">${H("input-support-fixed.png", 456)}${H("check1-fixed.png", 456)}${H("check2-fixed.png", 456)}</div></div>
</div>
<div class="note" style="margin-top:20px">実際の支え方に合う設定の確認が必要です。</div>
${SAFE}`, FOOT_H);

// 10/17 クイズ：歩留まり91.7%
pages["20261017-quiz-yield"] = page(1350, `
<h1>歩留まり91.7%は、<br>どっちの割合？</h1>
<div class="note">キリドリの動作確認用の例（定尺6,000mm×2本を使用）</div>
<div style="margin-top:22px;display:flex;justify-content:center">${K("summary-auto.png", 640, CELL_YIELD)}</div>
<div class="note" style="margin-top:34px">説明図（画面表示ではありません）</div>
<div style="margin-top:8px;border-radius:16px;background:#fff;border:2px solid #D9D2C5;padding:28px 28px 22px">
 <div style="font-size:34px;font-weight:800;margin-bottom:12px">使った定尺の合計：12,000mm</div>
 <div style="display:flex;height:96px;border-radius:12px;overflow:hidden;border:2px solid #1F2D3D">
  <div style="width:91.7%;background:#5B6B7B;color:#fff;font-size:34px;font-weight:900;display:flex;align-items:center;justify-content:center">部材 11,000mm</div>
  <div style="width:8.3%;background:repeating-linear-gradient(45deg,#E8D9BE,#E8D9BE 6px,#F8F4EC 6px,#F8F4EC 12px)"></div>
 </div>
 <div style="display:flex;justify-content:space-between;font-size:30px;font-weight:700;color:#5F6B76;margin-top:10px"><span>部材になった分</span><span>残り 1,000mm（端材970mm＋刃幅ロス30mm）</span></div>
</div>`, FOOT_K);

// 10/19 K2：刃幅0mmと5mm
pages["20261019-k2-kerf"] = page(1350, `
<h1>切りしろを入れると、<br>どの数字が変わる？</h1>
<div class="note">キリドリの動作確認用の例｜部材 A2,500mm×2／B1,800mm×2／C1,200mm×2・並び替えは自動。<b>刃幅だけ変更</b></div>
<div class="cols">
 <div class="col"><div class="lab">刃幅0mm <small>比較用の設定</small></div><div class="stack">${K("conditions-kerf0.png", 456)}${K("summary-kerf0.png", 456, CELL_SCRAP)}${K("summary-kerf0.png", 456, CELL_KERF)}</div></div>
 <div class="col"><div class="lab">刃幅5mm</div><div class="stack">${K("conditions.png", 456)}${K("summary-auto.png", 456, CELL_SCRAP)}${K("summary-auto.png", 456, CELL_KERF)}</div></div>
</div>
<div class="note" style="margin-top:22px">0mmは実作業の推奨値ではなく、比較用です。</div>`, FOOT_K);

// 10/20 H2：OKと判定に含まれない項目
pages["20261020-h2-ok"] = page(1350, `
<h1>「OK」は、<br>どこまでのOK？</h1>
<div class="note">ハリナビの動作確認用の例｜実際の画面</div>
<div class="stack" style="margin-top:20px">${H("judgement-simple.png", 956)}${H("unevaluated.png", 956)}</div>
${SAFE}`, FOOT_H);

// 10/21 K3：部材Aを2本→4本
pages["20261021-k3-qty"] = page(1350, `
<h1>部材を追加すると、<br>定尺も変わる？</h1>
<div class="note">キリドリの動作確認用の例｜変えたのは<b>部材Aの数量だけ（2本→4本）</b>｜並び替えは自動</div>
<div style="margin-top:16px">${K("conditions.png", 956)}</div>
<div class="cols">
 <div class="col"><div class="lab">変更前 <small>A 2本</small></div><div class="stack">${K("parts.png", 456, [0, 0.12, 1, 0.62])}${K("summary-auto.png", 456, CELL_STOCKS)}${K("summary-auto.png", 456, CELL_YIELD)}</div></div>
 <div class="col"><div class="lab">変更後 <small>A 4本</small></div><div class="stack">${K("parts-qty4.png", 456, [0, 0.12, 1, 0.62])}${K("summary-qty4.png", 456, CELL_STOCKS)}${K("summary-qty4.png", 456, CELL_YIELD)}</div></div>
</div>`, FOOT_K);

// 10/23 H3：2t → 19.613kN
pages["20261023-h3-unit"] = page(1350, `
<h1>入力は「2t」。<br>計算では「19.613kN」。</h1>
<div class="note">ハリナビの動作確認用の例｜入力欄の下に、換算した値が表示されます</div>
<div style="margin-top:26px">${H("input-load.png", 956)}</div>
<div class="note" style="margin-top:30px;font-size:34px">数字だけでなく、単位も確認。<br>この表示は、実際の吊り作業に必要な設計荷重を示す値ではありません。</div>
${SAFE}`, FOOT_H);

// 10/24 K4：読み込みボタン（開発中）
pages["20261024-k4-import"] = page(1350, `
<h1>計算の前に、<br>数字を入力するところ</h1>
<div class="note">キリドリの動作確認用の例｜入力画面にある読み込みボタン<span class="tag">開発中</span></div>
<div style="margin-top:26px">${K("import.png", 956, [0, 0, 1, 0.42])}</div>
<div class="note" style="margin-top:30px;font-size:34px">「Excel/CSV」「PDF」「写真/OCR」のボタンは、いずれも開発中です。<br>読み取りの精度や完成を示すものではありません。</div>`, FOOT_K);

// あるある（文字カード）：Xの文字だけの投稿に付ける
const card = (title, sub) => page(1080, `<div style="height:880px;display:flex;flex-direction:column;justify-content:center"><div class="big">${title}</div><div class="note" style="font-size:38px;margin-top:34px">${sub}</div></div>`, FOOT_B);
pages["20261012-card"] = card("「あとで使う」の端材。<br>その<em style='font-style:normal;color:#D9622B'>「あとで」</em>が来たとき…", "長さが分からないと、測り直しに。端材の長さ、どこに残していますか？");
pages["20261014-card"] = card("材料取りがまとまったところで、<br><em style='font-style:normal;color:#D9622B'>「追加です」</em>。", "入る場所を探すか、全体を組み直すか。ここ、悩みませんか？");
pages["20261016-card"] = card("図面の赤字、メモの追記、口頭の変更。<br><em style='font-style:normal;color:#D9622B'>「いま使う数字はどれ？」</em>", "確認からやり直しになること、ありませんか？");
pages["20261018-card"] = card("寸法は図面、数量は別のメモ。", "切り始める前の「必要な情報をそろえる時間」も、地味にかかりますよね。");
pages["20261022-card"] = card("メモの略号。<br>書いた本人には分かるけれど、<br>渡した先では<em style='font-style:normal;color:#D9622B'>「これは何？」</em>", "加工場、現場、事務所で、いつもの呼び方が違うこともありそうです。");
pages["20261025-card"] = card("材料取りで、<br>いちばん手が止まるのは<em style='font-style:normal;color:#D9622B'>どこ</em>ですか？", "切る順番／数量の変更／必要な情報集め");

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
