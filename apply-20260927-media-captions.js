// 2026-09-27 素材待ち48件（Instagram/TikTok/YouTube Shorts）の投稿文を清書して反映する。
// 経緯：ChatGPTの話題配分見直し案（Issue #5）→ genba-copywriterが完成キャプションに清書
// → Claude編集長が機械チェック（禁止語・重複・字数・タグ数・CTA比率・ハリナビ安全注意・VOICEVOXクレジット）通過を確認。
// 対象：readiness_state=waiting_media・status=draft・未投稿の投稿に限る。body_text のみ変更（readiness_state は waiting_media のまま。
// 画像・動画はまだ作っていないため readiness は変えない）。
// 使い方：node apply-20260927-media-captions.js        … dry-run
//         node apply-20260927-media-captions.js --apply … 反映

const { getPool } = require("./db-client");
const CAPTIONS = require("./apply-20260927-media-captions.json"); // [{id, body_text}, ...]

async function main() {
  const apply = process.argv.includes("--apply");
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ids = CAPTIONS.map((c) => c.id);
    const { rows } = await client.query(
      `SELECT id, target_app, target_sns, body_text, status, readiness_state, external_post_id, is_historical
         FROM sns.posts WHERE id::text LIKE ANY($1) FOR UPDATE`,
      [ids.map((p) => `${p}%`)]
    );
    if (rows.length !== ids.length) throw new Error(`該当 ${rows.length} 件（${ids.length}件のはず）`);

    let changed = 0;
    for (const { id: prefix, body_text: next } of CAPTIONS) {
      const post = rows.find((r) => r.id.startsWith(prefix));
      if (!post) throw new Error(`${prefix}: DBに見つからない`);
      if (post.status !== "draft" || post.readiness_state !== "waiting_media") {
        throw new Error(`${prefix}: 対象条件を満たさない (${post.status}/${post.readiness_state})`);
      }
      if (post.external_post_id || post.is_historical) throw new Error(`${prefix}: 投稿済みまたは履歴`);
      if (next !== post.body_text) {
        changed++;
        console.log(`\n${prefix} ${post.target_app}/${post.target_sns}`);
        console.log(`  前: ${post.body_text.replace(/\n/g, "⏎")}`);
        console.log(`  後: ${next.replace(/\n/g, "⏎")}`);
      }
      post.next = next;
    }
    console.log(`\n対象 ${rows.length}件／変更 ${changed}件`);
    if (apply) {
      for (const post of rows) {
        const res = await client.query(
          "UPDATE sns.posts SET body_text = $2 WHERE id = $1 AND status = 'draft' AND readiness_state = 'waiting_media'",
          [post.id, post.next]
        );
        if (res.rowCount !== 1) throw new Error(`${post.id}: 更新件数 ${res.rowCount}`);
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
