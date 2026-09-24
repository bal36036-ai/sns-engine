// Issue #5 の再レビューで本文が変わった5件だけをDBへ反映する。
// 13件の修正のうち残る8件は制作案だけ。--apply なしでは読み取りのみ。
const crypto = require("node:crypto");
const { getPool } = require("./db-client");
const { FIRST_WEEK } = require("./first-week-content");
const { keyFor } = require("./apply-first-week-content");

const FROM = "2026-09-24T00:00:00+09:00";
const THROUGH = "2026-10-01T00:00:00+09:00";
// 2026-09-24 の初回レビュー対象（6dbeaa5）の本文 SHA-256。
const PREVIOUS_BODY_HASHES = Object.freeze({
  "2026-09-24:instagram": "69b485e55b2708c7d9f59e0331d08db838760fc4a33f5833f0cedb7eceda1f2a",
  "2026-09-25:youtube": "6fab5bbc316ccbae6868db2a0ffd8f93434570cab3a931922119862c4ee45f2b",
  "2026-09-27:threads": "20049b404f4440b7300ae47f53b79b8facbb791be7d64fb7ec14d0127306ee18",
  "2026-09-29:x": "2c6dc522a33464b5e695de117b53eacafa104d3b239e0b4c2179c5b2c806da31",
  "2026-09-29:instagram": "54743d8a45403265d193d737c36eaf1e3ad3db117c713db0c273b0caf8b3f78e",
});

function hash(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function prepareReview(rows) {
  const expectedKeys = Object.entries(FIRST_WEEK).flatMap(([date, items]) => Object.keys(items).map((sns) => `${date}:${sns}`));
  if (expectedKeys.length !== 31 || new Set(expectedKeys).size !== 31 || rows.length !== 31) {
    throw new Error("対象31件と文案31件がそろっていません");
  }
  const changes = [];
  const seen = new Set();
  for (const row of rows) {
    const key = keyFor(row);
    if (!expectedKeys.includes(key) || seen.has(key)) throw new Error(`${key}: 投稿キーが一致しません`);
    seen.add(key);
    const [date, sns] = key.split(":");
    const suffix = sns === "threads_b" ? "b" : "a";
    if (row.topic_id !== `cal-${date.replaceAll("-", "")}-${suffix}`) throw new Error(`${key}: 投稿IDが一致しません`);
    if (row.status !== "draft" || row.is_historical || row.is_publishable || row.feature_published || !Array.isArray(row.media_urls) || row.media_urls.length) {
      throw new Error(`${key}: 下書き・公開・素材の安全条件が変わっています`);
    }
    const target = FIRST_WEEK[date][sns].bodyText;
    if (row.body_text === target) continue;
    if (hash(row.body_text) !== PREVIOUS_BODY_HASHES[key]) throw new Error(`${key}: 想定外の本文のため上書きしません`);
    changes.push({ row, key, target });
  }
  return changes;
}

async function applyIssue5Review({ apply = false } = {}) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    if (apply) await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    const { rows } = await client.query(
      `SELECT id, topic_id, target_sns, body_text, scheduled_at, status, readiness_state,
              media_urls, is_publishable, feature_published, is_historical
       FROM sns.posts
       WHERE topic_id LIKE 'cal-%' AND scheduled_at >= $1 AND scheduled_at < $2
       ORDER BY scheduled_at, target_sns ${apply ? "FOR UPDATE" : ""};`,
      [FROM, THROUGH]
    );
    const changes = prepareReview(rows);
    if (apply) {
      for (const { row, key, target } of changes) {
        const duplicate = await client.query(
          `SELECT id FROM sns.posts WHERE target_sns = $1 AND md5(body_text) = md5($2) AND id <> $3 LIMIT 1;`,
          [row.target_sns, target, row.id]
        );
        if (duplicate.rows.length) throw new Error(`${key}: 同一媒体の本文が重複します`);
        const updated = await client.query(
          `UPDATE sns.posts SET body_text = $2
           WHERE id = $1 AND status = 'draft' AND readiness_state = $4 AND body_text = $3
             AND is_publishable = false AND feature_published = false
           RETURNING id, status, readiness_state, is_publishable, feature_published;`,
          [row.id, target, row.body_text, row.readiness_state]
        );
        const after = updated.rows[0];
        if (!after || after.status !== "draft" || after.readiness_state !== row.readiness_state || after.is_publishable || after.feature_published) {
          throw new Error(`${key}: 更新後の状態が一致しません`);
        }
      }
      await client.query("COMMIT");
    }
    return { mode: apply ? "apply" : "dry-run", target: rows.length, bodyChanges: changes.length, unchangedBodies: rows.length - changes.length };
  } catch (error) {
    if (apply) await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

module.exports = { prepareReview, applyIssue5Review, PREVIOUS_BODY_HASHES };

if (require.main === module) {
  applyIssue5Review({ apply: process.argv.includes("--apply") })
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
