// Issue #5: 10/1〜10/24の既存cal-下書き111件の本文だけを更新する。
// --apply が無ければ読み取りと事前検査のみ。状態・日時・公開可否・素材は変更しない。
const crypto = require("node:crypto");
const { getPool } = require("./db-client");
const { keyFor } = require("./apply-first-week-content");
const { REMAINING } = require("./remaining-content");
const baseline = require("./issue5-remaining-baseline.json");

const FROM = "2026-10-01T00:00:00+09:00";
const THROUGH = "2026-10-25T00:00:00+09:00";

function hash(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function expectedEntries() {
  const entries = Object.entries(REMAINING).flatMap(([date, items]) =>
    Object.entries(items).map(([sns, content]) => ({ key: `${date}:${sns}`, content }))
  );
  if (entries.length !== 111 || new Set(entries.map((item) => item.key)).size !== 111) {
    throw new Error("残り111件の投稿案が一意にそろっていません");
  }
  return entries;
}

function prepareRemaining(rows) {
  const entries = expectedEntries();
  const contentByKey = new Map(entries.map(({ key, content }) => [key, content]));
  const baselineByKey = new Map(baseline.items.map((item) => [item.key, item]));
  if (baseline.items.length !== 111 || baselineByKey.size !== 111 || rows.length !== 111) {
    throw new Error("DB・基準記録・投稿案が111件で一致しません");
  }
  const changes = [];
  const seen = new Set();
  const newBodyKeys = new Set();
  for (const row of rows) {
    const key = keyFor(row);
    if (seen.has(key)) throw new Error(`${key}: 投稿キーが重複しています`);
    seen.add(key);
    const base = baselineByKey.get(key);
    const content = contentByKey.get(key);
    if (!base || !content) throw new Error(`${key}: 基準記録または投稿案がありません`);
    if (String(row.id) !== String(base.id) || row.topic_id !== base.topicId || row.target_sns !== base.targetSns ||
        new Date(row.scheduled_at).toISOString() !== base.scheduledAt || row.status !== "draft" || row.status !== base.status ||
        row.readiness_state !== base.readinessState || row.is_historical !== false || base.isHistorical !== false ||
        row.is_publishable !== false || base.isPublishable !== false ||
        row.feature_published !== false || base.featurePublished !== false ||
        !Array.isArray(row.media_urls) || row.media_urls.length !== 0 || base.mediaCount !== 0) {
      throw new Error(`${key}: 既存投稿の状態・日時・公開可否が基準から変わっています`);
    }
    if (!content.bodyText?.trim() || content.bodyText.includes("開発中です")) {
      throw new Error(`${key}: 本文が未完成です`);
    }
    if (["instagram", "tiktok", "youtube", "note"].includes(row.target_sns) && !content.plan) {
      throw new Error(`${key}: 制作案または記事構成がありません`);
    }
    const bodyKey = `${row.target_sns}\0${content.bodyText}`;
    if (newBodyKeys.has(bodyKey)) throw new Error(`${key}: 同一媒体の新本文が重複しています`);
    newBodyKeys.add(bodyKey);
    if (row.body_text === content.bodyText) continue;
    if (hash(row.body_text) !== base.bodyHash) throw new Error(`${key}: 想定外の本文を上書きしません`);
    changes.push({ row, key, content });
  }
  return changes;
}

async function applyRemaining({ apply = false } = {}) {
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
    const changes = prepareRemaining(rows);
    if (apply) {
      for (const { row, key, content } of changes) {
        const duplicate = await client.query(
          `SELECT id FROM sns.posts WHERE target_sns = $1 AND md5(body_text) = md5($2) AND id <> $3 LIMIT 1;`,
          [row.target_sns, content.bodyText, row.id]
        );
        if (duplicate.rows.length) throw new Error(`${key}: 同一媒体に同文があるため中止します`);
        const updated = await client.query(
          `UPDATE sns.posts SET body_text = $2
           WHERE id = $1 AND body_text = $3 AND status = 'draft' AND readiness_state = $4
             AND is_publishable = false AND feature_published = false
           RETURNING id, status, readiness_state, is_publishable, feature_published;`,
          [row.id, content.bodyText, row.body_text, row.readiness_state]
        );
        const after = updated.rows[0];
        if (!after || after.status !== "draft" || after.readiness_state !== row.readiness_state || after.is_publishable || after.feature_published) {
          throw new Error(`${key}: 更新後の安全状態が一致しません`);
        }
      }
      await client.query("COMMIT");
    }
    const bySns = rows.reduce((acc, row) => {
      acc[row.target_sns] = (acc[row.target_sns] || 0) + 1;
      return acc;
    }, {});
    const productionPlans = entriesWithPlans();
    return { mode: apply ? "apply" : "dry-run", target: rows.length, changedBodies: changes.length,
      unchangedBodies: rows.length - changes.length, productionPlans, bySns };
  } catch (error) {
    if (apply) await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

function entriesWithPlans() {
  return expectedEntries().filter(({ content }) => content.plan).length;
}

module.exports = { applyRemaining, prepareRemaining, expectedEntries, hash };

if (require.main === module) {
  applyRemaining({ apply: process.argv.includes("--apply") })
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
