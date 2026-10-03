// 毎日の確認用（読み取りだけ）：投稿が止まっていないか。失敗・予定を過ぎても未投稿の投稿・準備完了の残り日数を表示する。
const { getPool } = require("./db-client");
const J = (s) => new Date(new Date(s).getTime() + 9 * 3600e3).toISOString().slice(5, 16).replace("T", " ");
(async () => {
  const pool = getPool();
  try {
    const failed = await pool.query("SELECT left(id::text,8) id, target_sns, scheduled_at, error_detail FROM sns.posts WHERE is_historical = false AND status = 'failed' ORDER BY scheduled_at DESC LIMIT 10");
    const late = await pool.query("SELECT left(id::text,8) id, target_sns, scheduled_at, status FROM sns.posts WHERE is_historical = false AND status IN ('ready','scheduled') AND scheduled_at < now() - interval '30 minutes' ORDER BY scheduled_at");
    const runway = await pool.query("SELECT target_sns, count(*)::int n, max(scheduled_at) last FROM sns.posts WHERE is_historical = false AND status = 'ready' GROUP BY 1 ORDER BY 1");
    const next = await pool.query("SELECT target_sns, scheduled_at FROM sns.posts WHERE is_historical = false AND status = 'ready' AND scheduled_at > now() ORDER BY scheduled_at LIMIT 3");
    const sent = await pool.query("SELECT count(*)::int n FROM sns.posts WHERE is_historical = false AND status = 'sent' AND scheduled_at > now() - interval '24 hours'");
    console.log(`投稿の健康チェック：失敗 ${failed.rows.length}件／予定を30分過ぎても未投稿 ${late.rows.length}件／直近24時間に投稿 ${sent.rows[0].n}件`);
    failed.rows.forEach((x) => console.log(`  失敗 ${x.id} ${x.target_sns} ${J(x.scheduled_at)} ${x.error_detail || ""}`));
    late.rows.forEach((x) => console.log(`  遅れ ${x.id} ${x.target_sns} ${J(x.scheduled_at)} ${x.status}`));
    console.log("準備完了の残り：" + runway.rows.map((x) => `${x.target_sns} ${x.n}件（〜${J(x.last).slice(0, 5)}）`).join("、"));
    console.log("次の投稿：" + next.rows.map((x) => `${J(x.scheduled_at)} ${x.target_sns}`).join("、"));
  } finally { await pool.end(); }
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
