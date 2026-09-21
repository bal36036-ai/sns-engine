// ChatGPT/Claudeが次回企画時に、最新の分析フィードバックを参照するための読み取り専用ヘルパー。
// 書き込みは行わない。

const { getPool } = require("./db-client");
const { toMarkdown } = require("./generate-feedback");

async function getLatestFeedback() {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `SELECT id, generated_at, sample_size, analysis_period, report
       FROM sns.feedback_reports ORDER BY generated_at DESC LIMIT 1;`
    );
    return rows[0] || null;
  } finally {
    await pool.end();
  }
}

module.exports = { getLatestFeedback };

if (require.main === module) {
  const asMarkdown = process.argv.includes("--md");
  getLatestFeedback()
    .then((row) => {
      if (!row) {
        console.log("フィードバックはまだありません。");
        return;
      }
      if (asMarkdown) {
        console.log(toMarkdown(row.report));
      } else {
        console.log(JSON.stringify(row.report, null, 2));
      }
    })
    .catch((e) => {
      console.error("ERROR:", e.message);
      process.exit(1);
    });
}
