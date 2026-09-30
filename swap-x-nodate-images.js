// Xの画像のうち、画像内に日付（2026.09.xx）が入っている9月作成分を、日付なしの版（-nodate）へ差し替える。
// 対象：media_urls に issue5-202609(24|27|28|29|30)-instagram-0N.png を含むXの下書き。変更する列は media_urls のみ。
const { getPool } = require("./db-client");
(async () => {
  const apply = process.argv.includes("--apply");
  const pool = getPool();
  try {
    const { rows } = await pool.query("SELECT id, media_urls FROM sns.posts WHERE target_sns = 'x' AND status = 'draft' AND cardinality(media_urls) > 0");
    let n = 0;
    for (const r of rows) {
      const next = r.media_urls.map((u) => u.replace(/(issue5-2026(?:0924|0927|0928|0929|0930)-instagram-0\d)(-v2)?\.png$/, "$1-nodate.png").replace(/(issue5-20260928-instagram-03)-v2-nodate/, "$1-nodate"));
      if (JSON.stringify(next) === JSON.stringify(r.media_urls)) continue;
      n++;
      console.log(r.id.slice(0, 8), next.map((u) => u.split("/").pop()).join(", "));
      if (apply) await pool.query("UPDATE sns.posts SET media_urls = $2 WHERE id = $1 AND status = 'draft'", [r.id, next]);
    }
    console.log(`差し替え ${n}件${apply ? "（反映）" : "（dry-run）"}`);
  } finally { await pool.end(); }
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
