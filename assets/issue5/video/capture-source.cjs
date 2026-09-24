// Capture current local application UI only. Never invent result values.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('../../../node_modules/puppeteer-core');

const root = path.resolve(__dirname, '../../../../..');
const out = path.join(__dirname, 'source');
fs.mkdirSync(out, { recursive: true });
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, selector, name) {
  await page.$eval(selector, (el) => el.scrollIntoView({ block: 'start' }));
  await wait(200);
  await page.screenshot({ path: path.join(out, name) });
}
async function elementShot(page, selector, name) {
  const el = await page.$(selector);
  if (!el) throw new Error(`Missing screen section: ${selector}`);
  await el.screenshot({ path: path.join(out, name) });
}
async function parentShot(page, selector, name) {
  const el = await page.$(selector);
  const parent = await el.evaluateHandle((node) => node.parentElement);
  await parent.asElement().screenshot({ path: path.join(out, name) });
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: edge, headless: 'new', args: ['--allow-file-access-from-files'], defaultViewport: { width: 540, height: 960, deviceScaleFactor: 1 } });
  try {
    const kiri = await browser.newPage();
    const kiriPath = path.join(root, '1D材料取りアプリ/02_作業中/KiridoriApp/assets/kiridori/kiridori_v60.html');
    await kiri.goto(pathToFileURL(kiriPath).href, { waitUntil: 'domcontentloaded' });
    await wait(1000);
    await shot(kiri, '#basicCard', 'kiridori-conditions.png');
    await shot(kiri, '#partsCard', 'kiridori-parts.png');
    await elementShot(kiri, '#basicCard', 'kiridori-conditions-card.png');
    await elementShot(kiri, '#partsCard', 'kiridori-parts-card.png');
    await kiri.click('#kiridoriCalcBtn');
    await wait(700);
    const kiriText = await kiri.$eval('#resultsArea', (el) => el.innerText);
    if (!kiriText.includes('端材')) throw new Error('Kiridori result missing end material value');
    await shot(kiri, '#resultsArea', 'kiridori-results.png');
    console.log('Kiridori sections:', await kiri.$eval('#resultsArea', (el) => [...el.children].map((c) => ({ tag: c.tagName, cls: c.className, text: c.innerText.slice(0, 50) }))));
    await elementShot(kiri, '#resultsArea', 'kiridori-results-card.png');
    await elementShot(kiri, '#resultsArea > .stat-grid', 'kiridori-summary-card.png');
    await elementShot(kiri, '#resultsArea > .stock.card', 'kiridori-stock1-card.png');
    fs.writeFileSync(path.join(out, 'kiridori-results.txt'), kiriText, 'utf8');
    await kiri.close();

    const hari = await browser.newPage();
    const hariPath = path.join(root, '梁強度計算アプリ/harinavi_V26.09.062.html');
    await hari.goto(pathToFileURL(hariPath).href, { waitUntil: 'domcontentloaded' });
    await wait(800);
    await shot(hari, '#spanL', 'harinavi-span.png');
    await shot(hari, '#loadP', 'harinavi-load.png');
    await elementShot(hari, '#spanL', 'harinavi-span-field.png');
    await elementShot(hari, '#loadP', 'harinavi-load-field.png');
    await elementShot(hari, '#spanL', 'harinavi-span-input.png');
    await elementShot(hari, '#loadP', 'harinavi-load-input.png');
    await parentShot(hari, '#spanL', 'harinavi-span-card.png');
    await parentShot(hari, '#loadP', 'harinavi-load-card.png');
    await hari.click('#calcBtn');
    await wait(1000);
    const visible = await hari.$eval('#results', (el) => getComputedStyle(el).display !== 'none');
    if (!visible) throw new Error('Harinavi results did not open');
    await shot(hari, '#results', 'harinavi-results.png');
    await shot(hari, '#check1', 'harinavi-check.png');
    await elementShot(hari, '#judgement', 'harinavi-judgement-card.png');
    await elementShot(hari, '#check1', 'harinavi-check-card.png');
    fs.writeFileSync(path.join(out, 'harinavi-results.txt'), await hari.$eval('#results', (el) => el.innerText), 'utf8');
    await hari.close();
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
