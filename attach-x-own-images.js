// Xの画像なし投稿（9件）に、専用に作った画像（assets/issue5/media2/x、2〜4枚）を添える。ばる依頼 2026-10-02「画像なしの10件にも画像を足して」。
// 対象：status が draft または ready で、まだ投稿されておらず（external_post_id なし）、media_urls が空のX投稿のうち、下の一覧にあるもの。
// 変更する列：media_urls のみ。画像URLは実際にHEADで到達確認する。使い方：node attach-x-own-images.js [--apply]
const https = require("https");
const { getPool } = require("./db-client");
const BASE = "https://sns-material-storage.gbapp.workers.dev";
const SETS = { c6daee57: 3, f4685720: 4, f426312b: 3, "57eaf69b": 3, "2f13502f": 3, b7b05851: 2, ec09da89: 2, b401dc35: 2, "408d6244": 2 };
const head = (url) => new Promise((resolve) => {
  const req = https.request(url, { method: "HEAD", timeout: 10000 }, (res) => resolve(res.statusCode === 200 && /^image\//.test(res.headers["content-type"] || "")));
  req.on("error", () => resolve(false)); req.on("timeout", () => { req.destroy(); resolve(false); }); req.end();
});
(async () => {
  const apply = process.argv.includes("--apply");
  const pool = getPool();
  try {
    let n = 0;
    for (const [id8, count] of Object.entries(SETS)) {
      const urls = Array.from({ length: count }, (_, i) => `${BASE}/issue5-x-${id8}-0${i + 1}.png`);
      const { rows } = await pool.query("SELECT id, status, media_urls FROM sns.posts WHERE id::text LIKE $1 AND target_sns = 'x'", [`${id8}%`]);
      if (rows.length !== 1) throw new Error(`${id8}: 該当 ${rows.length}件`);
      const r = rows[0];
      if (!["draft", "ready"].includes(r.status) || r.media_urls?.length) { console.log(`${id8}: 対象外（${r.status}・画像${r.media_urls?.length || 0}枚）`); continue; }
      const ok = await Promise.all(urls.map(head));
      if (ok.some((v) => !v)) throw new Error(`${id8}: 画像URLに到達できない`);
      console.log(`${id8}: ${count}枚`);
      if (apply) await pool.query("UPDATE sns.posts SET media_urls = $2 WHERE id = $1 AND status IN ('draft','ready') AND external_post_id IS NULL", [r.id, urls]);
      n++;
    }
    console.log(`画像を添える ${n}件${apply ? "（反映）" : "（dry-run）"}`);
  } finally { await pool.end(); }
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
