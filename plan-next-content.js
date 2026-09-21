// 「次に何のSNS企画を進めるべきか」を自動判断する。
// 開発状況(未投稿候補のreadiness) + 最新フィードバック(分析結果) を突き合わせ、
// 最大3件の企画候補(または素材制作Task)を提示する。
//
// 重要：ここでは候補の提示までしか行わない。本文自動生成・本番投稿は一切しない。
// 呼び出し側(ChatGPT/Claudeとの会話の冒頭など)がこのスクリプトを実行すれば、
// 「前回の分析を見て」と毎回頼まなくても、最新状況を踏まえた提案ができる状態にする。

const { getPool } = require("./db-client");
const { getLatestFeedback } = require("./get-latest-feedback");

const MIN_SAMPLE_FOR_FACT = 5;
const MAX_CANDIDATES = 3;

async function planNextContent() {
  const pool = getPool();
  let candidatesRaw, recentHistory;
  try {
    // 未投稿候補(履歴データ・未公開機能は除外。投稿経路未接続=waiting_channelも自動投稿対象外のため除外)
    const { rows } = await pool.query(
      `SELECT id, topic_id, target_app, target_sns, title, body_text, media_urls,
              scheduled_at, readiness_state, is_publishable, feature_published
       FROM sns.posts
       WHERE status = 'draft'
         AND is_historical = false
         AND feature_published = true
         AND readiness_state != 'waiting_channel'
       ORDER BY topic_id, target_sns;`
    );
    candidatesRaw = rows;

    // 直近の投稿履歴(テーマ重複確認・投稿間隔確認用)
    const { rows: history } = await pool.query(
      `SELECT topic_id, target_app, target_sns,
              COALESCE(matched_posted_at, (post_result->>'sentAt')::timestamptz) AS posted_at
       FROM sns.posts
       WHERE COALESCE(matched_external_post_id, external_post_id) IS NOT NULL
       ORDER BY posted_at DESC;`
    );
    recentHistory = history;
  } finally {
    await pool.end();
  }

  const feedbackRow = await getLatestFeedback();
  const feedback = feedbackRow ? feedbackRow.report : null;

  // --- 直近の投稿間隔 ---
  const lastPostedAt = recentHistory[0] ? new Date(recentHistory[0].posted_at) : null;
  const hoursSinceLastPost = lastPostedAt ? (Date.now() - lastPostedAt) / 1000 / 3600 : null;
  const postingGapWarning = hoursSinceLastPost !== null && hoursSinceLastPost > 96
    ? `前回投稿から${Math.round(hoursSinceLastPost / 24)}日経過。間隔が空くと反応が落ちる傾向が過去に指摘されているため、早めの投稿を優先。`
    : null;

  // --- テーマ重複確認 ---
  const recentTopics = new Set(recentHistory.slice(0, 10).map((h) => h.topic_id));

  // --- サンプル不足の媒体(特定媒体への偏り防止) ---
  const underSampledSns = new Set();
  if (feedback && feedback.sns_trend) {
    for (const t of feedback.sns_trend) {
      if (t.sample_size < MIN_SAMPLE_FOR_FACT) underSampledSns.add(t.target_sns);
    }
  }

  // --- テーマ単位にまとめる(素材不足の同一テーマ・複数媒体は1つの素材制作Taskにまとめる) ---
  const byTopic = {};
  for (const c of candidatesRaw) {
    (byTopic[c.topic_id] = byTopic[c.topic_id] || []).push(c);
  }

  const candidates = [];

  for (const [topicId, items] of Object.entries(byTopic)) {
    const isDuplicateTheme = recentTopics.has(topicId);
    const allWaitingMedia = items.every((i) => i.readiness_state === "waiting_media");
    const someWaitingSchedule = items.some((i) => i.readiness_state === "waiting_schedule");

    if (allWaitingMedia) {
      // 素材不足 → 素材制作Taskとして切り出す(1テーマ=1エントリにまとめる)
      candidates.push({
        type: "material_task",
        target_app: items[0].target_app,
        target_sns: items.map((i) => i.target_sns),
        theme: topicId,
        why_now: "内容・公開可否は準備済みだが素材が無く、Buffer登録まで進められない状態。素材さえ揃えば自動で次工程(ready判定)へ進む設計のため、先に素材を用意する価値が高い。",
        relation_to_past_analysis: feedback
          ? `分析対象期間(${feedback.analysis_period.from ? feedback.analysis_period.from.slice(0, 10) : "?"}〜)のサンプルはまだ${feedback.sample_size}件と少なく、このテーマの投稿が増えれば傾向把握の材料が増える。`
          : "分析データがまだありません。",
        required_material: "各SNSの素材不足理由はreadinessに記載のとおり(画像/動画が未生成)",
        current_readiness: items.map((i) => `${i.target_sns}: ${i.readiness_state}`),
        next_action: "素材(画像/動画)を制作し、media_urlsを更新後、classify-readiness.jsを再実行",
        proposed_schedule: "素材完成後に決定(現時点では日時未定)",
        hypothesis_to_test: "素材投入から公開までの自動フローが実際に機能するかの実証も兼ねる",
        is_duplicate_theme: isDuplicateTheme,
        under_sampled_targets: items.filter((i) => underSampledSns.has(i.target_sns)).map((i) => i.target_sns),
      });
    } else if (someWaitingSchedule) {
      // 同じテーマ内に素材不足の媒体が残っていれば、取りこぼさず別途素材制作Taskとして提示
      const leftoverWaitingMedia = items.filter((i) => i.readiness_state === "waiting_media");
      if (leftoverWaitingMedia.length > 0) {
        candidates.push({
          type: "material_task",
          target_app: leftoverWaitingMedia[0].target_app,
          target_sns: leftoverWaitingMedia.map((i) => i.target_sns),
          theme: topicId,
          why_now: `同じテーマの他媒体は投稿準備が進んでいるが、この媒体だけ素材が無く取り残されている(例:静止画では投稿できない媒体で動画素材が未生成)。`,
          relation_to_past_analysis: feedback
            ? `サンプル${feedback.sample_size}件とまだ少なく、この媒体の投稿が増えれば傾向把握の材料が増える。`
            : "分析データがまだありません。",
          required_material: "画像/動画が未生成(readiness参照)",
          current_readiness: leftoverWaitingMedia.map((i) => `${i.target_sns}: ${i.readiness_state}`),
          next_action: "素材を制作し、media_urlsを更新後、classify-readiness.jsを再実行",
          proposed_schedule: "素材完成後に決定(現時点では日時未定)",
          hypothesis_to_test: "同一テーマ内で媒体ごとの素材有無が投稿タイミングのズレを生んでいないか",
          is_duplicate_theme: isDuplicateTheme,
          under_sampled_targets: leftoverWaitingMedia.filter((i) => underSampledSns.has(i.target_sns)).map((i) => i.target_sns),
        });
      }

      // 内容・素材は揃っているが日時未定 → 投稿企画候補として提示(媒体ごとに分ける)
      for (const item of items.filter((i) => i.readiness_state === "waiting_schedule")) {
        candidates.push({
          type: "content_plan",
          target_app: item.target_app,
          target_sns: item.target_sns,
          theme: topicId,
          why_now: underSampledSns.has(item.target_sns)
            ? `${item.target_sns}はまだサンプル数が少なく(統計的に未確定)、投稿を増やして傾向を確認する必要がある。next_experimentsの方針にも合致。`
            : "内容・素材・公開可否が揃っており、日時を決めるだけで投稿できる状態のため。",
          relation_to_past_analysis: feedback && feedback.next_experiments
            ? `直近フィードバックの次回候補「${feedback.next_experiments[0]?.candidate || ""}」と関連`
            : "分析データがまだありません。",
          required_material: "準備済み(追加の素材制作は不要)",
          current_readiness: item.readiness_state,
          next_action: "投稿日時を決定し、promote-to-ready.jsでready昇格 → dry-runで検知確認 → ばる承認後に本番登録",
          proposed_schedule: postingGapWarning ? "できるだけ早め(前回投稿からの間隔を空けないため)" : "次の通常投稿枠",
          hypothesis_to_test: feedback && feedback.hypotheses && feedback.hypotheses[0]
            ? feedback.hypotheses[0].statement
            : "仮説はまだ無し",
          is_duplicate_theme: isDuplicateTheme,
        });
      }
    }
  }

  // --- 優先順位付け：サンプル不足媒体を優先、重複テーマは減点、最大3件 ---
  candidates.sort((a, b) => {
    const aScore = (a.type === "content_plan" && underSampledSns.has(a.target_sns) ? 2 : 0) + (a.is_duplicate_theme ? -5 : 0) + (a.type === "material_task" ? 1 : 0);
    const bScore = (b.type === "content_plan" && underSampledSns.has(b.target_sns) ? 2 : 0) + (b.is_duplicate_theme ? -5 : 0) + (b.type === "material_task" ? 1 : 0);
    return bScore - aScore;
  });

  return {
    generated_at: new Date().toISOString(),
    posting_gap_warning: postingGapWarning,
    under_sampled_sns: Array.from(underSampledSns),
    feedback_used: feedback
      ? { generated_at: feedbackRow.generated_at, sample_size: feedback.sample_size, summary: feedback.summary }
      : null,
    candidates: candidates.slice(0, MAX_CANDIDATES),
    excluded_note: "投稿経路未接続(X/Threads)・未公開機能・履歴データは候補から自動的に除外しています。",
  };
}

module.exports = { planNextContent };

if (require.main === module) {
  planNextContent()
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => {
      console.error("ERROR:", e.message);
      process.exit(1);
    });
}
