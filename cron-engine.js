// SNS運用エンジン Cron処理本体
// Cloudflare Cronから呼ばれる想定(現時点ではNode.jsで実行してdry-run検証)。
// 実行の流れ：
//   Supabase(sns.posts)から投稿対象を安全に確保(SELECT FOR UPDATE SKIP LOCKED)
//   → 安全ガード再確認(DBトリガーと二重チェック)
//   → Buffer側で重複チェック
//   → 素材URLの到達確認
//   → dry-runならここで停止、本番ならBuffer登録
//   → 結果をSupabaseへ書き戻し、ロックを解放

const https = require("https");
const { getPool } = require("./db-client");
const { findDuplicatePost, createPost, ORGANIZATION_ID } = require("./buffer-client");

const AUTOMATED_SNS = ["instagram", "tiktok", "youtube"]; // 現在自動化対象の3媒体のみ
const CLAIM_STALE_MINUTES = 10; // 前回実行が異常終了して残ったロックを再取得可能にするまでの時間

function headCheck(url) {
  return new Promise((resolve) => {
    try {
      const req = https.request(url, { method: "HEAD", timeout: 8000 }, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 400);
      });
      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    } catch {
      resolve(false);
    }
  });
}

async function claimCandidates(client, runId, limit) {
  const { rows } = await client.query(
    `SELECT id FROM sns.posts
     WHERE status IN ('ready', 'scheduled')
       AND (scheduled_at IS NULL OR scheduled_at <= now())
       AND (claimed_at IS NULL OR claimed_at < now() - interval '${CLAIM_STALE_MINUTES} minutes')
     ORDER BY created_at
     LIMIT $1
     FOR UPDATE SKIP LOCKED;`,
    [limit]
  );
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  await client.query(
    `UPDATE sns.posts SET claimed_at = now(), claimed_by = $2 WHERE id = ANY($1::uuid[]);`,
    [ids, runId]
  );
  const full = await client.query(
    `SELECT * FROM sns.posts WHERE id = ANY($1::uuid[]);`,
    [ids]
  );
  return full.rows;
}

async function releaseClaim(client, id) {
  await client.query(`UPDATE sns.posts SET claimed_at = NULL, claimed_by = NULL WHERE id = $1;`, [id]);
}

async function setStatus(client, id, status, extra = {}) {
  const fields = ["status = $2"];
  const values = [id, status];
  let i = 3;
  for (const [key, val] of Object.entries(extra)) {
    fields.push(`${key} = $${i}`);
    values.push(typeof val === "object" && val !== null ? JSON.stringify(val) : val);
    i++;
  }
  fields.push("claimed_at = NULL", "claimed_by = NULL");
  await client.query(`UPDATE sns.posts SET ${fields.join(", ")} WHERE id = $1;`, values);
}

async function processOne(client, post, { dryRun }) {
  const log = { id: post.id, target_sns: post.target_sns };

  // --- 安全ガード再確認(アプリ側でも二重にチェック。DBトリガーは書き込み時のみ発動するため) ---
  // GitHub Actionsのscheduleは秒単位で厳密ではなく、Cronは15分間隔で実行される。
  // そのため「scheduled_atを1秒でも過ぎたらexpired」にすると、Cronの実行タイミングのズレだけで
  // 正常な投稿まで全てexpiredになってしまう(実機テストで発覚)。
  // 「06:30以降の最初のCron実行で投稿する」という仕様を成立させるため、
  // Cron間隔(15分)+バッファを見込んだ猶予(EXPIRE_GRACE_MINUTES)を設け、
  // それを超えて大きく見逃された場合だけexpiredにする。
  const EXPIRE_GRACE_MINUTES = 30;
  if (post.scheduled_at) {
    const scheduledMs = new Date(post.scheduled_at).getTime();
    const nowMs = Date.now();
    if (nowMs - scheduledMs > EXPIRE_GRACE_MINUTES * 60 * 1000) {
      await setStatus(client, post.id, "expired", { guard_reason: `予約日時が過去(${EXPIRE_GRACE_MINUTES}分の猶予を超過)` });
      return { ...log, result: "stopped", reason: "予約日時が過去(猶予超過)", new_status: "expired" };
    }
  }
  if (!post.is_publishable) {
    await setStatus(client, post.id, "needs_review", { guard_reason: "公開可否false" });
    return { ...log, result: "stopped", reason: "公開可否false", new_status: "needs_review" };
  }
  if (!post.feature_published) {
    await setStatus(client, post.id, "needs_review", { guard_reason: "未公開機能" });
    return { ...log, result: "stopped", reason: "未公開機能", new_status: "needs_review" };
  }
  if (!AUTOMATED_SNS.includes(post.target_sns)) {
    await setStatus(client, post.id, "needs_review", { guard_reason: "対象SNSが未対応" });
    return { ...log, result: "stopped", reason: "対象SNSが未対応", new_status: "needs_review" };
  }
  if (!post.media_urls || post.media_urls.length === 0) {
    await setStatus(client, post.id, "needs_review", { guard_reason: "素材不足" });
    return { ...log, result: "stopped", reason: "素材不足", new_status: "needs_review" };
  }
  if (post.duplicate_check && ["duplicate", "possible_duplicate"].includes(post.duplicate_check.result)) {
    await setStatus(client, post.id, "needs_review", { guard_reason: "重複疑い" });
    return { ...log, result: "stopped", reason: "重複疑い", new_status: "needs_review" };
  }

  // --- 素材URLの到達確認 ---
  for (const url of post.media_urls) {
    const ok = await headCheck(url);
    if (!ok) {
      await setStatus(client, post.id, "needs_review", { guard_reason: "素材不足", error_detail: `素材URLに到達できません: ${url}` });
      return { ...log, result: "stopped", reason: `素材URL到達不可: ${url}`, new_status: "needs_review" };
    }
  }

  // --- Buffer側での重複チェック(生きた確認) ---
  let dup;
  try {
    // target_sns → BufferチャンネルIDのマッピングは現状Instagramのみ実装済み(TikTok/YouTubeは今後追加)
    const channelMap = { instagram: "6a9ce332cd8b9c702c154469", tiktok: "6a9ce544cd8b9c702c154892", youtube: "6a9ce3facd8b9c702c154605" };
    const channelId = channelMap[post.target_sns];
    dup = await findDuplicatePost(channelId, post.body_text);
  } catch (e) {
    await setStatus(client, post.id, "failed", { error_detail: `Buffer APIエラー(重複チェック): ${e.message}` });
    return { ...log, result: "stopped", reason: `Buffer APIエラー: ${e.message}`, new_status: "failed" };
  }
  if (dup) {
    await setStatus(client, post.id, "needs_review", {
      guard_reason: "重複疑い",
      duplicate_check: { checked_at: new Date().toISOString(), result: "duplicate", matched_post_id: dup.id },
    });
    return { ...log, result: "stopped", reason: "Buffer側に既存の同一投稿あり", new_status: "needs_review" };
  }

  // --- 冪等性の最終確認:既にexternal_post_idが付いていないか ---
  if (post.external_post_id) {
    return { ...log, result: "skipped", reason: "既にexternal_post_id設定済み(二重投稿防止)" };
  }

  // --- ここまで全通過。dry-runならここで停止 ---
  if (dryRun) {
    await setStatus(client, post.id, post.status, {
      duplicate_check: { checked_at: new Date().toISOString(), result: "none" },
      post_result: { dry_run: true, ready_to_send: true, checked_at: new Date().toISOString() },
    });
    return { ...log, result: "dry_run_ok", reason: "全チェック通過(実登録はしていません)", new_status: post.status };
  }

  // --- 本番登録 ---
  // scheduled_atは既に過去(Cronがそれを検知して処理している)なので、
  // Buffer側の独自キュー(addToQueue)に入れるのではなく、shareNow(即時配信)を使う。
  // addToQueueのままだと、決めた投稿時刻が無視されBufferの空き枠に押し込まれてしまう。
  try {
    const channelMap = { instagram: "6a9ce332cd8b9c702c154469", tiktok: "6a9ce544cd8b9c702c154892", youtube: "6a9ce3facd8b9c702c154605" };
    const isVideo = post.media_urls.some((u) => /\.(mp4|mov|webm)(\?|$)/i.test(u));
    const assets = post.media_urls.map((url) => (isVideo ? { video: { url } } : { image: { url } }));

    let metadata;
    if (post.target_sns === "instagram") {
      metadata = { instagram: { type: isVideo ? "reel" : "post", shouldShareToFeed: true } };
    } else if (post.target_sns === "youtube") {
      if (!isVideo) {
        throw new Error("YouTubeは動画が必須ですが、media_urlsが動画形式ではありません");
      }
      metadata = {
        youtube: {
          title: (post.title || post.body_text || "").slice(0, 95) || "げんばアプリ工房",
          categoryId: "28", // Science & Technology(過去の投稿と同じ分類)
          privacy: "public",
          madeForKids: false,
        },
      };
    }

    const created = await createPost({
      channelId: channelMap[post.target_sns],
      text: post.body_text,
      assets,
      metadata,
      mode: "shareNow",
    });
    await setStatus(client, post.id, "sent", {
      external_service: "buffer",
      external_post_id: created.id,
      post_result: { status: created.status, registeredAt: new Date().toISOString() },
    });
    return { ...log, result: "sent", new_status: "sent", external_post_id: created.id };
  } catch (e) {
    await setStatus(client, post.id, "failed", { error_detail: `Buffer登録エラー: ${e.message}` });
    return { ...log, result: "stopped", reason: `Buffer登録エラー: ${e.message}`, new_status: "failed" };
  }
}

async function runCronEngine({ dryRun = true, limit = 10 } = {}) {
  const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const pool = getPool();
  const client = await pool.connect();
  const report = { runId, dryRun, processed: [], errors: [] };

  try {
    await client.query("BEGIN");
    const candidates = await claimCandidates(client, runId, limit);
    await client.query("COMMIT");

    for (const post of candidates) {
      try {
        const result = await processOne(client, post, { dryRun });
        report.processed.push(result);
      } catch (e) {
        report.errors.push({ id: post.id, error: e.message });
        await releaseClaim(client, post.id).catch(() => {});
      }
    }
  } catch (e) {
    report.errors.push({ error: `Supabase接続/処理エラー: ${e.message}` });
  } finally {
    client.release();
    await pool.end();
  }

  return report;
}

module.exports = { runCronEngine };

if (require.main === module) {
  const dryRun = !process.argv.includes("--live");
  runCronEngine({ dryRun })
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => {
      console.error("FATAL:", e.message);
      process.exit(1);
    });
}
