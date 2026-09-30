// ready昇格前の最終確認。以下をすべてチェックし、1つでも欠けたら理由を返す。
// media_urls有効・Cloudflare公開URLで実際に取得できる・対象媒体に合う形式・
// 本文/タイトル存在・公開可否true・未公開機能ではない・重複なし・投稿経路接続済み

const https = require("https");
const { getPool } = require("./db-client");
const { findDuplicatePost } = require("./buffer-client");
const threadsClient = require("./threads-client");
const { ACTIVE_BUFFER_MAP: CHANNEL_MAP, TEXT_ONLY_SNS, AUTOMATED_SNS: CONNECTED_CHANNELS } = require("./buffer-channels");

function headCheck(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: "HEAD", timeout: 8000 }, (res) => {
      resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, contentType: res.headers["content-type"], status: res.statusCode });
    });
    req.on("error", () => resolve({ ok: false }));
    req.on("timeout", () => { req.destroy(); resolve({ ok: false }); });
    req.end();
  });
}

async function verifyOne(post) {
  const issues = [];

  // 投稿経路が接続済みか
  if (!CONNECTED_CHANNELS.includes(post.target_sns)) {
    issues.push(`投稿経路未接続: ${post.target_sns}`);
  }

  // 本文存在
  if (!post.body_text || !post.body_text.trim()) issues.push("本文が空");

  // 公開可否・未公開機能
  if (!post.is_publishable) issues.push("公開可否false");
  if (!post.feature_published) issues.push("未公開機能");
  if (!post.scheduled_at || new Date(post.scheduled_at) <= new Date()) issues.push("投稿予定日時が未設定または過去");

  // media_urls有効・実際に取得できる・形式
  if ((!post.media_urls || post.media_urls.length === 0) && !TEXT_ONLY_SNS.includes(post.target_sns)) {
    issues.push("media_urlsが空");
  } else {
    for (const url of post.media_urls || []) {
      if (!url.startsWith("https://sns-material-storage.gbapp.workers.dev/")) {
        issues.push(`Cloudflare公開URLではない: ${url}`);
        continue;
      }
      const check = await headCheck(url);
      if (!check.ok) {
        issues.push(`公開URLに実際に到達できない(status=${check.status}): ${url}`);
        continue;
      }
      const isVideo = /\.(mp4|mov|webm)$/i.test(url) || (check.contentType || "").startsWith("video/");
      const isImage = /\.(png|jpe?g|webp)$/i.test(url) || (check.contentType || "").startsWith("image/");
      if (post.target_sns === "youtube" && !isVideo) {
        issues.push(`YouTubeは動画が必須だが画像/不明な形式: ${url}`);
      }
      if (!isVideo && !isImage) {
        issues.push(`対象媒体に合う形式と判定できない: ${url}`);
      }
    }
  }

  // 重複チェック(Buffer側の生きた確認)
  if (CONNECTED_CHANNELS.includes(post.target_sns) && post.body_text) {
    try {
      const dup = post.target_sns === "threads"
        ? await threadsClient.findDuplicateText((await threadsClient.getMe()).id, post.body_text)
        : await findDuplicatePost(CHANNEL_MAP[post.target_sns], post.body_text);
      if (dup) issues.push(`外部サービスに既存の同一投稿あり(id=${dup.id})`);
    } catch (e) {
      issues.push(`重複確認エラー: ${e.message}`);
    }
  }

  return { post_id: post.id, topic_id: post.topic_id, target_sns: post.target_sns, ok: issues.length === 0, issues };
}

async function verifyBeforeReady(postIds) {
  const pool = getPool();
  try {
    const { rows } = await pool.query(`SELECT * FROM sns.posts WHERE id = ANY($1::uuid[]);`, [postIds]);
    const results = [];
    for (const post of rows) {
      results.push(await verifyOne(post));
    }
    return results;
  } finally {
    await pool.end();
  }
}

module.exports = { verifyBeforeReady };
