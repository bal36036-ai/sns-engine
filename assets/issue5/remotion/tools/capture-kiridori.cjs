// キリドリの実画面を、ローカルの最新版HTMLから撮る（公開URLや古いZIPは使わない）。動画用に2倍の解像度で撮る。
// 条件（これまでの動作確認例と同じ）：定尺6,000mm・刃幅5mm・柱用部材-A 2,500mm×2／梁用部材-B 1,800mm×2／補強材-C 1,200mm×2
// 結果の数字は撮った画面の文字から確かめ、想定（入力順：3本・61.1%／自動：2本・91.7%）と違えば止まる。
// 出力：public/screens/*.png と public/screens/results-*.txt
// 使い方：node tools/capture-kiridori.cjs
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const puppeteer = require("C:/新しいフォルダー/OneDrive/AI作成/SNS集客/エンジン/node_modules/puppeteer-core");

const KIRI_DIR = "C:/新しいフォルダー/OneDrive/AI作成/1D材料取りアプリ/02_作業中/KiridoriApp/assets/kiridori";
const latest = fs
  .readdirSync(KIRI_DIR)
  .map((f) => f.match(/^kiridori_v(\d+)\.html$/))
  .filter(Boolean)
  .sort((a, b) => Number(b[1]) - Number(a[1]))[0];
const KIRIDORI = path.join(KIRI_DIR, latest[0]);
const OUT = path.join(__dirname, "..", "public", "screens");
fs.mkdirSync(OUT, { recursive: true });
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log("使う版:", latest[0]);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--allow-file-access-from-files"],
    defaultViewport: { width: 540, height: 960, deviceScaleFactor: 2 },
  });
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(KIRIDORI).href, { waitUntil: "domcontentloaded" });
    await wait(800);
    const crop = async (selector, name) => {
      const el = await page.$(selector);
      if (!el) throw new Error(`画面の部品が見つからない: ${selector}`);
      await page.$eval(selector, (e) => e.scrollIntoView({ block: "center" }));
      await wait(150);
      await el.screenshot({ path: path.join(OUT, name) });
    };
    await page.evaluate(() => {
      for (const [id, v] of [["#stockLen", "6000"], ["#kerf", "5"]]) {
        const e = document.querySelector(id);
        e.value = v;
        e.dispatchEvent(new Event("input", { bubbles: true }));
        e.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    await wait(200);
    const parts = await page.$$eval("#partsCard input", (els) => els.map((e) => e.value));
    console.log("部材リストの入力値:", parts.join(" / "));
    for (const want of ["2500", "1800", "1200"]) if (!parts.includes(want)) throw new Error(`部材リストが想定と違う（${want}がない）`);
    await crop("#basicCard", "conditions.png");
    await crop("#partsCard", "parts.png");

    const recalc = async () => {
      await page.evaluate(() => document.querySelector("#kiridoriCalcBtn").click());
      await wait(800);
      return page.$eval("#resultsArea", (el) => el.innerText);
    };
    const pick = async (index) => {
      const btns = await page.$$("#sortSeg button");
      await btns[index].evaluate((e) => e.click());
      await wait(200);
    };
    const shoot = async (tag, expectStocks, expectYield) => {
      const text = await recalc();
      if (!text.includes(`${expectYield}%`)) throw new Error(`${tag}: 歩留まりが想定（${expectYield}%）と違う`);
      const n = await page.$$eval("#resultsArea .stock.card", (els) => els.length);
      if (n !== expectStocks) throw new Error(`${tag}: 定尺の本数が想定（${expectStocks}本）と違う（${n}本）`);
      fs.writeFileSync(path.join(OUT, `results-${tag}.txt`), text, "utf8");
      await crop("#sortCard", `sort-${tag}.png`);
      await crop("#resultsArea > .stat-grid", `summary-${tag}.png`);
      for (let i = 1; i <= n; i++) await crop(`#resultsArea .stock.card:nth-of-type(${i})`, `stock${i}-${tag}.png`);
      console.log(`${tag}: 定尺${n}本・歩留まり${expectYield}% を確認`);
    };
    await pick(0); // 入力順
    await shoot("inputorder", 3, "61.1");
    await pick(3); // 自動（おすすめ）
    await shoot("auto", 2, "91.7");
    fs.writeFileSync(path.join(OUT, "version.txt"), latest[0], "utf8");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
