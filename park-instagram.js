// 2026-10-01 ばる判断「Instagramを止める」：準備完了（ready）のInstagram投稿を、投稿されない状態（下書き・確認待ち）へ戻す。
// 理由：Instagramは10件投稿して合計12回しか見られていない（Buffer 9/30時点）。BufferのInstagramの枠をXに替えるため。
// 変更する列：status・readiness_state・guard_reason のみ。本文・画像・予定日時・公開フラグは変更しない（再開は promote-to-ready.js で1件ずつ）。
// 再開：node park-instagram.js --resume   … 対象を ready に戻す（Buffer側にInstagramがつながっていること）
// 使い方：node park-instagram.js [--apply]

const { getPool } = require("./db-client");
const NOTE = "Instagram一時停止（ばる判断 2026-10-01：見られた数が少ないため。再開は park-instagram.js --resume）";

async function main() {
  const apply = process.argv.includes("--apply");
  const resume = process.argv.includes("--resume");
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = resume
      ? await client.query("SELECT id, scheduled_at FROM sns.posts WHERE target_sns = 'instagram' AND status = 'draft' AND guard_reason = $1 AND external_post_id IS NULL ORDER BY scheduled_at FOR UPDATE", [NOTE])
      : await client.query("SELECT id, scheduled_at FROM sns.posts WHERE target_sns = 'instagram' AND status = 'ready' AND external_post_id IS NULL ORDER BY scheduled_at FOR UPDATE");
    console.log(`${resume ? "再開" : "停止"}の対象 ${rows.length}件`);
    if (apply) {
      for (const r of rows) {
        const res = resume
          ? await client.query("UPDATE sns.posts SET status = 'ready', readiness_state = 'ready_candidate', guard_reason = NULL WHERE id = $1 AND status = 'draft' AND target_sns = 'instagram'", [r.id])
          : await client.query("UPDATE sns.posts SET status = 'draft', readiness_state = 'needs_review', guard_reason = $2 WHERE id = $1 AND status = 'ready' AND target_sns = 'instagram' AND external_post_id IS NULL", [r.id, NOTE]);
        if (res.rowCount !== 1) throw new Error(`${r.id}: 更新件数 ${res.rowCount}`);
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

main().catch((error) => { console.error("ERROR:", error.message); process.exit(1); });
