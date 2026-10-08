// ハリナビの実画面を、ローカルの最新版HTML（V26.09.NNN の最大）から2倍の解像度で撮る。公開URLや古い版（v57など）は使わない。
// 条件：吊り荷2t・スパン3,000mm・H-150×150×7×10（動作確認用の例）。数字は撮った画面の文字から読み、想定と違えば止まる。
// 出力：public/screens-h/*.png と results-*.txt、version.txt
// 使い方：node tools/capture-harinavi.cjs
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const puppeteer = require("C:/新しいフォルダー/OneDrive/AI作成/SNS集客/エンジン/node_modules/puppeteer-core");
const DIR = "C:/新しいフォルダー/OneDrive/AI作成/梁強度計算アプリ/02_作業中/HarinaviApp/assets/harinavi";
const latest = fs
  .readdirSync(DIR)
  .map((f) => f.match(/^harinavi_V26\.09\.(\d+)\.html$/))
  .filter(Boolean)
  .sort((a, b) => Number(b[1]) - Number(a[1]))[0];
const HARINAVI = path.join(DIR, latest[0]);
const OUT = path.join(__dirname, "..", "public", "screens-h");
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
    await page.goto(pathToFileURL(HARINAVI).href, { waitUntil: "domcontentloaded" });
    await wait(900);
    const crop = async (selector, name, closest) => {
      let el;
      if (closest) {
        const h = await page.evaluateHandle((s, a) => document.querySelector(s).closest(a), selector, closest);
        el = h.asElement();
        if (!el) throw new Error(`見つからない: ${selector} の ${closest}`);
        await page.evaluate((e) => e.scrollIntoView({ block: "center" }), el);
      } else {
        el = await page.$(selector);
        if (!el) throw new Error(`見つからない: ${selector}`);
        await page.$eval(selector, (e) => e.scrollIntoView({ block: "center" }));
      }
      await wait(150);
      await el.screenshot({ path: path.join(OUT, name) });
    };
    const setVal = (sel, v) =>
      page.evaluate(
        (s, val) => {
          const e = document.querySelector(s);
          e.value = val;
          e.dispatchEvent(new Event("input", { bubbles: true }));
          e.dispatchEvent(new Event("change", { bubbles: true }));
        },
        sel,
        v,
      );
    await setVal("#spanL", "3000");
    await setVal("#loadP", "2");
    await wait(300);
    const info = await page.evaluate(() => ({
      steel: document.querySelector("#steelSize")?.value,
      block: document.querySelector("#steelBlock")?.value,
      support: [...document.querySelectorAll("#supportSeg button")].map((b) => `${b.dataset.v}:${b.textContent.trim()}:${b.className}`),
      hook: document.querySelector("#hookMass")?.value,
      std: document.querySelector("#deflectionStandard")?.value,
    }));
    console.log("入力の状態:", JSON.stringify(info));
    await crop("#spanL", "input-span.png", ".field");
    await crop("#loadP", "input-load.png", ".field");
    await crop("#supportSeg", "input-support-simple.png", ".field");
    await crop("#steelSize", "input-steel.png", ".field");
    const run = async (tag) => {
      await page.click("#calcBtn");
      await wait(1000);
      const text = await page.$eval("#results", (el) => el.innerText);
      fs.writeFileSync(path.join(OUT, `results-${tag}.txt`), text, "utf8");
      return text;
    };
    const simple = await run("simple");
    console.log("単純支持 結果:\n" + simple.split("\n").slice(0, 60).join(" | "));
    await crop("#judgement", "judgement-simple.png");
    await crop("#check1", "check1-simple.png");
    await crop("#check2", "check2-simple.png");
    await crop("#check4", "check4-simple.png");
    const un = await page.$("#unevaluatedNote");
    if (un) await crop("#unevaluatedNote", "unevaluated.png");
    await page.click('#supportSeg button[data-v="fixed"]');
    await wait(300);
    const cb = await page.$("#fixedSupportConfirmed");
    if (cb && (await cb.evaluate((e) => e.offsetParent !== null && !e.checked))) {
      await cb.click();
      await wait(200);
    }
    await crop("#supportSeg", "input-support-fixed.png", ".field");
    const fixed = await run("fixed");
    console.log("両端固定 結果:\n" + fixed.split("\n").slice(0, 60).join(" | "));
    await crop("#judgement", "judgement-fixed.png");
    await crop("#check1", "check1-fixed.png");
    await crop("#check2", "check2-fixed.png");
    fs.writeFileSync(path.join(OUT, "version.txt"), latest[0], "utf8");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
