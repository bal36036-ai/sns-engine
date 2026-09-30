// Xの下書きに、同じ topic_id のInstagram画像（5枚）から4枚を添える（Xは1投稿4枚まで）。
// ばる提案（2026-10-01「画像はあった方がいいんじゃないかな？」）。Instagramは一時停止中だが、作成済みの画像は再利用できる。
// 選ぶ枚数：キリドリ＝1〜4枚目（問い→画面→結果）、ハリナビ＝1〜3枚目＋5枚目（最後の「最終判断は専門家が行います」の注意を残す）。
// 対象：status=draft・readiness_state=needs_review・未投稿で media_urls が空のX下書き。画像URLは実際にHEADで到達確認する。
// 変更する列：media_urls のみ。
// 使い方：node attach-x-images.js        … dry-run
//         node attach-x-images.js --apply … 反映

const https = require("https");
const { getPool } = require("./db-client");

function head(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: "HEAD", timeout: 10000 }, (res) => resolve(res.statusCode === 200 && /^image\//.test(res.headers["content-type"] || "")));
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
    req.end();
  });
}

async function main() {
  const apply = process.argv.includes("--apply");
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: xs } = await client.query(
      `SELECT id, topic_id, target_app FROM sns.posts
        WHERE target_sns = 'x' AND status = 'draft' AND readiness_state = 'needs_review' AND external_post_id IS NULL
          AND is_historical = false AND (media_urls IS NULL OR cardinality(media_urls) = 0) ORDER BY scheduled_at FOR UPDATE`
    );
    let attached = 0, skipped = [];
    for (const x of xs) {
      const { rows: igs } = await client.query(
        "SELECT id, media_urls FROM sns.posts WHERE target_sns = 'instagram' AND topic_id = $1 AND is_historical = false AND cardinality(media_urls) >= 5 ORDER BY scheduled_at LIMIT 1",
        [x.topic_id]
      );
      if (!igs.length) { skipped.push(`${x.id.slice(0, 8)} ${x.topic_id}（同じ話題のInstagram画像なし）`); continue; }
      const m = igs[0].media_urls;
      const picks = x.target_app === "harinavi" ? [m[0], m[1], m[2], m[4]] : [m[0], m[1], m[2], m[3]];
      const ok = await Promise.all(picks.map(head));
      if (ok.some((v) => !v)) { skipped.push(`${x.id.slice(0, 8)} ${x.topic_id}（画像URLに到達できない）`); continue; }
      console.log(`${x.id.slice(0, 8)} ${x.topic_id} ${x.target_app}: ${picks.map((u) => u.split("/").pop()).join(", ")}`);
      if (apply) {
        const res = await client.query("UPDATE sns.posts SET media_urls = $2 WHERE id = $1 AND target_sns = 'x' AND status = 'draft'", [x.id, picks]);
        if (res.rowCount !== 1) throw new Error(`${x.id}: 更新件数 ${res.rowCount}`);
      }
      attached++;
    }
    console.log(`\nXの下書き ${xs.length}件：画像を添える ${attached}件／添えない ${skipped.length}件`);
    skipped.forEach((s) => console.log("  -", s));
    await client.query(apply ? "COMMIT" : "ROLLBACK");
    console.log(apply ? "COMMIT" : "dry-run：変更なし（--apply で更新）");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => { console.error("ERROR:", error.message); process.exit(1); });
