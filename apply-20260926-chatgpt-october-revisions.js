// 2026-09-26 ChatGPTの見直し案（Issue #5コメント、10/10以降Threads 36件）を反映する。
// 依頼：`chatgpt-request-20260926-october-review.md`。編集長（Claude）が内容を確認済み
// （禁止語・重複・字数・CTA比率など機械チェック通過、質問投稿とCTAの重複なし）。
// 条件：対象36件は status=draft・readiness_state=needs_review・未投稿の投稿に限る。body_text 以外は変更しない。
// 使い方：node apply-20260926-chatgpt-october-revisions.js        … dry-run
//         node apply-20260926-chatgpt-october-revisions.js --apply … 反映

const { getPool } = require("./db-client");
const REVISIONS = require("./apply-20260926-chatgpt-october-revisions.json");

async function main() {
  const apply = process.argv.includes("--apply");
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ids = Object.keys(REVISIONS);
    const { rows } = await client.query(
      `SELECT id, target_app, target_sns, body_text, scheduled_at, status, readiness_state, external_post_id, is_historical
         FROM sns.posts WHERE id::text LIKE ANY($1) FOR UPDATE`,
      [ids.map((p) => `${p}%`)]
    );
    if (rows.length !== ids.length) throw new Error(`該当 ${rows.length} 件（${ids.length}件のはず）`);

    let changed = 0;
    for (const prefix of ids) {
      const post = rows.find((r) => r.id.startsWith(prefix));
      if (!post) throw new Error(`${prefix}: DBに見つからない`);
      if (post.target_sns !== "threads" || post.status !== "draft" || post.readiness_state !== "needs_review") {
        throw new Error(`${prefix}: 対象条件を満たさない (${post.target_sns}/${post.status}/${post.readiness_state})`);
      }
      if (post.external_post_id || post.is_historical) throw new Error(`${prefix}: 投稿済みまたは履歴`);
      const next = REVISIONS[prefix];
      if (next !== post.body_text) {
        changed++;
        const when = new Date(new Date(post.scheduled_at).getTime() + 9 * 3600e3).toISOString().slice(5, 16).replace("T", " ");
        console.log(`\n[${when}] ${prefix} ${post.target_app}`);
        console.log(`  前: ${post.body_text.replace(/\n/g, "⏎")}`);
        console.log(`  後: ${next.replace(/\n/g, "⏎")}`);
      }
      post.next = next;
    }
    console.log(`\n対象 ${rows.length}件／変更 ${changed}件`);
    if (apply) {
      for (const post of rows) {
        const res = await client.query(
          "UPDATE sns.posts SET body_text = $2 WHERE id = $1 AND status = 'draft' AND readiness_state = 'needs_review'",
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
