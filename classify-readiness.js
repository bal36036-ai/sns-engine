// draft状態の投稿候補に対し、「次に何をすればよいか」を readiness_state として機械分類する。
// status(draft/ready/...)は変更しない。あくまで「なぜまだreadyでないか」の理由付け。
//
// 分類優先順位：
//   historical            … 過去投稿済み、再投稿禁止(is_historical=true)
//   waiting_channel       … X/Threads等、自動投稿経路が未接続の媒体(IG/TikTok/YouTube以外)
//   waiting_media         … 画像/動画が無い(自動化対象媒体のみ判定)
//   needs_review          … 公開可否false・未公開機能・重複疑いなど人の判断が必要
//   waiting_schedule      … 内容・素材は揃っているが投稿日時が未定
//   ready_candidate       … 全て揃っている(promote-to-ready.js でreadyへ進められる)

const { getPool } = require("./db-client");

const AUTOMATED_SNS = ["instagram", "tiktok", "youtube"];

function classify(post) {
  if (post.is_historical) return "historical";
  if (!AUTOMATED_SNS.includes(post.target_sns)) return "waiting_channel";
  if (!post.media_urls || post.media_urls.length === 0) return "waiting_media";
  if (!post.is_publishable || !post.feature_published) return "needs_review";
  if (post.duplicate_check && ["duplicate", "possible_duplicate"].includes(post.duplicate_check.result)) {
    return "needs_review";
  }
  if (!post.scheduled_at) return "waiting_schedule";
  return "ready_candidate";
}

async function classifyAll() {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `SELECT id, target_sns, media_urls, is_publishable, feature_published, is_historical, duplicate_check, scheduled_at
       FROM sns.posts WHERE status = 'draft';`
    );
    const summary = {};
    for (const post of rows) {
      const state = classify(post);
      summary[state] = (summary[state] || 0) + 1;
      await pool.query(`UPDATE sns.posts SET readiness_state = $2 WHERE id = $1;`, [post.id, state]);
    }
    return { total: rows.length, summary };
  } finally {
    await pool.end();
  }
}

module.exports = { classify, classifyAll };

if (require.main === module) {
  classifyAll()
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => {
      console.error("ERROR:", e.message);
      process.exit(1);
    });
}
