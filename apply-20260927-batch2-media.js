// 2026-09-27 stage27バッチ2：素材を作った3件（IG 1件・動画2本）の media_urls を登録し、
// readiness_state を waiting_media → needs_review へ進める（classify-readiness.js と同じ判定基準）。
// 対象：status=draft・readiness_state=waiting_media・未投稿の投稿に限る。body_textは変更しない
// （stage27で確定済み）。is_publishable/feature_published は変更しない（falseのまま。ready化は別途）。
// 使い方：node apply-20260927-batch2-media.js        … dry-run
//         node apply-20260927-batch2-media.js --apply … 反映

const { getPool } = require("./db-client");

const BASE = "https://sns-material-storage.gbapp.workers.dev/";
const TARGETS = {
  "45d435f2": { urls: [1, 2, 3, 4, 5].map((n) => `${BASE}issue5-20261004-instagram-${String(n).padStart(2, "0")}.png`), sns: "instagram" },
  e10de7e7: { urls: [`${BASE}issue5-20261002-youtube-kiridori-narrated.mp4`], sns: "youtube" },
  "683ebc74": { urls: [`${BASE}issue5-20261003-tiktok-harinavi-narrated.mp4`], sns: "tiktok" },
};

async function main() {
  const apply = process.argv.includes("--apply");
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [prefix, { urls, sns }] of Object.entries(TARGETS)) {
      const { rows } = await client.query("SELECT id, target_sns, status, readiness_state, media_urls, external_post_id FROM sns.posts WHERE id::text LIKE $1 FOR UPDATE", [`${prefix}%`]);
      if (rows.length !== 1) throw new Error(`${prefix}: 該当 ${rows.length} 件`);
      const post = rows[0];
      if (post.target_sns !== sns) throw new Error(`${prefix}: target_sns が想定と違う (${post.target_sns})`);
      if (post.status !== "draft" || post.readiness_state !== "waiting_media") throw new Error(`${prefix}: 対象条件を満たさない (${post.status}/${post.readiness_state})`);
      if (post.external_post_id) throw new Error(`${prefix}: 投稿済み`);
      if (post.media_urls && post.media_urls.length) throw new Error(`${prefix}: media_urls が既に設定済み`);
      console.log(`${post.id} ${sns}\n  media_urls -> ${JSON.stringify(urls)}`);
      if (apply) {
        const res = await client.query(
          "UPDATE sns.posts SET media_urls = $2, readiness_state = 'needs_review' WHERE id = $1 AND status = 'draft' AND readiness_state = 'waiting_media'",
          [post.id, urls]
        );
        if (res.rowCount !== 1) throw new Error(`${prefix}: 更新件数 ${res.rowCount}`);
      }
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

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});
