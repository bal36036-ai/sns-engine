// stage27バッチ2：素材待ち48件のうち動画2本（10/2 YouTube kiridori・10/3 TikTok harinavi）の静止画面フレームを作る。
// 実アプリ画面は media2/source（capture-source-v2.cjs で取得、v65/v57＝2026-09-27時点の最新版）を使う。
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const puppeteer = require('../../../node_modules/puppeteer-core');

const dir = __dirname;
const allowedVideoIds = new Set(JSON.parse(fs.readFileSync(path.join(dir, 'narration-batch2.json'), 'utf8')).videos.map(v => v.id));
if (allowedVideoIds.size !== 2) throw new Error('Expected exactly two batch2 videos');
const src = path.join(dir, 'source');
const frames = path.join(dir, 'frames');
fs.mkdirSync(frames, { recursive: true });
const chrome = process.env.RENDER_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const image = (name) => `data:image/png;base64,${fs.readFileSync(path.join(src, name)).toString('base64')}`;
const assets = {
  kCondition: image('kiridori-conditions-card.png'),
  kParts: image('kiridori-parts-card.png'),
  kStock: image('kiridori-stock1-card.png'),
  kSummary: image('kiridori-summary-card.png'),
  hLoad: image('harinavi-load-card.png'),
  hSpan: image('harinavi-span-card.png'),
  hSupport: image('harinavi-support-card.png'),
  hJudge: image('harinavi-judgement-card.png'),
};

const S = (seconds, title, caption, visual, extra = {}) => ({ seconds, title, caption, visual, ...extra });
const videos = [
  { id: '20261002-youtube-kiridori', app: 'キリドリ', slides: [
    S(2, 'この案、どこが違う？', '動作確認用の架空条件', 'kCondition'),
    S(6, '定尺と刃幅を入力', '6,000mm・5mm', 'kCondition'),
    S(7, '必要な部材を入力', '柱用部材・梁用部材など', 'kParts'),
    S(8, '切り出し案と残りを見る', '材料ごとの並びと残る長さ', 'kStock'),
    S(5, '入力から案、残りまで見比べる', 'キリドリの実画面です', 'kSummary', { summary: true }),
  ] },
  { id: '20261003-tiktok-harinavi', app: 'ハリナビ', slides: [
    S(2, '条件、どれから見る？', '実際の入力画面から', 'hLoad'),
    S(6, 'まず、吊り荷の質量', '入力した吊り荷を確認', 'hLoad'),
    S(6, '次に、スパン長', '梁のスパン長を確認', 'hSpan'),
    S(7, 'そして、支持条件', '単純支持・両端固定など', 'hSupport'),
    S(5, '結果は前提とセットで読む', '最終判断は専門家へ', 'hJudge', { summary: true }),
  ] },
];

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const focusLabel = {
  kCondition: '定尺と刃幅', kParts: '部材の長さと本数', kStock: '切り出し案と残り', kSummary: '結果の一覧',
  hLoad: '入力した吊り荷', hSpan: '入力したスパン長', hSupport: '支持条件の選択', hJudge: '一次照査の判定',
};

function html(video, slide, index) {
  const hari = video.app === 'ハリナビ';
  const accent = hari ? '#18748c' : '#ca5830';
  const srcImg = assets[slide.visual];
  const focus = focusLabel[slide.visual];
  const hookFont = slide.title.length > 18 ? 55 : 65;
  const visual = `<div class="screen"><img src="${srcImg}" alt="${escape(video.app)}の実画面"></div>`;
  return `<!doctype html><html lang="ja"><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;width:720px;height:1280px;overflow:hidden}
    body{font-family:'Yu Gothic','Meiryo',sans-serif;background:${hari ? '#eef4f7' : '#fff5ec'};color:#172c35}
    .top{height:96px;background:${hari ? '#1d526c' : '#b85031'};color:white;display:flex;align-items:center;justify-content:space-between;padding:0 42px;font-weight:800;font-size:27px;letter-spacing:.04em}
    .main{height:1184px;padding:46px 46px 90px;display:flex;flex-direction:column}
    .eyebrow{font-size:26px;font-weight:800;color:${hari ? '#25667f' : '#bb5b3a'};margin-bottom:22px}
    h1{font-size:${slide.title.length > 24 ? '44' : '52'}px;line-height:1.33;letter-spacing:.01em;margin:0 0 24px;font-weight:900;min-height:148px}
    .caption{font-size:30px;line-height:1.45;color:#435862;font-weight:700;min-height:92px}
    .visual{flex:1;display:flex;align-items:center;justify-content:center;min-height:0;padding:88px 0 10px;position:relative}
    .focusCallout{position:absolute;top:8px;left:14px;display:flex;align-items:center;gap:12px;color:${accent};font-size:29px;font-weight:900;background:#fffdfae8;padding:8px 22px;border-radius:14px;border:2px solid ${accent}}
    .focusArrow{font-size:46px;line-height:1}
    .screen{width:100%;max-height:625px;background:white;padding:16px;border-radius:22px;box-shadow:0 14px 40px #1a334021;display:flex;align-items:center;justify-content:center;border:5px solid ${accent}}
    .screen img{display:block;width:100%;max-height:582px;object-fit:contain}
    .summary h1{color:${hari ? '#1c5d77' : '#af4b2d'}}
    .hook h1{font-size:${hookFont}px;line-height:1.27;background:#fffdfb;border-left:10px solid ${accent};padding:18px 18px 20px;box-shadow:0 8px 24px #23394312;border-radius:0 18px 18px 0}
  </style><body class="${slide.summary ? 'summary' : ''} ${index === 0 ? 'hook' : ''}"><div class="top"><span>${escape(video.app)}</span></div><div class="main"><div class="eyebrow">${String(index + 1).padStart(2, '0')} / ${String(video.slides.length).padStart(2, '0')}</div><h1>${escape(slide.title)}</h1><div class="caption">${escape(slide.caption)}</div><div class="visual">${slide.summary ? '' : `<div class="focusCallout"><span class="focusArrow">↓</span><span>注目：${escape(focus)}</span></div>`}${visual}</div></div></body></html>`;
}

async function run() {
  const selected = process.argv.find((arg) => arg.startsWith('--id='))?.slice(5);
  const outputDir = process.argv.find((arg) => arg.startsWith('--output-dir='))?.slice(13) || dir;
  const outputSuffix = process.argv.find((arg) => arg.startsWith('--output-suffix='))?.slice(16) || '-narrated-base';
  if (selected && !allowedVideoIds.has(selected)) throw new Error('Video is outside the two batch2 targets');
  const framesOnly = process.argv.includes('--frames-only');
  fs.mkdirSync(outputDir, { recursive: true });
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'sns-batch2-motion-'));
  const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', defaultViewport: { width: 720, height: 1280, deviceScaleFactor: 1 } });
  try {
    const page = await browser.newPage();
    for (const video of videos) {
      if (selected && selected !== video.id) continue;
      const segments = [];
      for (let i = 0; i < video.slides.length; i++) {
        const slide = video.slides[i];
        await page.setContent(html(video, slide, i), { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        const file = path.join(frames, `${video.id}-${i + 1}.png`);
        await page.screenshot({ path: file });
        if (framesOnly) continue;
        const frameCount = slide.seconds * 24;
        const filter = i === 0 ? 'format=yuv420p' : 'fade=t=in:st=0:d=0.16:color=white,format=yuv420p';
        const segment = path.join(work, `${video.id}-${i + 1}.mp4`);
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-framerate', '24', '-i', file,
          '-vf', filter, '-frames:v', String(frameCount), '-an', '-c:v', 'libx264', '-preset', 'veryfast',
          '-crf', '24', '-pix_fmt', 'yuv420p', segment], { stdio: 'inherit' });
        segments.push(segment);
      }
      if (framesOnly) { console.log(`${video.id} 5 frames`); continue; }
      const concat = path.join(work, `${video.id}.txt`);
      fs.writeFileSync(concat, segments.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join('\n') + '\n', 'utf8');
      const output = path.join(outputDir, `${video.id}${outputSuffix}.mp4`);
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', concat,
        '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart',
        '-t', String(video.slides.reduce((n, s) => n + s.seconds, 0)), '-shortest', output], { stdio: 'inherit' });
      console.log(`${path.basename(output)} ${video.slides.reduce((n, s) => n + s.seconds, 0)}s with fixed screens`);
    }
  } finally {
    await browser.close();
    const resolved = fs.realpathSync(work);
    const tempRoot = fs.realpathSync(os.tmpdir());
    if (!resolved.startsWith(tempRoot + path.sep)) throw new Error('Temporary render path left the system temp directory');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
run().catch((e) => { console.error(e); process.exitCode = 1; });
