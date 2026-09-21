// 投稿後メトリクスと投稿属性を突き合わせ、ChatGPT/Claudeが次の企画に使える形へ構造化する。
// 重要：ここでは分析結果を出すだけ。投稿内容の自動変更・自動投稿は一切行わない。
//
// 比較条件を揃えるため、「投稿からの経過時間」が近いスナップショットだけを
// 24h/72h/7日の各窓に割り当てて比較する(フォロワー数・経過時間が違う生数値を単純比較しない)。

const { getPool } = require("./db-client");

const WINDOWS = [
  { label: "24h", hours: 24, tolerance: 12 },
  { label: "72h", hours: 72, tolerance: 24 },
  { label: "7d", hours: 168, tolerance: 36 },
];

function dayOfWeekJa(date) {
  return ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
}

function timeSlot(date) {
  const h = date.getHours();
  if (h < 10) return "朝(〜10時)";
  if (h < 15) return "昼(10-15時)";
  if (h < 20) return "夕方〜夜(15-20時)";
  return "夜間(20時〜)";
}

function mediaType(mediaUrls) {
  if (!mediaUrls || mediaUrls.length === 0) return "none";
  return mediaUrls.some((u) => /\.(mp4|mov|webm)(\?|$)/i.test(u)) ? "video" : "image";
}

function hookType(bodyText) {
  const firstLine = (bodyText || "").split("\n")[0].trim();
  if (/[?？]/.test(firstLine)) return "question(問いかけ)";
  if (/^\d/.test(firstLine)) return "stat(数字提示)";
  if (/^「/.test(firstLine)) return "quote_style(会話引用風)";
  return "other(その他)";
}

async function analyze() {
  const pool = getPool();
  try {
    const { rows: posts } = await pool.query(
      `SELECT id, topic_id, target_app, target_sns, body_text, media_urls,
              COALESCE(matched_posted_at, (post_result->>'sentAt')::timestamptz) AS posted_at
       FROM sns.posts
       WHERE COALESCE(matched_external_post_id, external_post_id) IS NOT NULL;`
    );

    const results = [];
    for (const post of posts) {
      const { rows: snapshots } = await pool.query(
        `SELECT fetched_at, hours_since_post, metrics FROM sns.post_metrics
         WHERE post_id = $1 ORDER BY fetched_at;`,
        [post.id]
      );
      if (snapshots.length === 0) continue;

      const windowData = {};
      for (const w of WINDOWS) {
        const candidate = snapshots
          .filter((s) => s.hours_since_post !== null && Math.abs(s.hours_since_post - w.hours) <= w.tolerance)
          .sort((a, b) => Math.abs(a.hours_since_post - w.hours) - Math.abs(b.hours_since_post - w.hours))[0];
        windowData[w.label] = candidate ? { hours_since_post: Number(candidate.hours_since_post).toFixed(1), metrics: candidate.metrics } : null;
      }

      results.push({
        post_id: post.id,
        topic_id: post.topic_id,
        target_app: post.target_app,
        target_sns: post.target_sns,
        posted_at: post.posted_at,
        day_of_week: post.posted_at ? dayOfWeekJa(new Date(post.posted_at)) : null,
        time_slot: post.posted_at ? timeSlot(new Date(post.posted_at)) : null,
        media_type: mediaType(post.media_urls),
        body_length: (post.body_text || "").length,
        hook_type: hookType(post.body_text),
        latest_snapshot: snapshots[snapshots.length - 1],
        snapshot_count: snapshots.length,
        windows: windowData,
      });
    }

    // --- 構造化サマリー(仮説段階であることを明示) ---
    const withData = results.filter((r) => r.latest_snapshot.metrics.views !== null || r.latest_snapshot.metrics.reach !== null);
    const summary = {
      total_posts_analyzed: results.length,
      posts_with_usable_metrics: withData.length,
      grew_well: [],
      grew_weakly: [],
      hypotheses: [],
      insufficient_data: [],
      next_things_to_try: [],
      raw: results,
    };

    // 単純な閾値ではなく、同一媒体内での相対比較のみ行う(フォロワー数等の条件が揃っていないため断定はしない)
    const byService = {};
    for (const r of withData) {
      const v = r.latest_snapshot.metrics.views || r.latest_snapshot.metrics.reach || 0;
      byService[r.target_sns] = byService[r.target_sns] || [];
      byService[r.target_sns].push({ topic: r.topic_id, value: v, hours: r.latest_snapshot.hours_since_post });
    }
    for (const [service, items] of Object.entries(byService)) {
      items.sort((a, b) => b.value - a.value);
      if (items.length >= 2) {
        summary.grew_well.push(`${service}: ${items[0].topic}(views/reach=${items[0].value}, 経過${Number(items[0].hours).toFixed(0)}h)が同媒体内で最も反応が多い`);
        summary.grew_weakly.push(`${service}: ${items[items.length - 1].topic}(views/reach=${items[items.length - 1].value}, 経過${Number(items[items.length - 1].hours).toFixed(0)}h)が同媒体内で最も反応が少ない`);
      }
    }

    summary.hypotheses.push(
      "TikTokは他媒体よりview数が伸びやすい傾向が見える(件数はまだ少ない・要継続観測)",
      "投稿間隔が空いた期間の直後は反応が小さい傾向が過去の運用メモでも指摘されている(本分析でも同じ投稿群のため追試が必要)"
    );

    summary.insufficient_data.push(
      "現時点では1投稿につきメトリクス取得が1回のみのため、時間経過による『推移』はまだ比較できない(継続収集が必要)",
      "24h/72h/7日の同一経過時間での横並び比較は、サンプル数が少なく(6件)統計的な結論を出すには不十分",
      "フォロワー数・アカウント成長度合いが投稿間で変化しているため、単純な数値比較は条件が完全には揃っていない",
      "TikTok/YouTubeでimpressions・likes・saves等、取得できない指標が多い(Buffer側の提供範囲の制約)"
    );

    summary.next_things_to_try.push(
      "定期的にfetch-metrics.jsを実行し、同一投稿で複数時点のデータを蓄積してから推移比較を行う",
      "投稿本数が増えてから媒体別・時間帯別の傾向を再評価する",
      "動画コンテンツを増やし、image vs videoの反応差を件数を揃えて比較する"
    );

    return summary;
  } finally {
    await pool.end();
  }
}

module.exports = { analyze };

if (require.main === module) {
  analyze()
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => {
      console.error("ERROR:", e.message);
      process.exit(1);
    });
}
