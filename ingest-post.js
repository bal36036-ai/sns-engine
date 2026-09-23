// 投稿候補をSupabase(sns.posts)へ登録する。ChatGPT/Claudeが作った投稿案の受け口。
// 必ず status='draft' から開始する。ready への昇格は promote-to-ready.js で別途行う。
//
// SNSごとの文章は「別レコード」にする設計(1トピック=対象SNSの数だけ行ができる)。
// 理由：媒体ごとに文章・画像・投稿タイミング・状態(ready/failed等)が独立して進むため、
// 1行にまとめると「IGだけready・Xはまだdraft」のような状態を表現できなくなる。
// topic_id で同じネタのSNS横断グループを追跡する。

const crypto = require("crypto");
const { getPool } = require("./db-client");

function bodyHash(text) {
  return crypto.createHash("sha256").update(text.trim()).digest("hex");
}

/**
 * @param {object} input
 * @param {string} input.topicId - ネタ/キャンペーンID(同じネタの別SNS版はこれで束ねる)
 * @param {string} input.targetApp - 対象アプリ(kiridori/harinavi/pipenavi/brand等)
 * @param {string} input.targetSns - instagram/tiktok/youtube/x/threads/note
 * @param {string} [input.title] - タイトル(note記事等)
 * @param {string} input.bodyText - 本文
 * @param {string[]} [input.mediaUrls] - 画像/動画の公開URL(未完成なら省略可、空配列で登録)
 * @param {string|null} [input.scheduledAt] - 予約日時(ISO8601)。未定ならnull
 * @param {boolean} input.isPublishable - 公開可否
 * @param {boolean} input.featurePublished - true=対象機能は公開済み、false=開発中(未公開)
 */
async function ingestPost(input, { pool: sharedPool } = {}) {
  const {
    topicId = null,
    targetApp = null,
    targetSns,
    title = null,
    bodyText,
    mediaUrls = [],
    scheduledAt = null,
    isPublishable,
    featurePublished,
  } = input;

  if (!targetSns) throw new Error("targetSns は必須です");
  if (!bodyText || !bodyText.trim()) throw new Error("bodyText は必須です");
  if (typeof isPublishable !== "boolean") throw new Error("isPublishable(true/false)は必須です");
  if (typeof featurePublished !== "boolean") throw new Error("featurePublished(true/false)は必須です");

  const pool = sharedPool || getPool();
  try {
    // topic_id の有無に関係なく、同一媒体の本文重複も防ぐ。
    if (topicId) {
      const existing = await pool.query(
        `SELECT id, status FROM sns.posts WHERE topic_id = $1 AND target_sns = $2;`,
        [topicId, targetSns]
      );
      if (existing.rows.length > 0) {
        return { ok: false, reason: "duplicate_topic", existing: existing.rows[0] };
      }
    }
    const existingBody = await pool.query(
      `SELECT id, status FROM sns.posts WHERE target_sns = $1 AND md5(body_text) = md5($2) LIMIT 1;`,
      [targetSns, bodyText]
    );
    if (existingBody.rows.length > 0) {
      return { ok: false, reason: "duplicate_body", existing: existingBody.rows[0] };
    }

    const res = await pool.query(
      `INSERT INTO sns.posts
        (topic_id, target_app, target_sns, title, body_text, media_urls, scheduled_at, is_publishable, feature_published, status)
       SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,'draft'
       WHERE NOT EXISTS (
         SELECT 1 FROM sns.posts WHERE target_sns = $3 AND md5(body_text) = md5($5)
       )
       ON CONFLICT DO NOTHING
       RETURNING id, status;`,
      [topicId, targetApp, targetSns, title, bodyText, mediaUrls, scheduledAt, isPublishable, featurePublished]
    );
    return res.rows.length > 0
      ? { ok: true, post: res.rows[0] }
      : { ok: false, reason: "duplicate_topic_or_body" };
  } finally {
    if (!sharedPool) await pool.end();
  }
}

module.exports = { ingestPost, bodyHash };

if (require.main === module) {
  // CLI: node ingest-post.js '<JSON文字列>'
  const arg = process.argv[2];
  if (!arg) {
    console.error("使い方: node ingest-post.js '<JSON>'");
    process.exit(1);
  }
  const input = JSON.parse(arg);
  ingestPost(input)
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => {
      console.error("ERROR:", e.message);
      process.exit(1);
    });
}
