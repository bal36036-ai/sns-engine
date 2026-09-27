// Capture current local application UI for the Oct 10/10-later batch (48 posts, stage27 captions).
// Reads local HTML directly (never the deployed URL, never an old handoff ZIP).
// Never invent result values; every screenshot is from a real calculation with disclosed example input.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('../../../node_modules/puppeteer-core');

const OUT = path.join(__dirname, 'source');
fs.mkdirSync(OUT, { recursive: true });
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
// Edge on this PC exits immediately while an update is pending; Chrome renders identically for our purposes.
const KIRIDORI = 'C:/新しいフォルダー/OneDrive/AI作成/1D材料取りアプリ/02_作業中/KiridoriApp/assets/kiridori/kiridori_v65.html';
const HARINAVI = 'C:/新しいフォルダー/OneDrive/AI作成/梁強度計算アプリ/02_作業中/HarinaviApp/assets/harinavi/harinavi_v57.html';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function crop(page, selector, name, { scroll = true } = {}) {
  const el = await page.$(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  if (scroll) { await page.$eval(selector, (e) => e.scrollIntoView({ block: 'center' })); await wait(150); }
  await el.screenshot({ path: path.join(OUT, name) });
}

// selectorの closest(ancestorSelector) をクロップする（ラベル込みで見せたい入力欄など向け）
async function cropClosest(page, selector, ancestorSelector, name) {
  const handle = await page.evaluateHandle((sel, anc) => document.querySelector(sel).closest(anc), selector, ancestorSelector);
  const el = handle.asElement();
  if (!el) throw new Error(`Missing ancestor "${ancestorSelector}" for ${selector}`);
  await page.evaluate((h) => h.scrollIntoView({ block: 'center' }), handle);
  await wait(150);
  await el.screenshot({ path: path.join(OUT, name) });
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--allow-file-access-from-files'], defaultViewport: { width: 540, height: 960, deviceScaleFactor: 1 } });
  try {
    // ---------- Kiridori：定尺6,000mm・刃幅5mm・柱用部材-A 2,500mm×2／梁用部材-B 1,800mm×2／補強材-C 1,200mm×2（既存の動作確認例と同一条件） ----------
    const kiri = await browser.newPage();
    await kiri.goto(pathToFileURL(KIRIDORI).href, { waitUntil: 'domcontentloaded' });
    await wait(700);
    await kiri.evaluate(() => { document.querySelector('#stockLen').value = '6000'; document.querySelector('#kerf').value = '5'; });
    for (const id of ['stockLen', 'kerf']) await kiri.$eval(`#${id}`, (e) => e.dispatchEvent(new Event('input', { bubbles: true })));
    await wait(200);
    await crop(kiri, '#basicCard', 'kiridori-conditions-card.png');
    await crop(kiri, '#sortCard', 'kiridori-sort-card.png');
    await crop(kiri, '#importCard', 'kiridori-import-card.png');
    await crop(kiri, '#partsCard', 'kiridori-parts-card.png');
    await kiri.click('#kiridoriCalcBtn');
    await wait(700);
    const kiriText = await kiri.$eval('#resultsArea', (el) => el.innerText);
    if (!kiriText.includes('端材') || !kiriText.includes('歩留まり')) throw new Error('Kiridori result missing expected fields');
    await crop(kiri, '#resultsArea > .stat-grid', 'kiridori-summary-card.png');
    await crop(kiri, '#resultsArea .stock.card:nth-of-type(1)', 'kiridori-stock1-card.png');
    const stockCount = await kiri.$$eval('#resultsArea .stock.card', (els) => els.length);
    if (stockCount > 1) await crop(kiri, '#resultsArea .stock.card:nth-of-type(2)', 'kiridori-stock2-card.png');
    fs.writeFileSync(path.join(OUT, 'kiridori-results.txt'), kiriText, 'utf8');
    // 保存（版管理の題材用）：プラン名を入れた状態の保存フォームだけを見せる
    await kiri.click('#navSave');
    await wait(300);
    const planTitle = await kiri.$('#planTitle');
    if (planTitle) {
      await kiri.evaluate(() => { const t = document.querySelector('#planTitle'); if (t) t.value = '切り出しプラン_20261002'; t?.dispatchEvent(new Event('input', { bubbles: true })); });
      await wait(150);
      await cropClosest(kiri, '#planTitle', '.save-form', 'kiridori-save-card.png');
    }
    await kiri.close();

    // ---------- Harinavi：スパン長3,000mm・吊り荷2t・単純支持・SS400・H-150x150x7x10（既存の動作確認例と同一条件） ----------
    const hari = await browser.newPage();
    await hari.goto(pathToFileURL(HARINAVI).href, { waitUntil: 'domcontentloaded' });
    await wait(700);
    await crop(hari, 'header', 'harinavi-header-card.png');
    await hari.evaluate(() => { document.querySelector('#spanL').value = '3000'; document.querySelector('#loadP').value = '2'; });
    for (const id of ['spanL', 'loadP']) await hari.$eval(`#${id}`, (e) => e.dispatchEvent(new Event('input', { bubbles: true })));
    await wait(200);
    await cropClosest(hari, '#spanL', '.field', 'harinavi-span-card.png');
    await cropClosest(hari, '#loadP', '.field', 'harinavi-load-card.png');
    await cropClosest(hari, '#supportSeg', '.field', 'harinavi-support-card.png');
    await hari.click('#calcBtn');
    await wait(900);
    const hariText = await hari.$eval('#results', (el) => el.innerText);
    if (!hariText.includes('69.691')) throw new Error('Harinavi result does not match the verified example (69.691 N/mm²)');
    fs.writeFileSync(path.join(OUT, 'harinavi-results.txt'), hariText, 'utf8');
    await crop(hari, '#judgement', 'harinavi-judgement-card.png');
    await crop(hari, '#check1', 'harinavi-check1-bending-card.png');
    await crop(hari, '#check2', 'harinavi-check2-deflection-card.png');
    await crop(hari, '#check4', 'harinavi-check4-shear-card.png');
    await crop(hari, '#maxLoadBox', 'harinavi-maxload-card.png');
    await hari.close();

    console.log('capture-source-v2: done.', fs.readdirSync(OUT).filter((f) => f.endsWith('.png')).length, 'PNG files');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
