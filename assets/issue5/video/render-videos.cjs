// Render review-only vertical videos from verified local app screenshots.
// Requires capture-source.cjs, Edge, puppeteer-core, and ffmpeg on PATH.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
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
  kResult: image('kiridori-stocks.png'),
  hSpan: image('harinavi-span-card.png'),
  hLoad: image('harinavi-load-card.png'),
  hJudge: image('harinavi-judgement-card.png'),
  hCheck: image('harinavi-check-card.png'),
  hResult: image('harinavi-results-focus.png')
};

const S = (seconds, title, caption, visual, extra = {}) => ({ seconds, title, caption, visual, ...extra });
const videos = [
  { id: '20260924-tiktok-kiridori', app: 'キリドリ', date: '9/24 TikTok', slides: [
    S(2, '6m材、どう切る？', 'まず切り出し図を見てください', 'kStock'),
    S(5, '必要な長さと本数を拾う', '紙のメモから条件をそろえる', 'memo'),
    S(6, '定尺と刃幅を入力', '6,000mm・5mm', 'kCondition'),
    S(8, '入力から切り出し案へ', '部材の長さと本数を確認', 'kParts'),
    S(5, 'キリドリで切り方を見てみる', '材料ごとの切り出し案まで確認', 'kResult', { summary: true })
  ] },
  { id: '20260925-youtube-harinavi', app: 'ハリナビ', date: '9/25 YouTube Shorts', slides: [
    S(2, '曲げ応力69.691、元条件は？', '曲げ応力の表示から見返す', 'hCheck'),
    S(5, '数字だけを転記すると', '元の条件を探すことに', 'memoH'),
    S(10, 'まず入力条件を確認', 'スパン長 3,000mm・吊り荷 2t', 'hConditions'),
    S(6, '次に結果を見返す', '条件と結果を一緒に確認', 'hResult'),
    S(5, '数字の出どころを保存', '入力条件と結果をセットで', 'hJudge', { summary: true })
  ] },
  { id: '20260926-tiktok-kiridori', app: 'キリドリ', date: '9/26 TikTok', slides: [
    S(2, '6m材の端材990mm、どこから？', '定尺1本目の切り出し図', 'kStock'),
    S(5, '最初に条件をそろえる', '定尺6,000mmと刃幅5mm', 'kCondition'),
    S(9, '必要な部材を入力', '柱用部材A 2,500mm × 2本など', 'kParts'),
    S(7, '残る長さも確認', '1本目の端材 990mm', 'kStock'),
    S(4, '他の材料はどう切る？', 'キリドリの結果画面で見てみる', 'kResult', { summary: true })
  ] },
  { id: '20260927-tiktok-harinavi', app: 'ハリナビ', date: '9/27 TikTok', slides: [
    S(2, '2tの入力、結果のどこを見る？', '実際の入力画面から', 'hLoad'),
    S(6, 'どんな条件で見たか', 'スパン長と荷重を確認', 'hConditions'),
    S(9, '何を確認したか', '結果画面の確認項目を見る', 'hResult'),
    S(7, '条件と結果を往復', '数字の出どころを見返す', 'hLoad'),
    S(5, '条件と結果をセットで確認', '見返すときは入力条件から', 'hJudge', { summary: true })
  ] },
  { id: '20260927-youtube-harinavi', app: 'ハリナビ', date: '9/27 YouTube Shorts', slides: [
    S(2, '曲げ応力69.691、どの条件？', '梁の一次照査を補助するハリナビ', 'hCheck'),
    S(6, '入力条件を見る', 'スパン長 3,000mm・吊り荷 2t', 'hConditions'),
    S(10, '確認項目と結果を見る', '画面に出ている項目をたどる', 'hResult'),
    S(6, '条件から結果へ', '同じ動作確認用の例で見返す', 'hLoad'),
    S(5, '入力条件と結果を見返しやすく', '比較用に、この条件を残す', 'hJudge', { summary: true })
  ] },
  { id: '20260928-youtube-kiridori', app: 'キリドリ', date: '9/28 YouTube Shorts', slides: [
    S(2, 'メモが切り出し図に？', 'まずキリドリの実画面から', 'kResult'),
    S(6, '必要な長さと本数を拾う', '柱用部材A 2,500mm × 2本など', 'memo'),
    S(7, '同じ条件を入力', '定尺 6,000mm・刃幅 5mm', 'kCondition'),
    S(8, '切り出し案を図で確認', '材料ごとの組み合わせと端材', 'kResult'),
    S(5, '同じ条件で、切り方を見てみる', 'キリドリの材料ごとの結果へ', 'kStock', { summary: true })
  ] },
  { id: '20260929-tiktok-harinavi', app: 'ハリナビ', date: '9/29 TikTok', slides: [
    S(2, '曲げ応力69.691、どこから読む？', '結果画面の実際の表示', 'hCheck'),
    S(6, 'まず入力条件', 'スパン長 3,000mm・吊り荷 2t', 'hConditions'),
    S(8, '次に確認項目', '梁全体の曲げ応力など', 'hCheck'),
    S(7, '結果は条件とセットで', '表示項目を順にたどる', 'hResult'),
    S(6, '条件→項目→結果', '続きで結果画面の見方へ', 'hJudge', { summary: true })
  ] },
  { id: '20260930-youtube-kiridori', app: 'キリドリ', date: '9/30 YouTube Shorts', slides: [
    S(2, '6m材の切り方、入力はこの3つ', '結果画面から始める', 'kStock'),
    S(6, '1. 使う定尺の長さ', '定尺 6,000mm', 'kCondition'),
    S(8, '2. 必要部材の長さと本数', '2,500mm × 2本など', 'kParts'),
    S(6, '3. 刃幅などの条件', '刃幅 5mmを確認', 'kCondition'),
    S(6, '条件をそろえて結果を見る', '次は結果画面の見方へ', 'kResult', { summary: true })
  ] },
  { id: '20261001-tiktok-harinavi', app: 'ハリナビ', date: '10/1 TikTok', slides: [
    S(2, 'この結果、元の条件は？', '曲げ応力の実際の表示', 'hCheck'),
    S(5, '何を入力したか', 'まず元の条件に戻ります', 'hConditions'),
    S(8, '条件をそろえる', 'スパン長 3,000mm・吊り荷 2t', 'hConditions'),
    S(8, '条件と結果を行き来', '同じ動作確認例の結果を確認', 'hCheck'),
    S(4, '結果の前に条件を確認', '最終判断は専門家へ', 'hConditions', { summary: true })
  ] }
];

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function html(video, slide, index) {
  const hari = video.app === 'ハリナビ';
  const accent = hari ? '#18748c' : '#ca5830';
  const memo = slide.visual === 'memo' || slide.visual === 'memoH';
  const srcImg = assets[slide.visual];
  const focus = {
    memo: '定尺と部材の条件', memoH: '数字の元条件', kCondition: '定尺と刃幅',
    kParts: '部材の長さと本数', kStock: '1本目の切り出し図', kResult: '材料ごとの結果',
    hConditions: 'スパン長と吊り荷', hSpan: '入力したスパン長', hLoad: '入力した吊り荷',
    hCheck: '曲げ応力の表示', hResult: '項目と結果', hJudge: '一次照査の表示'
  }[slide.visual];
  const hookFont = slide.title.length > 18 ? 55 : 65;
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
    .main{height:1184px;padding:46px 46px 90px;display:flex;flex-direction:column}
    .eyebrow{font-size:26px;font-weight:800;color:${hari?'#25667f':'#bb5b3a'};margin-bottom:22px}
    h1{font-size:${slide.title.length>24?'44':'52'}px;line-height:1.33;letter-spacing:.01em;margin:0 0 24px;font-weight:900;min-height:148px}
    .caption{font-size:30px;line-height:1.45;color:#435862;font-weight:700;min-height:92px}
    .visual{flex:1;display:flex;align-items:center;justify-content:center;min-height:0;padding:88px 0 10px;position:relative}
    .focusCallout{position:absolute;top:8px;left:14px;display:flex;align-items:center;gap:12px;color:${accent};font-size:29px;font-weight:900;background:#fffdfae8;padding:8px 22px;border-radius:14px;border:2px solid ${accent}}
    .focusArrow{font-size:46px;line-height:1}
    .screen{width:100%;max-height:625px;background:white;padding:16px;border-radius:22px;box-shadow:0 14px 40px #1a334021;display:flex;align-items:center;justify-content:center;border:5px solid ${accent}}
    .screen img{display:block;width:100%;max-height:582px;object-fit:contain}.stack{display:flex;flex-direction:column;gap:24px}.stack img{max-height:180px}
    .memo{width:100%;background:#fffdf6;padding:40px 42px;border-radius:8px;box-shadow:4px 8px 24px #2d2d2d20;transform:rotate(-1deg);border:5px solid ${accent};border-top:12px solid ${accent}}
    .memoTitle{font-size:38px;font-weight:900;margin-bottom:34px}.memoValue{font-size:55px;font-weight:900;margin:26px 0;color:#2c5363}.memoLine{font-size:32px;font-weight:750;line-height:1.8;border-bottom:2px solid #e2e3dc}.memoNote{font-size:24px;color:#667075;margin-top:32px;font-weight:700}
    .summary h1{color:${hari?'#1c5d77':'#af4b2d'}}
    .hook h1{font-size:${hookFont}px;line-height:1.27;background:#fffdfb;border-left:10px solid ${accent};padding:18px 18px 20px;box-shadow:0 8px 24px #23394312;border-radius:0 18px 18px 0}
  </style><body class="${slide.summary?'summary':''} ${index===0?'hook':''}"><div class="top"><span>${escape(video.app)}</span><span>${escape(video.date)}</span></div><div class="main"><div class="eyebrow">${String(index+1).padStart(2,'0')} / ${String(video.slides.length).padStart(2,'0')}</div><h1>${escape(slide.title)}</h1><div class="caption">${escape(slide.caption)}</div><div class="visual">${memo || slide.summary ? "" : `<div class="focusCallout"><span class="focusArrow">↓</span><span>注目：${escape(focus)}</span></div>`}${visual}</div></div></body></html>`;
}

async function run() {
  const selected = process.argv.find((arg) => arg.startsWith('--id='))?.slice(5);
  const outputDir = process.argv.find((arg) => arg.startsWith('--output-dir='))?.slice(13) || dir;
  const outputSuffix = process.argv.find((arg) => arg.startsWith('--output-suffix='))?.slice(16) || '';
  const framesOnly = process.argv.includes('--frames-only');
  fs.mkdirSync(outputDir, { recursive: true });
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'sns-issue5-motion-'));
  const browser = await puppeteer.launch({ executablePath: edge, headless: 'new', defaultViewport: { width: 720, height: 1280, deviceScaleFactor: 1 } });
  try {
    const page = await browser.newPage();
    for (const video of videos) {
      if (selected && selected !== video.id) continue;
      const segments = [];
      for (let i = 0; i < video.slides.length; i++) {
        const slide = video.slides[i];
        await page.setContent(html(video, slide, i), { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        const file = path.join(frames, `${video.id}-${i+1}.png`);
        await page.screenshot({ path: file });
        if (framesOnly) continue;
        const frameCount = slide.seconds * 24;
        // Hold every app screenshot still. Only scene changes get a short fade.
        const filter = i === 0 ? 'format=yuv420p' : 'fade=t=in:st=0:d=0.16:color=white,format=yuv420p';
        const segment = path.join(work, `${video.id}-${i+1}.mp4`);
        execFileSync('ffmpeg', ['-y','-loglevel','error','-loop','1','-framerate','24','-i',file,
          '-vf',filter,'-frames:v',String(frameCount),'-an','-c:v','libx264','-preset','veryfast',
          '-crf','24','-pix_fmt','yuv420p',segment], { stdio:'inherit' });
        segments.push(segment);
      }
      if (framesOnly) { console.log(`${video.id} 5 frames`); continue; }
      const concat = path.join(work, `${video.id}.txt`);
      fs.writeFileSync(concat, segments.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join('\n')+'\n', 'utf8');
      const output = path.join(outputDir, `${video.id}${outputSuffix}.mp4`);
      execFileSync('ffmpeg', ['-y','-loglevel','error','-f','concat','-safe','0','-i',concat,
        '-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000',
        '-c:v','copy','-c:a','aac','-b:a','64k','-movflags','+faststart',
        '-t',String(video.slides.reduce((n,s)=>n+s.seconds,0)),'-shortest',output], { stdio:'inherit' });
      console.log(`${path.basename(output)} ${video.slides.reduce((n,s)=>n+s.seconds,0)}s with fixed screens`);
    }
  } finally {
    await browser.close();
    const resolved = fs.realpathSync(work);
    const tempRoot = fs.realpathSync(os.tmpdir());
    if (!resolved.startsWith(tempRoot + path.sep)) throw new Error('Temporary render path left the system temp directory');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
run().catch((e)=>{console.error(e);process.exitCode=1});
