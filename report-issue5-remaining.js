// Issue #5 残り111件のレビュー用記録。DBの本文と個別制作案が一致するときだけ書き出す。
const fs = require("node:fs");
const path = require("node:path");
const { getPool } = require("./db-client");
const { keyFor } = require("./apply-first-week-content");
const { prepareRemaining } = require("./apply-issue5-remaining");
const { REMAINING } = require("./remaining-content");
const { renderPlan } = require("./report-first-week");

async function reportRemaining({ write = false } = {}) {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `SELECT id, topic_id, target_sns, title, body_text, scheduled_at, status, readiness_state,
              media_urls, is_publishable, feature_published, is_historical
       FROM sns.posts
       WHERE topic_id LIKE 'cal-%' AND scheduled_at >= $1 AND scheduled_at < $2
       ORDER BY scheduled_at, target_sns;`,
      ["2026-10-01T00:00:00+09:00", "2026-10-25T00:00:00+09:00"]
    );
    const pending = prepareRemaining(rows);
    if (pending.length) throw new Error(`DB本文と投稿案に未反映の差分が${pending.length}件あります`);
    const bySns = {};
    const byReadiness = {};
    const uniqueBodies = new Set();
    let planCount = 0;
    for (const row of rows) {
      bySns[row.target_sns] = (bySns[row.target_sns] || 0) + 1;
      byReadiness[row.readiness_state] = (byReadiness[row.readiness_state] || 0) + 1;
      const bodyKey = `${row.target_sns}\0${row.body_text}`;
      if (uniqueBodies.has(bodyKey)) throw new Error(`同一媒体の本文が重複しています: ${keyFor(row)}`);
      uniqueBodies.add(bodyKey);
      const [date, sns] = keyFor(row).split(":");
      if (REMAINING[date][sns].plan) planCount++;
    }
    const lines = [
      "# Issue #5: 残り111件の本文・素材構成・準備状態",
      "",
      "- 対象: 2026-10-01〜10-24（日本時間）の既存 `cal-` 投稿111件。",
      "- 全111件は `draft` のまま。`readiness_state`、予定日時、公開可否は変更していない。",
      "- 画像・動画は未制作。以下は実制作前の構成案で、実画面の項目と数値は制作時に照合する。",
      "- 同一媒体の本文重複: 0件。既存cron・Buffer・Threadsの本番投稿経路は変更していない。",
      `- 媒体別: ${Object.entries(bySns).map(([sns, n]) => `${sns} ${n}件`).join("／")}。`,
      `- 準備状態別: ${Object.entries(byReadiness).map(([state, n]) => `${state} ${n}件`).join("／")}。個別制作案・記事構成: ${planCount}件。`,
      "",
    ];
    for (const row of rows) {
      const key = keyFor(row);
      const [date, sns] = key.split(":");
      const time = new Date(new Date(row.scheduled_at).getTime() + 9 * 3600_000).toISOString().slice(11, 16);
      const plan = REMAINING[date][sns].plan;
      lines.push(`## ${date} ${time} ${sns} — ${row.topic_id}`, "",
        `- 状態: \`${row.status}\` / 準備状態: \`${row.readiness_state}\` / 素材URL: ${row.media_urls.length}件`,
        `- タイトル: ${row.title}`, "", "### 本文", "", row.body_text, "", "### 制作案", "", renderPlan(plan), "");
    }
    const report = lines.join("\n");
    if (write) fs.writeFileSync(path.join(__dirname, "stage11-issue5-remaining.md"), report, "utf8");
    return { count: rows.length, bySns, byReadiness, planCount, report };
  } finally {
    await pool.end();
  }
}

module.exports = { reportRemaining };

if (require.main === module) {
  reportRemaining({ write: process.argv.includes("--write") })
    .then(({ count, bySns, byReadiness, planCount }) => console.log(JSON.stringify({ count, bySns, byReadiness, planCount })))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
