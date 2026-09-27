// stage27の本文に合わせた縦型動画（TikTok / YouTube Shorts）の画面部分を、構成データ spec-media.json から作る。
// 実画面は media2/source（現行版 kiridori_v65 / harinavi_v57）だけを使う。画面上部はアプリ名のみ（日付・媒体名なし）。
// 各場面：[秒数, 見出し, 補足, 表示, 注目ラベル(省略可)]。最後の場面は「まとめ」扱い（注目ラベルなし）。
// 表示： src:<file> ／ pair:<fileA>|<labelA>|<fileB>|<labelB> ／ memo:<見出し>|<行1>|... ／ labels:<A>|<B>|<C>
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const puppeteer = require('../../../node_modules/puppeteer-core');

const dir = __dirname;
const spec = JSON.parse(fs.readFileSync(path.join(dir, 'spec-media.json'), 'utf8'));
const src = path.join(dir, 'source');
const frames = path.join(dir, 'frames');
fs.mkdirSync(frames, { recursive: true });
const browserPath = process.env.RENDER_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const cache = new Map();
const image = (name) => {
  if (!cache.has(name)) {
    const file = path.join(src, name);
    if (!fs.existsSync(file)) throw new Error(`Missing source screen: ${name}`);
    cache.set(name, `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`);
  }
  return cache.get(name);
};
const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function visualHtml(visual, app) {
  const [kind, arg = ''] = [visual.slice(0, visual.indexOf(':')), visual.slice(visual.indexOf(':') + 1)];
  const parts = arg.split('|');
  if (kind === 'src') return `<div class="screen"><img src="${image(parts[0])}" alt="${escape(app)}の実画面"></div>`;
  if (kind === 'pair') {
    return `<div class="screen pair"><div class="plabel">${escape(parts[1])}</div><img src="${image(parts[0])}" alt="">`
      + `<div class="plabel">${escape(parts[3])}</div><img src="${image(parts[2])}" alt=""></div>`;
  }
  if (kind === 'memo') {
    return `<div class="memo"><div class="memoTitle">${escape(parts[0])}</div>${parts.slice(1).map((l) => `<div class="memoLine">${escape(l)}</div>`).join('')}<div class="memoNote">説明用の架空例</div></div>`;
  }
  if (kind === 'labels') {
    return `<div class="labels"><div class="lnote">説明図 / 画面表示ではありません</div><div class="lrow">${parts.map((l, i) => `<div class="lbox" style="font-size:${l.length >= 6 ? 24 : l.length >= 5 ? 28 : 34}px">${escape(l)}</div>${i < parts.length - 1 ? '<div class="larrow">→</div>' : ''}`).join('')}</div></div>`;
  }
  throw new Error(`unknown visual: ${visual}`);
}

function html(video, slide, index) {
  const [, title, caption, visual, focus] = slide;
  const summary = index === video.slides.length - 1;
  const hari = video.app === 'ハリナビ';
  const accent = hari ? '#18748c' : '#ca5830';
  const hookFont = title.length > 18 ? 55 : 65;
  const showFocus = !summary && focus && !visual.startsWith('memo') && !visual.startsWith('labels');
  return `<!doctype html><html lang="ja"><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;width:720px;height:1280px;overflow:hidden}
    body{font-family:'Yu Gothic','Meiryo',sans-serif;background:${hari ? '#eef4f7' : '#fff5ec'};color:#172c35}
    .top{height:96px;background:${hari ? '#1d526c' : '#b85031'};color:white;display:flex;align-items:center;padding:0 42px;font-weight:800;font-size:27px;letter-spacing:.04em}
    .main{height:1184px;padding:46px 46px 90px;display:flex;flex-direction:column}
    .eyebrow{font-size:26px;font-weight:800;color:${hari ? '#25667f' : '#bb5b3a'};margin-bottom:22px}
    h1{font-size:${title.length > 24 ? '44' : '52'}px;line-height:1.33;margin:0 0 24px;font-weight:900;min-height:148px}
    .caption{font-size:30px;line-height:1.45;color:#435862;font-weight:700;min-height:92px}
    .visual{flex:1;display:flex;align-items:center;justify-content:center;min-height:0;padding:88px 0 10px;position:relative}
    .focusCallout{position:absolute;top:8px;left:14px;display:flex;align-items:center;gap:12px;color:${accent};font-size:29px;font-weight:900;background:#fffdfae8;padding:8px 22px;border-radius:14px;border:2px solid ${accent}}
    .focusArrow{font-size:46px;line-height:1}
    .screen{width:100%;max-height:625px;background:white;padding:16px;border-radius:22px;box-shadow:0 14px 40px #1a334021;display:flex;flex-direction:column;align-items:center;justify-content:center;border:5px solid ${accent}}
    .screen img{display:block;width:100%;max-height:582px;object-fit:contain}
    .pair img{max-height:230px}.plabel{align-self:flex-start;font-size:26px;font-weight:900;color:${accent};margin:10px 6px 8px}
    .memo{width:100%;background:#fffdf6;padding:40px 42px;border-radius:8px;box-shadow:4px 8px 24px #2d2d2d20;transform:rotate(-1deg);border:5px solid ${accent};border-top:12px solid ${accent}}
    .memoTitle{font-size:38px;font-weight:900;margin-bottom:28px}.memoLine{font-size:32px;font-weight:750;line-height:1.8;border-bottom:2px solid #e2e3dc}.memoNote{font-size:24px;color:#667075;margin-top:28px;font-weight:700}
    .labels{width:100%;background:#fffdfb;border:3px solid #d8dcd6;border-radius:22px;padding:30px 24px 46px}.lnote{font-size:22px;color:#667075;margin-bottom:34px}
    .lrow{display:flex;align-items:center;justify-content:center;gap:10px}.lbox{flex:1;white-space:nowrap;background:${hari ? '#e3eef2' : '#fbe9dc'};border:3px solid ${accent};border-radius:16px;padding:34px 8px;text-align:center;font-size:34px;font-weight:900}
    .larrow{font-size:40px;color:${accent};font-weight:900}
    .summary h1{color:${hari ? '#1c5d77' : '#af4b2d'}}
    .hook h1{font-size:${hookFont}px;line-height:1.27;background:#fffdfb;border-left:10px solid ${accent};padding:18px 18px 20px;box-shadow:0 8px 24px #23394312;border-radius:0 18px 18px 0}
  </style><body class="${summary ? 'summary' : ''} ${index === 0 ? 'hook' : ''}"><div class="top"><span>${escape(video.app)}</span></div><div class="main"><div class="eyebrow">${String(index + 1).padStart(2, '0')} / ${String(video.slides.length).padStart(2, '0')}</div><h1>${escape(title)}</h1><div class="caption">${escape(caption)}</div><div class="visual">${showFocus ? `<div class="focusCallout"><span class="focusArrow">↓</span><span>注目：${escape(focus)}</span></div>` : ''}${visualHtml(visual, video.app)}</div></div></body></html>`;
}

async function run() {
  const selected = process.argv.filter((a) => a.startsWith('--id=')).map((a) => a.slice(5));
  const outputDir = process.argv.find((arg) => arg.startsWith('--output-dir='))?.slice(13) || path.join(dir, 'out');
  const framesOnly = process.argv.includes('--frames-only');
  fs.mkdirSync(outputDir, { recursive: true });
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'sns-media2-'));
  const browser = await puppeteer.launch({ executablePath: browserPath, headless: 'new', defaultViewport: { width: 720, height: 1280, deviceScaleFactor: 1 } });
  try {
    const page = await browser.newPage();
    for (const video of spec.videos) {
      if (selected.length && !selected.includes(video.id)) continue;
      const total = video.slides.reduce((n, s) => n + s[0], 0);
      const segments = [];
      for (let i = 0; i < video.slides.length; i++) {
        await page.setContent(html(video, video.slides[i], i), { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        const file = path.join(frames, `${video.id}-${i + 1}.png`);
        await page.screenshot({ path: file });
        if (framesOnly) continue;
        const segment = path.join(work, `${video.id}-${i + 1}.mp4`);
        const filter = i === 0 ? 'format=yuv420p' : 'fade=t=in:st=0:d=0.16:color=white,format=yuv420p';
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-framerate', '24', '-i', file, '-vf', filter,
          '-frames:v', String(video.slides[i][0] * 24), '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', segment]);
        segments.push(segment);
      }
      if (framesOnly) { console.log(`${video.id} frames`); continue; }
      const concat = path.join(work, `${video.id}.txt`);
      fs.writeFileSync(concat, segments.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n') + '\n', 'utf8');
      const output = path.join(outputDir, `${video.id}-base.mp4`);
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', concat,
        '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '64k',
        '-movflags', '+faststart', '-t', String(total), '-shortest', output]);
      console.log(`${path.basename(output)} ${total}s`);
    }
  } finally {
    await browser.close();
    const resolved = fs.realpathSync(work);
    if (!resolved.startsWith(fs.realpathSync(os.tmpdir()) + path.sep)) throw new Error('Temporary render path left the system temp directory');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
run().catch((e) => { console.error(e); process.exitCode = 1; });
