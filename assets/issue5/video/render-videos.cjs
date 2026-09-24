// Render eight review-only vertical videos from verified local app screenshots.
// Requires capture-source.cjs, Edge, puppeteer-core, and ffmpeg on PATH.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const puppeteer = require('../../../node_modules/puppeteer-core');

const dir = __dirname;
const src = path.join(dir, 'source');
const frames = path.join(dir, 'frames');
fs.mkdirSync(frames, { recursive: true });
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const image = (name) => `data:image/png;base64,${fs.readFileSync(path.join(src, name)).toString('base64')}`;
const assets = {
  kCondition: image('kiridori-conditions-card.png'),
  kParts: image('kiridori-parts-card.png'),
  kStock: image('kiridori-stock1-card.png'),
  kResult: image('kiridori-results.png'),
  hSpan: image('harinavi-span-card.png'),
  hLoad: image('harinavi-load-card.png'),
  hJudge: image('harinavi-judgement-card.png'),
  hCheck: image('harinavi-check-card.png'),
  hResult: image('harinavi-results.png')
};

const S = (seconds, title, caption, visual, extra = {}) => ({ seconds, title, caption, visual, ...extra });
const videos = [
  { id: '20260924-tiktok-kiridori', app: 'キリドリ', date: '9/24 TikTok', slides: [
    S(2, 'この部材、どの定尺から切る？', '2500mm × 2本・定尺6000mm', 'memo'),
    S(5, '必要な長さと本数を拾う', '紙のメモから条件をそろえる', 'memo'),
    S(6, '定尺と刃幅を入力', '6,000mm・5mm', 'kCondition'),
    S(8, '入力から切り出し案へ', '部材の長さと本数を確認', 'kParts'),
    S(5, '考える時間を、少し軽く', '切り出し案は実画面で見返せます', 'kStock', { summary: true })
  ] },
  { id: '20260925-youtube-harinavi', app: 'ハリナビ', date: '9/25 YouTube Shorts', slides: [
    S(2, 'この結果、どの条件？', '画面の数値は動作確認用の例', 'hCheck'),
    S(5, '数字だけを転記すると', '元の条件を探すことに', 'memoH'),
    S(10, 'まず入力条件を確認', 'スパン長 3,000mm・吊り荷 2t', 'hConditions'),
    S(6, '次に結果を見返す', '条件と結果を一緒に確認', 'hResult'),
    S(5, '数字の出どころを見返す', '入力条件と結果をセットで', 'hJudge', { summary: true })
  ] },
  { id: '20260926-tiktok-kiridori', app: 'キリドリ', date: '9/26 TikTok', slides: [
    S(2, 'この1本、どう切る？', '定尺1本目の切り出し図', 'kStock'),
    S(5, '材料ごとに確認', '1本目の構成を図で見る', 'kStock'),
    S(9, 'どの部材を切るか', '柱用部材A 2,500mm × 2本', 'kStock'),
    S(7, '残る長さも確認', '1本目の端材 990mm', 'kStock'),
    S(4, 'あとで見返せる計画へ', '材料ごとの切り出し案を確認', 'kResult', { summary: true })
  ] },
  { id: '20260927-tiktok-harinavi', app: 'ハリナビ', date: '9/27 TikTok', slides: [
    S(2, '数字だけ見て終わり？', '結果の数字には入力条件があります', 'hCheck'),
    S(6, 'どんな条件で見たか', 'スパン長と荷重を確認', 'hConditions'),
    S(9, '何を確認したか', '結果画面の確認項目を見る', 'hResult'),
    S(7, '条件と結果を往復', '数字の出どころを見返す', 'hLoad'),
    S(5, '条件と結果をセットで確認', '一次照査の補助', 'hJudge', { summary: true })
  ] },
  { id: '20260927-youtube-harinavi', app: 'ハリナビ', date: '9/27 YouTube Shorts', slides: [
    S(2, 'その結果、条件まで確認できますか？', '梁の一次照査を補助するハリナビ', 'hCheck'),
    S(6, '入力条件を見る', 'スパン長 3,000mm・吊り荷 2t', 'hConditions'),
    S(10, '確認項目と結果を見る', '画面に出ている項目をたどる', 'hResult'),
    S(6, '条件から結果へ', '同じ動作確認用の例で見返す', 'hLoad'),
    S(5, '入力条件と結果を見返しやすく', '一次照査の補助', 'hJudge', { summary: true })
  ] },
  { id: '20260928-youtube-kiridori', app: 'キリドリ', date: '9/28 YouTube Shorts', slides: [
    S(2, 'メモの次、切り方は？', '紙と計画画面を見比べる', 'memo'),
    S(6, '必要な長さと本数を拾う', '柱用部材A 2,500mm × 2本など', 'memo'),
    S(7, '同じ条件を入力', '定尺 6,000mm・刃幅 5mm', 'kCondition'),
    S(8, '切り出し案を図で確認', '材料ごとの組み合わせと端材', 'kResult'),
    S(5, '拾う→組み合わせる', '紙のメモと実画面を見比べる', 'kStock', { summary: true })
  ] },
  { id: '20260929-tiktok-harinavi', app: 'ハリナビ', date: '9/29 TikTok', slides: [
    S(2, 'この数字、どこから見る？', '結果画面の実際の表示', 'hCheck'),
    S(6, 'まず入力条件', 'スパン長 3,000mm・吊り荷 2t', 'hConditions'),
    S(8, '次に確認項目', '梁全体の曲げ応力など', 'hCheck'),
    S(7, '結果は条件とセットで', '表示項目を順にたどる', 'hResult'),
    S(6, '条件→項目→結果', '一次照査の補助', 'hJudge', { summary: true })
  ] },
  { id: '20260930-youtube-kiridori', app: 'キリドリ', date: '9/30 YouTube Shorts', slides: [
    S(2, 'この切り方、最初に入れるのは3つ', '結果画面から始める', 'kStock'),
    S(6, '1. 使う定尺の長さ', '定尺 6,000mm', 'kCondition'),
    S(8, '2. 必要部材の長さと本数', '2,500mm × 2本など', 'kParts'),
    S(6, '3. 刃幅などの条件', '刃幅 5mmを確認', 'kCondition'),
    S(6, '条件をそろえて結果を見る', '材料ごとの切り出し案へ', 'kResult', { summary: true })
  ] }
];

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function html(video, slide, index) {
  const hari = video.app === 'ハリナビ';
  const memo = slide.visual === 'memo' || slide.visual === 'memoH';
  const srcImg = assets[slide.visual];
  const visual = memo ? (hari
    ? '<div class="memo"><div class="memoTitle">転記した数字</div><div class="memoValue">69.691 N/mm²</div><div class="memoLine">元の条件は？</div><div class="memoNote">実画面の動作確認用の例</div></div>'
    : '<div class="memo"><div class="memoTitle">材料取りメモ</div><div class="memoLine">定尺　6,000 mm</div><div class="memoLine">柱用部材A　2,500 mm × 2本</div><div class="memoLine">梁用部材B　1,800 mm × 2本</div><div class="memoLine">補強材C　1,200 mm × 2本</div><div class="memoNote">説明用の架空例。実画面と同じ条件</div></div>')
    : slide.visual === 'hConditions'
      ? `<div class="screen stack"><img src="${assets.hSpan}" alt="スパン長の実画面"><img src="${assets.hLoad}" alt="吊り荷の実画面"></div>`
      : `<div class="screen"><img src="${srcImg}" alt="${escape(video.app)}の実画面"></div>`;
  return `<!doctype html><html lang="ja"><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;width:720px;height:1280px;overflow:hidden}
    body{font-family:'Yu Gothic','Meiryo',sans-serif;background:${hari?'#eef4f7':'#fff5ec'};color:#172c35}
    .top{height:96px;background:${hari?'#1d526c':'#b85031'};color:white;display:flex;align-items:center;justify-content:space-between;padding:0 42px;font-weight:800;font-size:27px;letter-spacing:.04em}
    .main{height:1035px;padding:46px 46px 20px;display:flex;flex-direction:column}
    .eyebrow{font-size:26px;font-weight:800;color:${hari?'#25667f':'#bb5b3a'};margin-bottom:22px}
    h1{font-size:${slide.title.length>24?'44':'52'}px;line-height:1.33;letter-spacing:.01em;margin:0 0 24px;font-weight:900;min-height:148px}
    .caption{font-size:30px;line-height:1.45;color:#435862;font-weight:700;min-height:92px}
    .visual{flex:1;display:flex;align-items:center;justify-content:center;min-height:0;padding:20px 0}
    .screen{width:100%;max-height:690px;background:white;padding:16px;border-radius:22px;box-shadow:0 14px 40px #1a334021;display:flex;align-items:center;justify-content:center;border:2px solid ${hari?'#b9d3db':'#edcbbb'}}
    .screen img{display:block;width:100%;max-height:654px;object-fit:contain}.stack{display:flex;flex-direction:column;gap:24px}.stack img{max-height:180px}
    .memo{width:100%;background:#fffdf6;padding:40px 42px;border-radius:8px;box-shadow:4px 8px 24px #2d2d2d20;transform:rotate(-1deg);border-top:12px solid #ead7a8}
    .memoTitle{font-size:38px;font-weight:900;margin-bottom:34px}.memoValue{font-size:55px;font-weight:900;margin:26px 0;color:#2c5363}.memoLine{font-size:32px;font-weight:750;line-height:1.8;border-bottom:2px solid #e2e3dc}.memoNote{font-size:24px;color:#667075;margin-top:32px;font-weight:700}
    .bottom{height:149px;border-top:3px solid ${hari?'#d7e6eb':'#f1d3c4'};padding:26px 46px 12px;display:flex;flex-direction:column;justify-content:space-between;background:#fffdfacc}
    .source{font-size:25px;font-weight:850;color:#35515e}.note{font-size:22px;color:#57646a;line-height:1.25}.safety{font-size:21px;color:#5c6470;font-weight:700}
    .summary h1{color:${hari?'#1c5d77':'#af4b2d'}}
  </style><body class="${slide.summary?'summary':''}"><div class="top"><span>${escape(video.app)}</span><span>${escape(video.date)}</span></div><div class="main"><div class="eyebrow">${String(index+1).padStart(2,'0')} / ${String(video.slides.length).padStart(2,'0')}</div><h1>${escape(slide.title)}</h1><div class="caption">${escape(slide.caption)}</div><div class="visual">${visual}</div></div><div class="bottom"><div class="source">${memo?'説明用メモ':'アプリの実画面'} ｜ げんばアプリ工房</div><div class="note">画面の数値は動作確認用の例です。</div>${hari?'<div class="safety">一次照査の補助。安全の最終判断は専門家へ。</div>':''}</div></body></html>`;
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: edge, headless: 'new', defaultViewport: { width: 720, height: 1280, deviceScaleFactor: 1 } });
  try {
    const page = await browser.newPage();
    for (const video of videos) {
      const list = [];
      for (let i = 0; i < video.slides.length; i++) {
        const slide = video.slides[i];
        await page.setContent(html(video, slide, i), { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        const file = path.join(frames, `${video.id}-${i+1}.png`);
        await page.screenshot({ path: file });
        list.push(`file '${file.replace(/'/g, "'\\''")}'\nduration ${slide.seconds}`);
      }
      const last = path.join(frames, `${video.id}-${video.slides.length}.png`);
      list.push(`file '${last.replace(/'/g, "'\\''")}'`);
      const concat = path.join(frames, `${video.id}.txt`);
      fs.writeFileSync(concat, list.join('\n')+'\n', 'utf8');
      const output = path.join(dir, `${video.id}.mp4`);
      execFileSync('ffmpeg', ['-y','-loglevel','error','-f','concat','-safe','0','-i',concat,'-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000','-vf','fps=24,format=yuv420p','-c:v','libx264','-preset','veryfast','-crf','25','-movflags','+faststart','-c:a','aac','-b:a','64k','-t',String(video.slides.reduce((n,s)=>n+s.seconds,0)),'-shortest',output], { stdio:'inherit' });
      console.log(`${video.id}.mp4 ${video.slides.reduce((n,s)=>n+s.seconds,0)}s`);
    }
  } finally { await browser.close(); }
}
run().catch((e)=>{console.error(e);process.exitCode=1});
