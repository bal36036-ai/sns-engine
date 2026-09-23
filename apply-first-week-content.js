// Issue #5: 2026-09-24〜09-30 の既存 cal- 下書き本文だけを更新する。
// --apply が無い場合は読み取りと事前検査のみ。status/readiness/媒体/日時/履歴は変更しない。
const { getPool } = require("./db-client");
const { FIRST_WEEK } = require("./first-week-content");

const FROM = "2026-09-24T00:00:00+09:00";
const THROUGH = "2026-10-01T00:00:00+09:00";
const LEGACY_MARKER = /開発中です|よければ教えてください/;

function jstDate(value) {
  return new Date(new Date(value).getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}

function keyFor(post) {
  const sns = post.target_sns === "threads" && post.topic_id.endsWith("-b") ? "threads_b" : post.target_sns;
  return `${jstDate(post.scheduled_at)}:${sns}`;
}

function prepare(rows) {
  const expectedKeys = Object.entries(FIRST_WEEK).flatMap(([date, items]) => Object.keys(items).map((sns) => `${date}:${sns}`));
  if (expectedKeys.length !== 31 || new Set(expectedKeys).size !== 31) throw new Error("7日分の文案が31件そろっていません");
  if (rows.length !== 31) throw new Error(`DB対象件数が31件ではありません: ${rows.length}`);
  const keys = rows.map(keyFor);
  if (new Set(keys).size !== 31 || keys.some((key) => !expectedKeys.includes(key))) throw new Error("DB対象と文案の投稿キーが一致しません");
  const changes = [];
  for (const row of rows) {
    const key = keyFor(row);
    const [date, sns] = key.split(":");
    const content = FIRST_WEEK[date][sns];
    if (row.status !== "draft" || row.is_historical || row.is_publishable || row.feature_published || row.media_urls.length) {
      throw new Error(`${key}: 安全条件が変わったため更新しません`);
    }
    if (!content?.bodyText?.trim()) throw new Error(`${key}: 本文がありません`);
    if (["instagram", "tiktok", "youtube", "note"].includes(row.target_sns) && !content.plan) throw new Error(`${key}: 制作案がありません`);
    if (row.body_text === content.bodyText) continue;
    if (!LEGACY_MARKER.test(row.body_text)) throw new Error(`${key}: 既存本文が既に編集されているため上書きしません`);
    changes.push({ row, key, content });
  }
  return changes;
}

async function applyFirstWeek({ apply = false } = {}) {
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
    const changes = prepare(rows);
    if (apply) {
      for (const { row, key, content } of changes) {
        const duplicate = await client.query(
          `SELECT id FROM sns.posts WHERE target_sns = $1 AND md5(body_text) = md5($2) AND id <> $3 LIMIT 1;`,
          [row.target_sns, content.bodyText, row.id]
        );
        if (duplicate.rows.length) throw new Error(`${key}: 同一媒体の本文重複があるため中止`);
        const updated = await client.query(
          `UPDATE sns.posts SET body_text = $2
           WHERE id = $1 AND status = 'draft' AND body_text = $3
           RETURNING id, status, readiness_state, is_publishable, feature_published;`,
          [row.id, content.bodyText, row.body_text]
        );
        const after = updated.rows[0];
        if (!after || after.status !== "draft" || after.readiness_state !== row.readiness_state || after.is_publishable || after.feature_published) {
          throw new Error(`${key}: 更新後の安全状態が一致しないため中止`);
        }
      }
      await client.query("COMMIT");
    }
    return { mode: apply ? "apply" : "dry-run", target: rows.length, changed: changes.length,
      unchanged: rows.length - changes.length, bySns: changes.reduce((acc, { row }) => {
        acc[row.target_sns] = (acc[row.target_sns] || 0) + 1;
        return acc;
      }, {}) };
  } catch (error) {
    if (apply) await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

module.exports = { applyFirstWeek, prepare, keyFor };

if (require.main === module) {
  applyFirstWeek({ apply: process.argv.includes("--apply") })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
