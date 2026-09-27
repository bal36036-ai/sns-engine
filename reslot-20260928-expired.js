// 2026-09-28 GitHub Actionsの定期実行抜けで期限切れ（expired）になった承認済み2件を、次の空き枠へ入れ直して ready に戻す（ばる承認）。
// 条件：status=expired・未投稿（external_post_id なし）・新しい枠が1時間以上先・同じ媒体の ready/scheduled と3時間以上離れている。
// 変更する列：status・scheduled_at・guard_reason・error_detail・scheduling_reason（履歴を追記）。本文・素材・公開フラグは変更しない。
// 重複確認は投稿直前にCronが Buffer／Threads API で行う。
// 使い方：node reslot-20260928-expired.js        … dry-run
//         node reslot-20260928-expired.js --apply … 反映

const { getPool } = require("./db-client");

const TARGETS = {
  c4c64bbc: { sns: "threads", to: "2026-10-03T17:00:00+09:00" },
  "73094f30": { sns: "youtube", to: "2026-10-02T20:15:00+09:00" },
};
const MIN_GAP_MS = 3 * 3600e3;

async function main() {
  const apply = process.argv.includes("--apply");
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [prefix, { sns, to }] of Object.entries(TARGETS)) {
      const at = new Date(to);
      const { rows } = await client.query("SELECT * FROM sns.posts WHERE id::text LIKE $1 FOR UPDATE", [`${prefix}%`]);
      if (rows.length !== 1) throw new Error(`${prefix}: 該当 ${rows.length} 件`);
      const post = rows[0];
      if (post.status !== "expired" || post.external_post_id || post.target_sns !== sns) {
        throw new Error(`${prefix}: 条件を満たさない (${post.status}/${post.target_sns}/${post.external_post_id})`);
      }
      if (at.getTime() < Date.now() + 3600e3) throw new Error(`${prefix}: 新しい枠が近すぎる`);
      const near = await client.query(
        "SELECT id, scheduled_at FROM sns.posts WHERE target_sns = $1 AND status IN ('ready','scheduled') AND id <> $2 AND abs(extract(epoch from scheduled_at - $3::timestamptz)) < $4",
        [sns, post.id, at.toISOString(), MIN_GAP_MS / 1000]
      );
      if (near.rows.length) throw new Error(`${prefix}: 同じ媒体のready投稿と3時間以内 (${near.rows.map((r) => r.id.slice(0, 8)).join(",")})`);
      const history = { ...(post.scheduling_reason || {}) };
      history.reslot_history = [...(history.reslot_history || []), {
        at: new Date().toISOString(), from: post.scheduled_at, to: at.toISOString(),
        reason: "GitHub Actionsの定期実行抜けでexpiredになったため、次の空き枠へ入れ直し（ばる承認 2026-09-28）",
      }];
      console.log(`${post.id} ${sns}: ${post.scheduled_at.toISOString()} -> ${at.toISOString()} (expired -> ready)`);
      if (apply) {
        const res = await client.query(
          `UPDATE sns.posts SET status = 'ready', scheduled_at = $2, guard_reason = NULL, error_detail = NULL, scheduling_reason = $3
            WHERE id = $1 AND status = 'expired' AND external_post_id IS NULL`,
          [post.id, at.toISOString(), JSON.stringify(history)]
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

main().catch((error) => { console.error("ERROR:", error.message); process.exit(1); });
