const puppeteer = require("puppeteer-core");
const path = require("path");

const OUT_DIR = "C:/新しいフォルダー/OneDrive/AI作成/SNS集客/素材_v1/day9_capture";
const fs = require("fs");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: "new",
    defaultViewport: { width: 480, height: 854, deviceScaleFactor: 2 },
  });
  const page = await browser.newPage();
  await page.goto("https://kiridori.gbapp.workers.dev/", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 800));

  // 1. 操作前
  await page.screenshot({ path: path.join(OUT_DIR, "01_before.png") });

  // 2. PDFボタンを探してクリック
  const pdfBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll("button")).find((b) => b.textContent.includes("PDFを作成"));
  });
  await pdfBtn.asElement().click();
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, "02_pdf_done.png") });

  // 3. Excelボタンをクリック
  const xlsxBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll("button")).find((b) => b.textContent.includes("Excelを作成"));
  });
  await xlsxBtn.asElement().click();
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, "03_excel_done.png") });

  await browser.close();
  console.log("done");
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
