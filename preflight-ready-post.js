// 指定した未来のready投稿1件だけを、Cron本体と同じ処理でdry-runする。
// --liveを受け付けず、予定時刻を過ぎた投稿や他の投稿には触れない。
const { getPool } = require("./db-client");
const { processOne } = require("./cron-engine");

async function preflightReadyPost(postId) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId || "")) {
    throw new Error("有効な投稿IDを1件指定してください");
  }

  const pool = getPool();
  const client = await pool.connect();
  let inTransaction = false;
  try {
    await client.query("BEGIN");
    inTransaction = true;
    const { rows } = await client.query("SELECT * FROM sns.posts WHERE id = $1 FOR UPDATE", [postId]);
    const post = rows[0];
    if (!post || post.status !== "ready" || post.is_historical || post.external_post_id || post.claimed_at ||
        !post.scheduled_at || new Date(post.scheduled_at) <= new Date()) {
      throw new Error("未来の未投稿ready投稿1件だけを指定してください");
    }
    const result = await processOne(client, post, { dryRun: true });
    await client.query("COMMIT");
    inTransaction = false;
    return result;
  } catch (error) {
    if (inTransaction) await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

module.exports = { preflightReadyPost };

if (require.main === module) {
  if (process.argv.length !== 3 || process.argv.includes("--live")) {
    console.error("使い方: node preflight-ready-post.js <post_id>");
    process.exit(1);
  }
  preflightReadyPost(process.argv[2])
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error("ERROR:", error.message);
      process.exit(1);
    });
}
