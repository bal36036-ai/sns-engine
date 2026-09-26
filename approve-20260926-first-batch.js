// 2026-09-26 ばる承認（「全部おすすめで」）：9/26 17:00〜10/2 の確認待ち投稿を公開OKにして ready へ進める。
// 対象外：要修正で本文・画像を直したばかりの a727c0be・2b01b67f・fd0eb894（ばる未確認）、
//         予定時刻を過ぎた 54c748e6（繰り延べ後に別途）。
// Instagram・TikTok・YouTube：既存の promote-to-ready.js（Buffer側の重複確認つき）で ready にする。
// Threads：このPCに THREADS_ACCESS_TOKEN が無く Threads API の重複確認ができないため、
//          DB内の重複確認だけ行って ready にする。Threads API の重複確認は投稿直前に Cron（GitHub Actions）が必ず行う。
// 使い方：node approve-20260926-first-batch.js        … 確認のみ（dry-run）
//         node approve-20260926-first-batch.js --apply … 実行

const { getPool } = require("./db-client");
const { promoteToReady } = require("./promote-to-ready");

// 引数でIDの先頭8文字を渡すと、その投稿だけを対象にする（例：繰り延べ後の 54c748e6、修正後にばるがOKした3件）。
// 引数で指定したときは 10/2 までという期間の制限をかけない。
const ARG_IDS = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const DEFAULT_APPROVED = [
  "b3ffb0f8", "ab4eca39", "d0c23464", "562b701f", "2642df5a", "73094f30", "1c7f7a47",
  "281b2249", "aa0598b5", "5aff942f", "35bd8590", "8abd970e", "ac0d7879", "45538d66",
  "5f4cdac9", "650ca82d", "5cade5a3", "706edf95", "a403a76c", "1e205f81", "815bec60",
];
const APPROVED = ARG_IDS.length ? ARG_IDS : DEFAULT_APPROVED;
const LAST_SLOT = new Date("2026-10-02T23:59:59+09:00");
const MIN_LEAD_MS = 20 * 60_000;

async function main() {
  const apply = process.argv.includes("--apply");
  const pool = getPool();
  const client = await pool.connect();
  const targets = [];
  try {
    await client.query("BEGIN");
    for (const prefix of APPROVED) {
      const { rows } = await client.query("SELECT * FROM sns.posts WHERE id::text LIKE $1 FOR UPDATE", [`${prefix}%`]);
      if (rows.length !== 1) throw new Error(`${prefix}: 該当 ${rows.length} 件`);
      const post = rows[0];
      const at = new Date(post.scheduled_at);
      const problems = [];
      if (post.status !== "draft" || post.readiness_state !== "needs_review") problems.push(`状態 ${post.status}/${post.readiness_state}`);
      if (post.is_historical || post.external_post_id) problems.push("履歴または投稿済み");
      if (!(at.getTime() > Date.now() + MIN_LEAD_MS) || (!ARG_IDS.length && at > LAST_SLOT)) problems.push(`予定日時 ${at.toISOString()}`);
      if (!post.body_text?.trim()) problems.push("本文なし");
      if (post.target_sns !== "threads" && !post.media_urls?.length) problems.push("素材なし");
      if (post.target_sns === "threads") {
        const dup = await client.query(
          "SELECT id FROM sns.posts WHERE target_sns = 'threads' AND id <> $1 AND body_text = $2 AND status IN ('ready','scheduled','sent')",
          [post.id, post.body_text]
        );
        if (dup.rows.length) problems.push(`DB内に同じ本文 ${dup.rows[0].id}`);
      }
      if (problems.length) throw new Error(`${prefix}: ${problems.join(" / ")}`);
      targets.push(post);
      const when = new Date(at.getTime() + 9 * 3600e3).toISOString().slice(5, 16).replace("T", " ");
      console.log(`${when} ${post.target_sns.padEnd(9)} ${post.target_app} ${post.id}`);
    }
    if (apply) {
      for (const post of targets) {
        await client.query(
          `UPDATE sns.posts SET is_publishable = true, feature_published = true, readiness_state = 'ready_candidate'
            WHERE id = $1 AND status = 'draft' AND readiness_state = 'needs_review'`,
          [post.id]
        );
        if (post.target_sns === "threads") {
          await client.query(
            `UPDATE sns.posts SET status = 'ready', guard_reason = NULL, duplicate_check = $2 WHERE id = $1 AND status = 'draft'`,
            [post.id, JSON.stringify({
              checked_at: new Date().toISOString(),
              result: "none_in_db",
              note: "DB内の重複なし。Threads APIでの重複確認は投稿直前のCronで実施（ローカルにTHREADS_ACCESS_TOKENなし）",
              approved_by: "bal 2026-09-26",
            })]
          );
        }
      }
    }
    await client.query(apply ? "COMMIT" : "ROLLBACK");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  await pool.end();

  if (!apply) {
    console.log(`dry-run：${targets.length}件（--apply で実行）`);
    return;
  }
  // Buffer経由の3媒体は既存の昇格処理（Buffer側の重複確認つき）で ready へ
  for (const post of targets.filter((p) => p.target_sns !== "threads")) {
    const result = await promoteToReady(post.id);
    console.log(`${post.id.slice(0, 8)} ${post.target_sns}: ${result.ok ? "ready" : JSON.stringify(result)}`);
  }
  console.log(`Threads ${targets.filter((p) => p.target_sns === "threads").length}件は ready 済み`);
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});
