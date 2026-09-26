// 2026-09-26 テスター誘導の削除：9月分の未投稿動画7件の media_urls だけを -v2 動画へ差し替える。
// 依頼書：SNS集客/Codex依頼_テスター誘導の削除_20260926.md（ばる承認済み）
// 条件：status=draft・未投稿（external_post_id なし）・現在の media_urls が旧動画1本だけ、の投稿に限る。
// ほかの列は変更しない（updated_at はDBが自動で更新する）。
// 使い方：node apply-20260926-v2-media.js        … 確認のみ（dry-run）
//         node apply-20260926-v2-media.js --apply … 実際に更新

const { getPool } = require("./db-client");

const BASE = "https://sns-material-storage.gbapp.workers.dev/";
const TARGETS = [
  ["ab4eca39", "20260924-tiktok-kiridori"],
  ["2642df5a", "20260926-tiktok-kiridori"],
  ["73094f30", "20260927-youtube-harinavi"],
  ["5aff942f", "20260928-youtube-kiridori"],
  ["ac0d7879", "20260927-tiktok-harinavi"],
  ["650ca82d", "20260930-youtube-kiridori"],
  ["1e205f81", "20260929-tiktok-harinavi"],
];

async function main() {
  const apply = process.argv.includes("--apply");
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [prefix, videoId] of TARGETS) {
      const oldUrl = `${BASE}issue5-${videoId}-narrated.mp4`;
      const newUrl = `${BASE}issue5-${videoId}-narrated-v2.mp4`;
      const { rows } = await client.query(
        "SELECT id, status, external_post_id, media_urls, updated_at FROM sns.posts WHERE id::text LIKE $1 FOR UPDATE",
        [`${prefix}%`]
      );
      if (rows.length !== 1) throw new Error(`${prefix}: 該当 ${rows.length} 件（1件のはず）`);
      const post = rows[0];
      const current = JSON.stringify(post.media_urls);
      if (post.status !== "draft" || post.external_post_id) throw new Error(`${prefix}: 未投稿の下書きではない`);
      if (current !== JSON.stringify([oldUrl])) throw new Error(`${prefix}: media_urls が想定と違う ${current}`);
      console.log(`${post.id} ${current} -> ${JSON.stringify([newUrl])}`);
      if (apply) {
        const res = await client.query(
          "UPDATE sns.posts SET media_urls = $2 WHERE id = $1 AND status = 'draft' AND external_post_id IS NULL RETURNING updated_at",
          [post.id, [newUrl]] // media_urls は text[]
        );
        if (res.rowCount !== 1) throw new Error(`${prefix}: 更新件数 ${res.rowCount}`);
        console.log(`  updated_at ${post.updated_at.toISOString()} -> ${res.rows[0].updated_at.toISOString()}`);
      }
    }
    await client.query(apply ? "COMMIT" : "ROLLBACK");
    console.log(apply ? "COMMIT：7件を更新" : "dry-run：変更なし（--apply で更新）");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});
