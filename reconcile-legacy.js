// 移行した36件のうち、Buffer上の送信済み投稿(status=sent)と本文が一致するものを紐付ける。
// 一致したもの → is_historical=true, historical_confirmed='buffer_matched'
// X/ThreadsなどBufferに存在しない媒体で、書面記録(現状整理_v1_20260908.md)により
// 投稿確認できているものだけ → historical_confirmed='manual_record'
// それ以外は一切変更しない(=本当に未投稿の候補として残す)。

const https = require("https");
const { getPool } = require("./db-client");

function bufferGraphQL(query, variables) {
  const apiKey = process.env.BUFFER_API_KEY;
  const payload = JSON.stringify({ query, variables });
  return new Promise((resolve, reject) => {
    const req = https.request(
      "https://api.buffer.com/graphql",
      { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload, "utf8") } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(JSON.parse(data)));
      }
    );
    req.on("error", reject);
    req.write(payload, "utf8");
    req.end();
  });
}

function normalize(text) {
  return text.replace(/\s+/g, "").trim();
}

// 現状整理_v1_20260908.md の追記(日付付きログ)で、X/Threadsへの手動投稿が
// 明示的に「投稿完了」と確認できたトピックのみ。推測は含めない。
const MANUAL_RECORD_CONFIRMED_TOPICS = new Set([
  "legacy-主要1",  // 2026-09-12「Day1 全チャンネル投稿完了」(X/Threadsも含む、と明記)
  "legacy-短文A",  // 2026-09-13「Day2（短文A・X/Threads）投稿完了」
  "legacy-主要2",  // 2026-09-13「Day3のX/Threads手動投稿（短縮版）完了...Day3は全チャンネル完了」
]);

async function main() {
  const pool = getPool();
  const report = { buffer_matched: [], manual_record: [], unconfirmed_x_threads: [], no_match_ig_tiktok_youtube: [] };

  try {
    const { data } = await bufferGraphQL(
      `query($input: PostsInput!, $first: Int) { posts(input: $input, first: $first) { edges { node { id text sentAt channelService externalLink } } } }`,
      { input: { organizationId: "6a9ce08c79abd3cf24ec6baf", filter: { status: ["sent"] } }, first: 50 }
    );
    const sentPosts = data.posts.edges.map((e) => e.node);

    const { rows } = await pool.query(
      `SELECT id, topic_id, target_sns, body_text FROM sns.posts WHERE topic_id LIKE 'legacy-%';`
    );

    for (const post of rows) {
      if (["instagram", "tiktok", "youtube"].includes(post.target_sns)) {
        const match = sentPosts.find(
          (sp) => sp.channelService === post.target_sns && normalize(sp.text) === normalize(post.body_text)
        );
        if (match) {
          await pool.query(
            `UPDATE sns.posts
             SET is_historical = true, historical_confirmed = 'buffer_matched',
                 matched_external_post_id = $2, matched_posted_at = $3, matched_external_link = $4
             WHERE id = $1;`,
            [post.id, match.id, match.sentAt, match.externalLink]
          );
          report.buffer_matched.push({ topic: post.topic_id, sns: post.target_sns, link: match.externalLink });
        } else {
          report.no_match_ig_tiktok_youtube.push({ topic: post.topic_id, sns: post.target_sns });
        }
      } else if (["x", "threads"].includes(post.target_sns)) {
        if (MANUAL_RECORD_CONFIRMED_TOPICS.has(post.topic_id)) {
          await pool.query(
            `UPDATE sns.posts SET is_historical = true, historical_confirmed = 'manual_record' WHERE id = $1;`,
            [post.id]
          );
          report.manual_record.push({ topic: post.topic_id, sns: post.target_sns });
        } else {
          report.unconfirmed_x_threads.push({ topic: post.topic_id, sns: post.target_sns });
        }
      }
    }

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
