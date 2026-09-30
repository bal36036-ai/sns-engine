// draft → ready への昇格。
// 「内容確認・素材確認・公開可否確認・重複確認」が全て通ったものだけ ready へ進める。
// 1つでも欠けていれば draft のまま留め、理由を guard_reason に記録して人が分かる形にする。

const { getPool } = require("./db-client");
const { findDuplicatePost } = require("./buffer-client");
const threadsClient = require("./threads-client");
const { ACTIVE_BUFFER_MAP: CHANNEL_MAP, TEXT_ONLY_SNS, AUTOMATED_SNS } = require("./buffer-channels");

// Buffer連携済みチャンネルは buffer-channels.js（Instagramは一時停止中）。Threadsは公式APIで別途重複確認する。

async function promoteToReady(postId) {
  const pool = getPool();
  try {
    const { rows } = await pool.query(`SELECT * FROM sns.posts WHERE id = $1;`, [postId]);
    if (rows.length === 0) return { ok: false, reason: "not_found" };
    const post = rows[0];

    if (post.status !== "draft") {
      return { ok: false, reason: `status is ${post.status}, not draft` };
    }
    if (post.is_historical) {
      return { ok: false, reason: "historical_locked", message: "履歴データのためready昇格は禁止されています" };
    }
    if (!AUTOMATED_SNS.includes(post.target_sns)) {
      return { ok: false, reason: "channel_not_connected", message: `${post.target_sns}は自動投稿経路が未接続のためready昇格できません` };
    }

    const checks = [];

    // 1. 内容確認
    if (!post.body_text || !post.body_text.trim()) checks.push("本文が空");

    // 2. 素材確認(自動化対象SNSは画像/動画が必須)
    if (!TEXT_ONLY_SNS.includes(post.target_sns) && (!post.media_urls || post.media_urls.length === 0)) {
      checks.push("素材未完成(media_urlsが空)");
    }

    // 3. 公開可否確認
    if (!post.is_publishable) checks.push("公開可否がfalse");
    if (!post.feature_published) checks.push("未公開機能(feature_publishedがfalse)");
    if (!post.scheduled_at || new Date(post.scheduled_at) <= new Date()) checks.push("投稿予定日時が未設定または過去");

    // 4. 重複確認(Buffer側と実際に照合。自動化対象SNSのみ)
    let duplicateCheck = { checked_at: new Date().toISOString(), result: "not_applicable" };
    if (checks.length === 0) {
      try {
        const dup = post.target_sns === "threads"
          ? await threadsClient.findDuplicateText((await threadsClient.getMe()).id, post.body_text)
          : await findDuplicatePost(CHANNEL_MAP[post.target_sns], post.body_text);
        if (dup) {
          checks.push("Buffer側に既存の同一投稿あり");
          duplicateCheck = { checked_at: new Date().toISOString(), result: "duplicate", matched_post_id: dup.id };
        } else {
          duplicateCheck = { checked_at: new Date().toISOString(), result: "none" };
        }
      } catch (e) {
        checks.push(`重複確認で外部APIエラー: ${e.message}`);
      }
    }

    if (checks.length > 0) {
      await pool.query(
        `UPDATE sns.posts SET guard_reason = $2, duplicate_check = $3 WHERE id = $1;`,
        [postId, checks.join(" / "), JSON.stringify(duplicateCheck)]
      );
      return { ok: false, reason: "checks_failed", checks };
    }

    await pool.query(
      `UPDATE sns.posts SET status = 'ready', guard_reason = NULL, duplicate_check = $2 WHERE id = $1;`,
      [postId, JSON.stringify(duplicateCheck)]
    );
    return { ok: true, status: "ready" };
  } finally {
    await pool.end();
  }
}

module.exports = { promoteToReady };

if (require.main === module) {
  const id = process.argv[2];
  if (!id) {
    console.error("使い方: node promote-to-ready.js <post_id>");
    process.exit(1);
  }
  promoteToReady(id)
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => {
      console.error("ERROR:", e.message);
      process.exit(1);
    });
}
