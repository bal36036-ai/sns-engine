// 2026-09-26 9/28キリドリIG（紙メモと計画画面）の3枚目だけを -v2 画像に差し替える。
// 対象：fd0eb894（Instagram・未投稿の下書き）。media_urls の3番目だけを変更し、ほかの列は変更しない。
// 使い方：node apply-20260926-ig-slide.js [--apply]
const { getPool } = require("./db-client");
const BASE = "https://sns-material-storage.gbapp.workers.dev/";
const OLD = `${BASE}issue5-20260928-instagram-03.png`;
const NEW = `${BASE}issue5-20260928-instagram-03-v2.png`;

async function main() {
  const apply = process.argv.includes("--apply");
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "SELECT id, status, external_post_id, target_sns, media_urls FROM sns.posts WHERE id::text LIKE 'fd0eb894%' FOR UPDATE"
    );
    if (rows.length !== 1) throw new Error(`該当 ${rows.length} 件`);
    const post = rows[0];
    if (post.status !== "draft" || post.external_post_id || post.target_sns !== "instagram") throw new Error("未投稿のInstagram下書きではない");
    if (post.media_urls.length !== 5 || post.media_urls[2] !== OLD) throw new Error(`media_urls が想定と違う ${JSON.stringify(post.media_urls)}`);
    const next = [...post.media_urls];
    next[2] = NEW;
    console.log(`${post.id}\n  前: ${post.media_urls[2]}\n  後: ${next[2]}`);
    if (apply) {
      const res = await client.query("UPDATE sns.posts SET media_urls = $2 WHERE id = $1 AND status = 'draft' AND external_post_id IS NULL", [post.id, next]);
      if (res.rowCount !== 1) throw new Error(`更新件数 ${res.rowCount}`);
    }
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
