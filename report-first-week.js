// Issue #5 のレビュー用記録を、DBの実状態と編集済み文案から生成する。
const fs = require("fs");
const path = require("path");
const { getPool } = require("./db-client");
const { FIRST_WEEK } = require("./first-week-content");
const { prepare, keyFor } = require("./apply-first-week-content");

function renderPlan(plan) {
  if (!plan) return "素材案: 文章単体";
  const lines = [`素材案: ${plan.kind || "下書き"}`];
  if (plan.mediaStatus) lines.push(`素材制作状態: ${plan.mediaStatus}`);
  if (plan.candidateScreens?.length) lines.push(`使用候補画面: ${plan.candidateScreens.join("／")}`);
  if (plan.slides?.length) {
    lines.push(`画像構成: ${plan.slides.length}枚`);
    lines.push(...plan.slides.map((line, index) => `- ${index === plan.slides.length - 1 ? "最終" : `${index + 1}枚目`}: ${line}`));
  }
  if (plan.video?.length) lines.push(...plan.video.map((line) => `- ${line}`));
  if (plan.sections?.length) lines.push(...plan.sections.map((line) => `- ${line}`));
  if (plan.note) lines.push(`制作時の確認: ${plan.note}`);
  return lines.join("\n");
}

async function reportFirstWeek({ write = false } = {}) {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `SELECT id, topic_id, target_sns, title, body_text, scheduled_at, status, readiness_state,
              media_urls, is_publishable, feature_published, is_historical
       FROM sns.posts
       WHERE topic_id LIKE 'cal-%' AND scheduled_at >= $1 AND scheduled_at < $2
       ORDER BY scheduled_at, target_sns;`,
      ["2026-09-24T00:00:00+09:00", "2026-10-01T00:00:00+09:00"]
    );
    prepare(rows);
    const lines = [
      "# Issue #5: 直近7日分の本文・素材設計・準備状態",
      "",
      "- 対象: 2026-09-24〜09-30（日本時間）、既存の `cal-` 投稿31件",
      "- 本文は下書き。画像・動画・画面内の数値は制作前に実画面と照合する。",
      "- `status`、`readiness_state`、公開可否、予定日時は変更しない。対象期間外は未編集・未承認。",
      "- 制作案は投稿キーに結び付けてこの記録と `first-week-content.js` に保存する。SNSへ送る本文には混ぜない。",
      "- 監査時の全142件は下書きで、114件に「開発中です」が含まれていた。今回の31件は本文を修正し、その語句は0件になった。",
      "- 残りの既存111件（10/1〜10/24）は本文・状態とも未変更。10/1〜10/23の23日分に加え、30日先の補充対象として10/24分も含む。",
      "",
    ];
    for (const row of rows) {
      const key = keyFor(row);
      const [date, sns] = key.split(":");
      const plan = FIRST_WEEK[date][sns].plan;
      const time = new Date(new Date(row.scheduled_at).getTime() + 9 * 3600_000).toISOString().slice(11, 16);
      lines.push(`## ${date} ${time} ${sns} — ${row.topic_id}`);
      lines.push("");
      lines.push(`- 状態: \`${row.status}\` / 準備状態: \`${row.readiness_state}\` / 素材URL: ${row.media_urls.length}件`);
      lines.push(`- タイトル: ${row.title}`);
      lines.push("");
      lines.push("### 本文");
      lines.push("");
      lines.push(row.body_text);
      lines.push("");
      lines.push("### 制作案");
      lines.push("");
      lines.push(renderPlan(plan));
      lines.push("");
    }
    const report = lines.join("\n");
    if (write) fs.writeFileSync(path.join(__dirname, "stage10-issue5-first-week.md"), report, "utf8");
    return { count: rows.length, report };
  } finally {
    await pool.end();
  }
}

module.exports = { reportFirstWeek, renderPlan };

if (require.main === module) {
  reportFirstWeek({ write: process.argv.includes("--write") })
    .then(({ count }) => console.log(JSON.stringify({ count, file: process.argv.includes("--write") ? "stage10-issue5-first-week.md" : null })))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
