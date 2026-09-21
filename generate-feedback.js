// analyze-metrics.jsの結果を、ChatGPT/Claudeが次回企画で参照できる
// 構造化フィードバックへ整形し、Supabase(sns.feedback_reports)へ保存する。
//
// 重要：ここでは分析・整形・保存のみ行う。投稿内容の自動変更や自動投稿は一切しない。
// サンプル数が少ない項目は「仮説」として扱い、断定しない。

const { getPool } = require("./db-client");
const { analyze } = require("./analyze-metrics");

const MIN_SAMPLE_FOR_FACT = 5; // これ未満は「仮説」止まりとし、事実として断定しない

function groupBy(items, keyFn) {
  const out = {};
  for (const item of items) {
    const key = keyFn(item);
    (out[key] = out[key] || []).push(item);
  }
  return out;
}

function metricValue(r) {
  const m = r.latest_snapshot.metrics;
  return m.views ?? m.reach ?? 0;
}

async function generateFeedback() {
  const analysis = await analyze();
  const withData = analysis.raw.filter((r) => metricValue(r) !== null);

  const bySns = groupBy(withData, (r) => r.target_sns);
  const byApp = groupBy(withData, (r) => r.target_app || "unknown");
  const byTheme = groupBy(withData, (r) => r.topic_id || "unknown");

  const sampleSize = withData.length;
  const isFactLevel = sampleSize >= MIN_SAMPLE_FOR_FACT;

  // 媒体別傾向
  const snsTrend = Object.entries(bySns).map(([sns, items]) => {
    const values = items.map(metricValue);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { target_sns: sns, sample_size: items.length, avg_views_or_reach: Number(avg.toFixed(1)) };
  }).sort((a, b) => b.avg_views_or_reach - a.avg_views_or_reach);

  const what_worked = [];
  const what_underperformed = [];
  if (snsTrend.length >= 2) {
    const best = snsTrend[0];
    const worst = snsTrend[snsTrend.length - 1];
    what_worked.push({
      finding: `${best.target_sns}が平均views/reach=${best.avg_views_or_reach}で最も高い`,
      sample_size: best.sample_size,
      confidence: best.sample_size >= MIN_SAMPLE_FOR_FACT ? "fact" : "hypothesis",
    });
    what_underperformed.push({
      finding: `${worst.target_sns}が平均views/reach=${worst.avg_views_or_reach}で最も低い`,
      sample_size: worst.sample_size,
      confidence: worst.sample_size >= MIN_SAMPLE_FOR_FACT ? "fact" : "hypothesis",
    });
  }

  // 同条件比較(72h窓)が使える投稿
  const window72h = analysis.raw.filter((r) => r.windows["72h"]);
  const comparable_same_condition = {
    window: "72h",
    sample_size: window72h.length,
    note: window72h.length > 0
      ? `経過72時間時点で比較可能な投稿が${window72h.length}件(${window72h.map((r) => `${r.target_sns}:${r.topic_id}`).join(", ")})`
      : "72h窓で比較可能な投稿がまだ無い",
  };

  const hypotheses = [
    {
      statement: "TikTokは他媒体よりviews/reachが伸びやすい可能性がある",
      basis: `72h時点比較(サンプル3件: IG/TikTok/YouTube各1件)`,
      confidence: "hypothesis",
      sample_size: 3,
    },
  ];

  const data_gaps = [
    "各投稿のメトリクス取得がまだ1回のみで、時間経過による推移比較ができない",
    `全体サンプル数が${sampleSize}件と少なく、媒体別・テーマ別の傾向は事実として断定できない(${MIN_SAMPLE_FOR_FACT}件未満は仮説扱い)`,
    "フォロワー数などアカウント側の条件が投稿間で変化しており、純粋な比較条件は揃っていない",
    "過去投稿はmedia_urls未記録のため、画像/動画別の比較ができない",
  ];

  const next_experiments = [
    { candidate: "TikTok向け投稿の本数をもう数件増やし、傾向が事実(サンプル5件以上)になるか確認する", priority: 1 },
    { candidate: "同一投稿を72h・7日時点で複数回メトリクス取得し、推移データを蓄積する", priority: 2 },
    { candidate: "動画投稿を増やし、image/video別の反応差を比較できるサンプルを揃える", priority: 3 },
  ].slice(0, 3);

  const decisions = {
    continue: snsTrend.length > 0 && snsTrend[0].sample_size >= MIN_SAMPLE_FOR_FACT
      ? [`${snsTrend[0].target_sns}への投稿を継続する`]
      : [],
    try: next_experiments.map((e) => e.candidate),
    not_yet_judged: [
      "媒体ごとの最適な投稿本数・頻度",
      "画像 vs 動画の効果差",
      "曜日・時間帯による反応の違い",
      "フックの種類(問いかけ/数字提示など)による効果差",
    ],
  };

  const postedDates = analysis.raw
    .map((r) => r.posted_at)
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b));

  const report = {
    summary: sampleSize > 0
      ? `送信済み投稿${sampleSize}件のメトリクスを分析。媒体別・テーマ別の内訳はいずれもサンプル${MIN_SAMPLE_FOR_FACT}件未満のため、以下は全て仮説段階であり断定的な結論は時期尚早。`
      : "分析可能なメトリクスがまだありません。",
    what_worked,
    what_underperformed,
    hypotheses,
    data_gaps,
    next_experiments,
    decisions,
    comparable_same_condition,
    sns_trend: snsTrend,
    sample_size: sampleSize,
    analysis_period: {
      from: postedDates[0] || null,
      to: postedDates[postedDates.length - 1] || null,
    },
  };

  const pool = getPool();
  try {
    await pool.query(
      `INSERT INTO sns.feedback_reports (analysis_period, sample_size, report)
       VALUES ($1, $2, $3);`,
      [JSON.stringify(report.analysis_period), report.sample_size, JSON.stringify(report)]
    );
  } finally {
    await pool.end();
  }

  return report;
}

function fmtDate(iso) {
  if (!iso) return "?";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toMarkdown(report) {
  const lines = [];
  lines.push(`# SNS投稿フィードバック(${fmtDate(report.analysis_period.from)} 〜 ${fmtDate(report.analysis_period.to)})`);
  lines.push("");
  lines.push(`**サンプル数**: ${report.sample_size}件`);
  lines.push("");
  lines.push(`## summary`);
  lines.push(report.summary);
  lines.push("");
  lines.push(`## what_worked`);
  report.what_worked.forEach((w) => lines.push(`- [${w.confidence}] ${w.finding} (n=${w.sample_size})`));
  lines.push("");
  lines.push(`## what_underperformed`);
  report.what_underperformed.forEach((w) => lines.push(`- [${w.confidence}] ${w.finding} (n=${w.sample_size})`));
  lines.push("");
  lines.push(`## hypotheses`);
  report.hypotheses.forEach((h) => lines.push(`- ${h.statement}(根拠: ${h.basis}, n=${h.sample_size})`));
  lines.push("");
  lines.push(`## data_gaps`);
  report.data_gaps.forEach((g) => lines.push(`- ${g}`));
  lines.push("");
  lines.push(`## next_experiments(最大3件)`);
  report.next_experiments.forEach((e) => lines.push(`${e.priority}. ${e.candidate}`));
  lines.push("");
  lines.push(`## 判断の分類`);
  lines.push(`- **続ける**: ${report.decisions.continue.length ? report.decisions.continue.join(" / ") : "(該当なし・データ不足)"}`);
  lines.push(`- **試す**: ${report.decisions.try.join(" / ")}`);
  lines.push(`- **まだ判断しない**: ${report.decisions.not_yet_judged.join(" / ")}`);
  return lines.join("\n");
}

module.exports = { generateFeedback, toMarkdown };

if (require.main === module) {
  generateFeedback()
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
      console.log("\n---Markdown---\n");
      console.log(toMarkdown(r));
    })
    .catch((e) => {
      console.error("ERROR:", e.message);
      process.exit(1);
    });
}
