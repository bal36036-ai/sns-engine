// 本番自動投稿の受入テスト用監視スクリプト。
// 指定したtopic_id + target_snsについて、Supabase側の記録とBuffer側の実データを突き合わせ、
// ・Cronが処理した記録(claimed_by/claimed_at相当。post_resultのregisteredAt)
// ・Buffer post ID
// ・実際のSNS投稿URL(externalLink)
// ・Supabaseがsentへ正しく更新されたか
// ・同一テーマ/媒体でsent状態が2件以上無いか(二重投稿チェック)
// ・エラーの有無
// を1コマンドで確認できるようにする。読み取り専用、書き込みは一切しない。

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
        res.on("end", () => {
          try { resolve(JSON.parse(data)); } catch (e) { reject(new Error(data)); }
        });
      }
    );
    req.on("error", reject);
    req.write(payload, "utf8");
    req.end();
  });
}

async function auditLivePost(topicId, targetSns) {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `SELECT id, status, external_post_id, external_service, post_result, error_detail,
              scheduled_at, created_at, updated_at
       FROM sns.posts WHERE topic_id = $1 AND target_sns = $2;`,
      [topicId, targetSns]
    );
    if (rows.length === 0) return { found: false };
    const post = rows[0];

    // 二重投稿チェック：同一topic+targetSnsでsent状態が複数無いか(通常は1行のみのはずだが、念のため全体を確認)
    const { rows: dupCheck } = await pool.query(
      `SELECT count(*) AS sent_count FROM sns.posts WHERE topic_id = $1 AND target_sns = $2 AND status = 'sent';`,
      [topicId, targetSns]
    );

    let bufferDetail = null;
    if (post.external_post_id) {
      try {
        const { data } = await bufferGraphQL(
          `query($input: PostInput!) { post(input: $input) { id status externalLink sentAt createdAt } }`,
          { input: { id: post.external_post_id } }
        );
        bufferDetail = data.post;
      } catch (e) {
        bufferDetail = { error: e.message };
      }
    }

    return {
      found: true,
      supabase: {
        status: post.status,
        cron_registered_at: post.post_result ? post.post_result.registeredAt : null,
        external_post_id: post.external_post_id,
        external_service: post.external_service,
        error_detail: post.error_detail,
        scheduled_at: post.scheduled_at,
        updated_at: post.updated_at,
      },
      buffer: bufferDetail,
      duplicate_check: {
        sent_count_for_this_topic_and_sns: Number(dupCheck[0].sent_count),
        is_duplicate: Number(dupCheck[0].sent_count) > 1,
      },
    };
  } finally {
    await pool.end();
  }
}

module.exports = { auditLivePost };

if (require.main === module) {
  const [, , topicId, targetSns] = process.argv;
  if (!topicId || !targetSns) {
    console.error("使い方: node audit-live-post.js <topic_id> <target_sns>");
    process.exit(1);
  }
  auditLivePost(topicId, targetSns)
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => {
      console.error("ERROR:", e.message);
      process.exit(1);
    });
}
