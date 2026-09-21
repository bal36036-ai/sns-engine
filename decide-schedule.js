// waiting_schedule状態の投稿候補に、投稿日時を自動決定して設定する。
// 分析サンプルが少ない現状では時間帯を断定せず、「検証用候補」として決める。
// 決定理由はscheduling_reasonへ保存し、あとから追跡できるようにする。

const { getPool } = require("./db-client");

// プロジェクト標準の投稿時間枠(日本時間)。根拠：投稿本文_媒体別_v1_20260911.md
const SLOTS = { morning: "06:30", noon: "12:15", evening: "19:30" };

async function decideSchedule(postId, { slotLabel, slotTime, reasonNote }) {
  const pool = getPool();
  try {
    const { rows } = await pool.query(`SELECT * FROM sns.posts WHERE id = $1;`, [postId]);
    if (rows.length === 0) throw new Error("post not found");
    const post = rows[0];

    // 直近投稿履歴から投稿間隔を確認
    const { rows: history } = await pool.query(
      `SELECT COALESCE(matched_posted_at, (post_result->>'sentAt')::timestamptz) AS posted_at
       FROM sns.posts
       WHERE COALESCE(matched_external_post_id, external_post_id) IS NOT NULL
       ORDER BY posted_at DESC LIMIT 1;`
    );
    const lastPostedAt = history[0] ? new Date(history[0].posted_at) : null;

    // 当日中の連続投稿を避けるため、翌日以降の直近日を選ぶ
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 1);
    const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;
    const scheduledAt = new Date(`${dateStr}T${slotTime}:00+09:00`);
    const dow = ["日", "月", "火", "水", "木", "金", "土"][targetDate.getDay()];

    const reason = {
      decided_at: new Date().toISOString(),
      chosen_datetime: scheduledAt.toISOString(),
      day_of_week: dow,
      time_slot: slotLabel,
      rationale: [
        "当日中の連続投稿を避けるため翌日に設定(投稿間隔への配慮)",
        lastPostedAt ? `直近投稿(${lastPostedAt.toISOString()})からの間隔は約${Math.round((scheduledAt - lastPostedAt) / 3600000)}時間` : "直近投稿履歴なし",
        "プロジェクト標準の投稿時間枠(朝6:30/昼12:15/夜19:30)から選択",
        "現状サンプル数が少なく最適時間帯は未確定のため、断定せず『検証用候補』として設定",
        reasonNote,
      ].filter(Boolean),
      confidence: "hypothesis_test_candidate",
    };

    await pool.query(
      `UPDATE sns.posts SET scheduled_at = $2, scheduling_reason = $3 WHERE id = $1;`,
      [postId, scheduledAt.toISOString(), JSON.stringify(reason)]
    );

    return { post_id: postId, target_sns: post.target_sns, scheduled_at: scheduledAt.toISOString(), reason };
  } finally {
    await pool.end();
  }
}

module.exports = { decideSchedule, SLOTS };
