// 2026-10-08 ばる承認（「いいよ」2回目）：10/26〜11/8の今の予約（見直し前の古い計画の Threads・X・TikTok・YouTube）を、消さずに下書きへ戻し、
// ChatGPT企画の新しい投稿（cr-… の下書き36件、ingest-next-plan-20261026.js）に画像・動画を付けて、準備完了にする。
// やり方は swap-content-reset-20261008.js と同じ。違いは、同じ期間の古い下書き（cal-）も日時を外すこと（新しい投稿と枠が重ならないように）。
// 1) 旧予約（ready）と旧い下書き（cal-）：status=draft・readiness_state=needs_review・scheduled_at=NULL（元の時刻は scheduling_reason と next-plan-20261026-before.json に残す。いつでも戻せる）
// 2) 新投稿：画像・動画を付け、Threads は DB内の重複確認のうえ ready。X・TikTok・YouTube は既存の promote-to-ready.js（Buffer側の重複確認つき）で ready。
// 使い方：node swap-next-plan-20261026.js          … 確認のみ
//         node swap-next-plan-20261026.js --apply  … 実行
const fs = require("fs");
const { getPool } = require("./db-client");
const { promoteToReady } = require("./promote-to-ready");
const media = JSON.parse(fs.readFileSync(__dirname + "/next-plan-20261026-media.json", "utf8"));
const U = (f) => media[f];

// 日付ごとの画像（Threads・X）。実画面・会話劇・引き継ぎカードは両方に、文字カードはXだけ（Threadsは文字だけ）
const IMG = {
  "2026-10-27": "20261027-skit.png", "2026-10-28": "20261028-k-yield.png", "2026-10-29": "20261029-k-compare.png", "2026-10-31": "20261031-card.png",
  "2026-11-03": "20261103-skit.png", "2026-11-04": "20261104-h-input.png", "2026-11-05": "20261105-h-compare.png", "2026-11-06": "20261106-k-scrap.png", "2026-11-07": "20261107-k-optimal.png",
};
const CARD = { "2026-10-26": "20261026-card.png", "2026-10-30": "20261030-card.png", "2026-11-01": "20261101-card.png", "2026-11-02": "20261102-card.png", "2026-11-08": "20261108-card.png" };
const VIDEO = { "2026-10-27": "skit-6-20261027.mp4", "2026-10-29": "kiridori-a1-yield-20261029.mp4", "2026-11-03": "skit-7-20261103.mp4", "2026-11-05": "harinavi-a2-input-20261105.mp4" };
const jst = (d) => new Date(new Date(d).getTime() + 9 * 3600e3).toISOString().slice(0, 10);
const FROM = "2026-10-25T15:00:00Z"; // 10/26 00:00 JST
const TO = "2026-11-08T15:00:00Z"; // 11/9 00:00 JST

function mediaFor(row) {
  const day = jst(row.scheduled_at);
  let f;
  if (row.target_sns === "tiktok" || row.target_sns === "youtube") f = VIDEO[day];
  else if (row.target_sns === "x") f = IMG[day] || CARD[day];
  else if (row.target_sns === "threads") f = IMG[day];
  if (f && !U(f)) throw new Error(`URLがない: ${f}`);
  return f ? [U(f)] : [];
}

(async () => {
  const apply = process.argv.includes("--apply");
  const pool = getPool(); const c = await pool.connect();
  const promoteIds = [];
  try {
    await c.query("BEGIN");
    // 1) 旧予約・旧い下書きを、日時なしの下書きへ
    const old = (await c.query(
      `SELECT * FROM sns.posts WHERE (status = 'ready' OR (status = 'draft' AND topic_id LIKE 'cal-%')) AND is_historical = false AND external_post_id IS NULL
         AND target_sns IN ('threads','x','tiktok','youtube') AND scheduled_at >= $1 AND scheduled_at < $2
         AND (topic_id IS NULL OR topic_id NOT LIKE 'cr-%') FOR UPDATE`, [FROM, TO])).rows;
    const before = old.map((r) => ({ id: r.id, sns: r.target_sns, topic_id: r.topic_id, status: r.status, readiness_state: r.readiness_state, scheduled_at: r.scheduled_at, guard_reason: r.guard_reason, scheduling_reason: r.scheduling_reason }));
    const count = {}; for (const r of old) { const k = `${r.target_sns}/${r.status}`; count[k] = (count[k] || 0) + 1; }
    console.log("旧予約・旧い下書き（→日時なしの下書きへ）:", JSON.stringify(count), `合計${old.length}件`);
    if (apply) {
      fs.writeFileSync(__dirname + "/next-plan-20261026-before.json", JSON.stringify(before, null, 1), "utf8");
      for (const r of old) {
        const prior = r.scheduling_reason && typeof r.scheduling_reason === "object" && !Array.isArray(r.scheduling_reason) ? r.scheduling_reason : {};
        const reason = { ...prior, parked: { at: new Date().toISOString(), from: r.scheduled_at, status_before: r.status, why: "2026-10-08 ばる承認の企画入れ替え 2回目（10/26〜11/8、chatgpt-plan-20261008-next-plan-1026）。消さずに下書きへ戻した" } };
        await c.query(
          `UPDATE sns.posts SET status='draft', readiness_state='needs_review', scheduled_at=NULL, guard_reason=$2, scheduling_reason=$3::jsonb WHERE id=$1 AND status IN ('ready','draft')`,
          [r.id, "企画入れ替えのため下書きへ戻した（2026-10-08）。戻すときは next-plan-20261026-before.json を参照", JSON.stringify(reason)]);
      }
    }
    // 2) 新投稿に素材を付けて準備完了へ
    const fresh = (await c.query(`SELECT * FROM sns.posts WHERE topic_id LIKE 'cr-%' AND status='draft' AND scheduled_at >= $1 AND scheduled_at < $2 FOR UPDATE`, [FROM, TO])).rows;
    console.log(`新投稿: ${fresh.length}件`);
    if (fresh.length !== 36) throw new Error(`新投稿が36件ではない（${fresh.length}件）`);
    for (const r of fresh) {
      const urls = mediaFor(r);
      const isVideoSns = r.target_sns === "tiktok" || r.target_sns === "youtube";
      if (isVideoSns && !urls.length) throw new Error(`${r.topic_id} ${r.target_sns}: 動画なし`);
      if (new Date(r.scheduled_at).getTime() < Date.now() + 20 * 60e3) throw new Error(`${r.topic_id}: 予定が近すぎる`);
      if (r.target_sns === "threads") {
        const dup = await c.query("SELECT id FROM sns.posts WHERE target_sns='threads' AND id<>$1 AND body_text=$2 AND status IN ('ready','scheduled','sent')", [r.id, r.body_text]);
        if (dup.rowCount) throw new Error(`${r.topic_id}: DB内に同じ本文`);
      }
      console.log(`${jst(r.scheduled_at)} ${r.target_sns.padEnd(8)} ${r.target_app.padEnd(8)} ${urls.length ? urls[0].split("/").pop() : "（文字だけ）"}`);
      if (apply) {
        await c.query(`UPDATE sns.posts SET media_urls=$2, is_publishable=true, feature_published=true, readiness_state='ready_candidate' WHERE id=$1`, [r.id, urls]);
        if (r.target_sns === "threads") {
          await c.query(`UPDATE sns.posts SET status='ready', guard_reason=NULL, duplicate_check=$2 WHERE id=$1 AND status='draft'`,
            [r.id, JSON.stringify({ checked_at: new Date().toISOString(), result: "none_in_db", note: "DB内の重複なし。Threads APIでの重複確認は投稿直前のCronで実施（ローカルにTHREADS_ACCESS_TOKENなし）", approved_by: "bal 2026-10-08（2回目）" })]);
        } else promoteIds.push(r.id);
      }
    }
    await c.query(apply ? "COMMIT" : "ROLLBACK");
  } catch (e) { await c.query("ROLLBACK"); console.error("ERROR:", e.message); process.exitCode = 1; c.release(); await pool.end(); return; }
  c.release(); await pool.end();
  if (!apply) { console.log("dry-run（--apply で実行）"); return; }
  // X・TikTok・YouTube：Buffer側の重複確認つきで ready へ
  let ok = 0; const ng = [];
  for (const id of promoteIds) {
    const r = await promoteToReady(id);
    if (r.ok) ok++; else ng.push({ id, r });
  }
  console.log(`Buffer経由 ${promoteIds.length}件のうち ready ${ok}件`);
  if (ng.length) { console.log("ready にならなかった:", JSON.stringify(ng, null, 1)); process.exitCode = 1; }
})();
