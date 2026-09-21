// Buffer APIから投稿後メトリクスを取得し、Supabase(sns.post_metrics)へ履歴として保存する。
// 冪等設計：同じ投稿・同じ1時間バケットへの再取得は上書き(UPSERT)、重複行は作らない。
// エラー時は「その投稿だけスキップ」し、他の投稿の処理や既存データには影響しない。

const https = require("https");
const { getPool } = require("./db-client");

// Buffer側で取得しうる指標の一覧(存在しないものはnullで埋める。媒体差はここで吸収)
const CANONICAL_METRICS = [
  "views", "reach", "impressions", "likes", "comments", "shares", "saves",
  "reactions", "engagementRate", "clicks", "averageTimeWatched", "totalTimeWatched", "viewers",
];

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
          try {
            const parsed = JSON.parse(data);
            if (parsed.errors) return reject(new Error(JSON.stringify(parsed.errors)));
            resolve(parsed.data);
          } catch (e) {
            reject(new Error(`応答解析失敗: ${data}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(payload, "utf8");
    req.end();
  });
}

function normalizeMetrics(metricList) {
  const out = {};
  for (const key of CANONICAL_METRICS) out[key] = null;
  for (const m of metricList || []) {
    if (CANONICAL_METRICS.includes(m.type)) out[m.type] = m.value;
  }
  return out;
}

async function fetchOne(pool, post) {
  const externalPostId = post.matched_external_post_id || post.external_post_id;
  const postedAt = post.matched_posted_at || (post.post_result && (post.post_result.sentAt || post.post_result.registeredAt));

  const data = await bufferGraphQL(
    `query($input: PostInput!) { post(input: $input) { id metrics { type value unit } metricsUpdatedAt } }`,
    { input: { id: externalPostId } }
  );
  const p = data.post;
  const metrics = normalizeMetrics(p.metrics);
  const fetchedAt = new Date();
  const hoursSince = postedAt ? (fetchedAt - new Date(postedAt)) / 1000 / 3600 : null;
  const fetchedAtHour = new Date(fetchedAt);
  fetchedAtHour.setMinutes(0, 0, 0);

  await pool.query(
    `INSERT INTO sns.post_metrics (post_id, external_post_id, fetched_at, fetched_at_hour, hours_since_post, metrics, metrics_updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (post_id, fetched_at_hour)
     DO UPDATE SET metrics = EXCLUDED.metrics, hours_since_post = EXCLUDED.hours_since_post,
                    metrics_updated_at = EXCLUDED.metrics_updated_at, fetched_at = EXCLUDED.fetched_at;`,
    [post.id, externalPostId, fetchedAt.toISOString(), fetchedAtHour.toISOString(), hoursSince, JSON.stringify(metrics), p.metricsUpdatedAt]
  );

  return { post_id: post.id, external_post_id: externalPostId, hours_since_post: hoursSince, metrics };
}

async function fetchAllMetrics() {
  const pool = getPool();
  const report = { fetched: [], errors: [], skipped_no_id: 0 };
  try {
    const { rows } = await pool.query(
      `SELECT id, matched_external_post_id, matched_posted_at, external_post_id, post_result
       FROM sns.posts
       WHERE COALESCE(matched_external_post_id, external_post_id) IS NOT NULL;`
    );
    for (const post of rows) {
      const externalPostId = post.matched_external_post_id || post.external_post_id;
      if (!externalPostId) {
        report.skipped_no_id++;
        continue;
      }
      try {
        const r = await fetchOne(pool, post);
        report.fetched.push(r);
      } catch (e) {
        // 1件のエラーで処理全体を止めない。既存のpost_metrics行は変更しない。
        report.errors.push({ post_id: post.id, external_post_id: externalPostId, error: e.message });
      }
    }
  } finally {
    await pool.end();
  }
  return report;
}

module.exports = { fetchAllMetrics, normalizeMetrics, CANONICAL_METRICS };

if (require.main === module) {
  fetchAllMetrics()
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => {
      console.error("FATAL:", e.message);
      process.exit(1);
    });
}
